import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { EmailService } from '../../services/email-service';
import { SMSService } from '../../services/sms-service';
import { query } from '../../database/connection';
// import { AppConfig } from '../../types'; // Available for future use

interface NotificationJobData {
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

export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, delayDetails } = job.data;

  try {
    logger.info(`📧 Processing notification for order ${orderId}`);

    // Get order and shop details (incl. merchant contact for E3 routing)
    const orderResult = await query(
      `SELECT o.*, s.email_enabled, s.sms_enabled, s.notification_template,
              s.merchant_email, s.merchant_phone, s.merchant_name
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
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

    // Check if notifications are already sent
    const alertResult = await query(
      `SELECT email_sent, sms_sent FROM delay_alerts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    );

    if (alertResult.length === 0) {
      throw new Error(`No delay alert found for order ${orderId}`);
    }

    const alert = alertResult[0] as { email_sent: boolean; sms_sent: boolean };

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
        emailService
          .sendDelayEmail(recipientEmail, orderInfo, delayDetails, {
            recipientName,
          })
          .then(async() => {
            // Mark email as sent
            await query(
              `UPDATE delay_alerts SET email_sent = TRUE WHERE order_id = $1`,
              [orderId],
            );
            logger.info(`✅ Email sent for order ${orderId}`);
          })
          .catch(error => {
            logger.error('Error sending email notification', error as Error);
            throw error;
          }),
      );
    }

    if (order.sms_enabled && recipientPhone && !alert.sms_sent) {
      promises.push(
        smsService
          .sendDelaySMS(recipientPhone, orderInfo, delayDetails, {
            audience: recipientType,
          })
          .then(async() => {
            // Mark SMS as sent
            await query(
              `UPDATE delay_alerts SET sms_sent = TRUE WHERE order_id = $1`,
              [orderId],
            );
            logger.info(`✅ SMS sent for order ${orderId}`);
          })
          .catch(error => {
            logger.error('Error sending SMS notification', error as Error);
            throw error;
          }),
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
