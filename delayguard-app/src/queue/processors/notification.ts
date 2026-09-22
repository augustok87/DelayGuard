import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { EmailService } from '../../services/email-service';
import { SMSService } from '../../services/sms-service';
import { billingService } from '../../services/billing-service';
import { query } from '../../database/connection';
// import { AppConfig } from '../../types'; // Available for future use

interface NotificationJobData {
  /**
   * The delay_alerts row this job completes (LAUNCH_PLAN §6 R17).
   *
   * A single order accumulates one alert per detected delay, and each alert
   * owes its own notification. Completion must therefore be scoped to the
   * alert, never to the order: `WHERE order_id = $1` marked all four alerts on
   * production order 1 as delivered from one send, suppressing every later
   * delay on that order while recording success.
   *
   * Optional only for jobs enqueued before this field existed; those resolve
   * to the newest pending alert on the order at :90 and are then treated
   * identically. Every write below is keyed on a single alert id.
   */
  alertId?: number;
  orderId: number;
  delayDetails: {
    estimatedDelivery: string;
    trackingNumber: string;
    trackingUrl: string;
    delayDays: number;
    delayReason: string;
  };
  shopDomain: string;
  /**
   * Launch WS-E (task E3) — merchant-vs-customer routing.
   * delayType decides the recipient: WAREHOUSE_DELAY alerts go to the
   * merchant (their warehouse is the problem); CARRIER_DELAY / TRANSIT_DELAY
   * go to the customer. Legacy payloads without delayType (jobs enqueued
   * before this field existed) route to the customer — the historical
   * behavior — via an explicit branch below, never by accident.
   */
  delayType?: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'TRANSIT_DELAY';
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantName?: string | null;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Claim one channel of one alert, then send — in that order.
 *
 * The sent-flag used to be written *after* the provider returned, which made
 * it a record of what finished rather than a lock on what started: two
 * dispatches overlapping anywhere inside the provider call both read FALSE and
 * both sent. `/api/cron/notification-dispatch` has no lease, so the GitHub
 * Actions schedule, its `--retry`, a `workflow_dispatch` run and a manual curl
 * are four independent ways to have two sweeps in flight at once.
 *
 * `UPDATE … WHERE <flag> = FALSE RETURNING id` is the whole guard: under READ
 * COMMITTED the second writer blocks on the row lock, re-evaluates the
 * predicate against the committed TRUE, and returns no rows — so exactly one
 * caller is ever handed the send. A failed send releases the claim so the
 * BullMQ retry (or the next sweep) can try again.
 *
 * `notification_sent_at` is stamped only after a send succeeds, so the
 * dashboard's delivery badge never shows a time for a dispatch that failed.
 */
async function dispatchOnce(
  channel: 'email' | 'sms',
  alertId: number,
  orderId: number,
  send: () => Promise<void>,
): Promise<void> {
  const flag = channel === 'email' ? 'email_sent' : 'sms_sent';

  const claimed = await query<{ id: number }>(
    `UPDATE delay_alerts
     SET ${flag} = TRUE
     WHERE id = $1 AND ${flag} = FALSE
     RETURNING id`,
    [alertId],
  );

  if (claimed.length === 0) {
    logger.info(
      `↩️ ${channel} for alert ${alertId} (order ${orderId}) already claimed by another dispatch — skipping`,
    );
    return;
  }

  try {
    await send();
  } catch (error) {
    await query(`UPDATE delay_alerts SET ${flag} = FALSE WHERE id = $1`, [
      alertId,
    ]);
    logger.error(`Error sending ${channel} notification`, error as Error);
    throw error;
  }

  await query(
    `UPDATE delay_alerts
     SET notification_sent_at = COALESCE(notification_sent_at, CURRENT_TIMESTAMP)
     WHERE id = $1`,
    [alertId],
  );
  logger.info(
    `✅ ${channel === 'email' ? 'Email' : 'SMS'} sent for alert ${alertId} (order ${orderId})`,
  );
}

export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, delayDetails } = job.data;

  try {
    logger.info(`📧 Processing notification for order ${orderId}`);

    // Get order and shop details (incl. merchant contact for E3 routing).
    // Schema truth: email_enabled / sms_enabled / notification_template live
    // on app_settings (see runMigrations); shops carries shop_domain plus the
    // merchant contact columns.
    //
    // §6 R19: shop_domain must be selected explicitly. `orders` has no such
    // column, so `o.*` does not supply it — leaving it out made
    // `order.shop_domain` undefined, which resolved the SMS plan gate for a
    // shop that does not exist. getCurrentPlan fails closed, so SMS was
    // suppressed on every plan rather than leaked.
    const orderResult = await query(
      `SELECT o.*, st.email_enabled, st.sms_enabled, st.notification_template,
              s.shop_domain,
              s.merchant_email, s.merchant_phone, s.merchant_name
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       JOIN app_settings st ON st.shop_id = o.shop_id
       WHERE o.id = $1`,
      [orderId],
    );

    if (orderResult.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderResult[0] as {
      id: string;
      order_number: string;
      customer_name: string;
      customer_email: string;
      tracking_number: string;
      carrier_code: string;
      shopify_order_id: string;
      customer_phone?: string;
      shop_domain: string;
      created_at: string;
      email_enabled: boolean;
      sms_enabled: boolean;
      merchant_email: string | null;
      merchant_phone: string | null;
      merchant_name: string | null;
    };

    // Resolve WHICH alert this job completes, then read that alert's own
    // sent-flags (§6 R17). Reading "the newest alert on the order" concluded
    // there was nothing to do whenever any later alert had already been sent,
    // silently dropping notifications that were never attempted.
    const alertResult = await query(
      job.data.alertId !== undefined
        ? `SELECT id, email_sent, sms_sent FROM delay_alerts WHERE id = $1`
        : `SELECT id, email_sent, sms_sent FROM delay_alerts
           WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [job.data.alertId ?? orderId],
    );

    if (alertResult.length === 0) {
      throw new Error(
        job.data.alertId !== undefined
          ? `Delay alert ${job.data.alertId} not found`
          : `No delay alert found for order ${orderId}`,
      );
    }

    const alert = alertResult[0] as {
      id: number;
      email_sent: boolean;
      sms_sent: boolean;
    };
    // From here on every completion write is keyed on this one row.
    const alertId = alert.id;

    // Initialize services
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (!sendgridKey) throw new Error('SENDGRID_API_KEY is required');
    if (!twilioSid) throw new Error('TWILIO_ACCOUNT_SID is required');
    if (!twilioToken) throw new Error('TWILIO_AUTH_TOKEN is required');
    if (!twilioPhone) throw new Error('TWILIO_PHONE_NUMBER is required');

    const emailService = new EmailService(sendgridKey);
    const smsService = new SMSService(twilioSid, twilioToken, twilioPhone);

    // Prepare order info
    const orderInfo = {
      id: order.shopify_order_id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shopDomain: order.shop_domain,
      createdAt: new Date(order.created_at),
    };

    // Launch WS-E (task E3): merchant-vs-customer routing.
    // WAREHOUSE_DELAY → merchant (payload contact first, shops-row columns as
    // fallback for retried/legacy jobs). CARRIER_DELAY / TRANSIT_DELAY (and
    // legacy payloads without delayType) → customer. A warehouse alert with
    // no merchant contact configured is SKIPPED with a warning — it must
    // never silently fall back to customer_email.
    const recipientType: 'merchant' | 'customer' =
      job.data.delayType === 'WAREHOUSE_DELAY' ? 'merchant' : 'customer';
    if (!job.data.delayType) {
      logger.info(
        `ℹ️ No delayType on notification payload for order ${orderId} — routing to customer (legacy payload)`,
      );
    }

    const recipientEmail =
      recipientType === 'merchant'
        ? job.data.merchantEmail || order.merchant_email || null
        : job.data.customerEmail || order.customer_email || null;
    const recipientPhone =
      recipientType === 'merchant'
        ? job.data.merchantPhone || order.merchant_phone || null
        : job.data.customerPhone || order.customer_phone || null;
    const recipientName =
      recipientType === 'merchant'
        ? job.data.merchantName || order.merchant_name || 'Merchant'
        : order.customer_name;

    if (recipientType === 'merchant' && !recipientEmail && !recipientPhone) {
      logger.warn(
        `⚠️ Warehouse delay for order ${orderId}: no merchant contact configured — ` +
          'skipping dispatch (will NOT fall back to the customer)',
      );
    }

    // Send notifications based on settings and what hasn't been sent.
    //
    // v1.19 notification-routing rule: dispatch lives INSIDE each rule-matched
    // branch. We deliberately call EmailService / SMSService directly rather
    // than NotificationService.sendDelayNotification — the orchestrator routes
    // to BOTH channels whenever both recipient fields are populated, which
    // would bypass the per-channel email_enabled / sms_enabled toggles and
    // double-dispatch when both flags are true (Wave 4.1, 2026-05-14).
    const promises: Promise<void>[] = [];

    if (order.email_enabled && recipientEmail && !alert.email_sent) {
      promises.push(
        dispatchOnce('email', alertId, orderId, () =>
          emailService.sendDelayEmail(recipientEmail, orderInfo, delayDetails, {
            recipientName,
          }),
        ),
      );
    }

    // SMS is a paid feature (Pro+). Gate dispatch on the shop's live plan tier
    // — sms_enabled alone is not enough: a row left true from a prior paid
    // period (or seeded data) would otherwise SMS on the free tier (billing
    // leak). getCurrentPlan fails closed to "free", so a Shopify outage blocks
    // SMS rather than leaking it. Only resolve the plan when SMS would actually
    // fire, to avoid a GraphQL call on every email-only notification.
    const smsWanted = order.sms_enabled && !!recipientPhone && !alert.sms_sent;
    let smsAllowed = false;
    if (smsWanted) {
      const plan = await billingService.getCurrentPlan(order.shop_domain);
      smsAllowed = billingService.isSmsAllowed(plan);
      if (!smsAllowed) {
        logger.warn(
          `⚠️ SMS suppressed for order ${orderId}: shop plan "${plan}" does not include SMS (Pro+ required)`,
        );
      }
    }

    if (smsWanted && smsAllowed) {
      promises.push(
        dispatchOnce('sms', alertId, orderId, () =>
          smsService.sendDelaySMS(recipientPhone, orderInfo, delayDetails, {
            audience: recipientType,
          }),
        ),
      );
    }

    if (promises.length === 0) {
      logger.info(`ℹ️ No notifications to send for order ${orderId}`);
      return;
    }

    // Wait for all notifications to complete
    await Promise.all(promises);

    logger.info(`✅ All notifications processed for order ${orderId}`);

  } catch (error) {
    logger.error('Error processing notification', error as Error);
    throw error;
  }
}
