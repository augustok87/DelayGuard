import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { CarrierService } from '../../services/carrier-service';
import { DelayDetectionService, checkWarehouseDelay, checkTransitDelay } from '../../services/delay-detection-service';
import { query } from '../../database/connection';
import { addNotificationJob } from '../setup';
import { PriorityScoreService } from '../../services/priority-score-service';
import { resolveTrackingUrl } from '../../utils/tracking-url';

interface DelayCheckJobData {
  orderId: number;
  trackingNumber: string;
  carrierCode: string;
  shopDomain: string;
}

export async function processDelayCheck(job: Job<DelayCheckJobData>): Promise<void> {
  const { orderId, trackingNumber, carrierCode, shopDomain } = job.data;

  try {
    logger.info(`🔍 Processing 3-rule delay check for order ${orderId}`);

    // Get order details with all 3 threshold settings + Phase 2.1 fields
    const orderResult = await query(
      `SELECT o.*,
              s.warehouse_delay_days,
              s.carrier_delay_days,
              s.transit_delay_days,
              s.email_enabled,
              s.sms_enabled,
              s.merchant_email,
              s.merchant_phone,
              s.merchant_name,
              s.warehouse_delays_enabled,
              s.carrier_delays_enabled,
              s.transit_delays_enabled
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
      customer_phone: string;
      status: string;
      created_at: Date;
      tracking_status: string | null;
      last_tracking_update: Date | null;
      tracking_number: string;
      carrier_code: string;
      warehouse_delay_days: number;
      carrier_delay_days: number;
      transit_delay_days: number;
      email_enabled: boolean;
      sms_enabled: boolean;
      // Phase 2.1: Notification routing fields
      merchant_email: string | null;
      merchant_phone: string | null;
      merchant_name: string | null;
      warehouse_delays_enabled: boolean;
      carrier_delays_enabled: boolean;
      transit_delays_enabled: boolean;
    };

    let delayDetected = false;
    let triggeredDelayResult: { delayDays?: number; delayReason?: string; estimatedDelivery?: string; originalDelivery?: string } | null = null;
    let trackingInfo: Awaited<ReturnType<typeof CarrierService.prototype.getTrackingInfo>> | null = null;
    let delayType: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'TRANSIT_DELAY' | null = null;

    // RULE 1: Check for Warehouse Delays (unfulfilled orders) - only if enabled
    if (order.warehouse_delays_enabled) {
      logger.info(`🏭 Checking Rule 1: Warehouse Delays (threshold: ${order.warehouse_delay_days} days)`);
      const warehouseDelayResult = await checkWarehouseDelay(
        {
          id: parseInt(order.id),
          status: order.status,
          created_at: order.created_at,
        },
        order.warehouse_delay_days || 2,
      );

      if (warehouseDelayResult.isDelayed) {
        logger.info(`⚠️ RULE 1 TRIGGERED: Warehouse delay detected (${warehouseDelayResult.delayDays} days)`);
        await storeDelayAlert(parseInt(order.id), warehouseDelayResult);
        delayDetected = true;
        triggeredDelayResult = warehouseDelayResult;
        delayType = 'WAREHOUSE_DELAY';
      }
    } else {
      logger.info(`⏭️  RULE 1 SKIPPED: Warehouse delays disabled for this shop`);
    }

    // RULE 2 & 3: Check carrier delays only if order has been shipped
    if (trackingNumber && carrierCode) {
      // Initialize services
      const carrierService = new CarrierService();
      const delayDetectionService = new DelayDetectionService(order.carrier_delay_days || 1);

      // Get tracking information from carrier
      trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);

      // RULE 2: Check for Carrier Reported Delays - only if enabled
      if (order.carrier_delays_enabled) {
        logger.info(`🚚 Checking Rule 2: Carrier Reported Delays (threshold: ${order.carrier_delay_days} days)`);
        const carrierDelayResult = await delayDetectionService.checkForDelays(trackingInfo);

        if (carrierDelayResult.isDelayed) {
          logger.info(`⚠️ RULE 2 TRIGGERED: Carrier delay detected (${carrierDelayResult.delayReason})`);
          await storeDelayAlert(parseInt(order.id), carrierDelayResult);
          delayDetected = true;
          // Only override if warehouse delay wasn't already triggered
          if (!triggeredDelayResult) {
            triggeredDelayResult = carrierDelayResult;
            delayType = 'CARRIER_DELAY';
          }
        }
      } else {
        logger.info(`⏭️  RULE 2 SKIPPED: Carrier delays disabled for this shop`);
      }

      // RULE 3: Check for Stuck in Transit - only if enabled
      if (order.transit_delays_enabled) {
        logger.info(`📦 Checking Rule 3: Stuck in Transit (threshold: ${order.transit_delay_days} days)`);
        const transitDelayResult = await checkTransitDelay(
          {
            id: parseInt(order.id),
            tracking_status: order.tracking_status,
            last_tracking_update: order.last_tracking_update,
          },
          order.transit_delay_days || 7,
        );

        if (transitDelayResult.isDelayed) {
          logger.info(`⚠️ RULE 3 TRIGGERED: Stuck in transit delay detected (${transitDelayResult.delayDays} days)`);
          await storeDelayAlert(parseInt(order.id), transitDelayResult);
          delayDetected = true;
          // Only override if no other delay was triggered
          if (!triggeredDelayResult) {
            triggeredDelayResult = transitDelayResult;
            delayType = 'TRANSIT_DELAY';
          }
        }
      } else {
        logger.info(`⏭️  RULE 3 SKIPPED: Transit delays disabled for this shop`);
      }
    }

    // Send notification if ANY delay detected and notifications enabled
    if (delayDetected && triggeredDelayResult && delayType && (order.email_enabled || order.sms_enabled)) {
      // Real tracking URL (WS-E task E2): the fulfillment's stored
      // carrier-provided tracking_url wins; otherwise build a carrier-pattern
      // deep link from carrier_code + tracking number. Empty string when the
      // order is unfulfilled (warehouse delays have nothing to track yet).
      let storedTrackingUrl: string | null = null;
      if (trackingNumber) {
        const fulfillmentRows = await query<{ tracking_url: string | null }>(
          `SELECT tracking_url FROM fulfillments
           WHERE order_id = $1 AND tracking_number = $2
           ORDER BY updated_at DESC LIMIT 1`,
          [parseInt(order.id), trackingNumber],
        );
        storedTrackingUrl = fulfillmentRows[0]?.tracking_url ?? null;
      }
      const trackingUrl = resolveTrackingUrl(
        storedTrackingUrl,
        carrierCode || order.carrier_code,
        trackingNumber,
      );

      await addNotificationJob({
        orderId: parseInt(order.id),
        delayDetails: {
          estimatedDelivery: triggeredDelayResult.estimatedDelivery || '',
          trackingNumber: trackingNumber || '',
          trackingUrl: trackingUrl || '',
          delayDays: triggeredDelayResult.delayDays || 0,
          delayReason: triggeredDelayResult.delayReason || 'UNKNOWN',
        },
        delayType,
        // Phase 2.1: Route to merchant for warehouse delays, customer for carrier/transit delays
        merchantEmail: delayType === 'WAREHOUSE_DELAY' ? order.merchant_email : undefined,
        merchantPhone: delayType === 'WAREHOUSE_DELAY' ? order.merchant_phone : undefined,
        merchantName: delayType === 'WAREHOUSE_DELAY' ? order.merchant_name : undefined,
        customerEmail: delayType !== 'WAREHOUSE_DELAY' ? order.customer_email : undefined,
        customerPhone: delayType !== 'WAREHOUSE_DELAY' ? order.customer_phone : undefined,
        shopDomain,
      });
    }

    if (!delayDetected) {
      logger.info(`✅ No delays detected for order ${orderId} (all 3 rules checked)`);
    }

    // Update order status
    await query(
      `UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId],
    );

  } catch (error) {
    logger.error('Error processing delay check', error as Error);
    throw error;
  }
}

/**
 * Store delay alert in database
 *
 * Phase 2.1.b: also computes + persists the priority score for the new
 * alert via PriorityScoreService.scoreAlert. Scoring is best-effort —
 * failures are logged and swallowed so the alert still exists and the
 * downstream notification still fires. If scoring failures propagated to
 * BullMQ, the retry would re-INSERT a duplicate alert (delay_alerts has
 * no unique constraint that ON CONFLICT could match — known limitation
 * outside this slice's scope). Phase 2.2.c will introduce a re-score job
 * triggered at the end of customer-sync.ts to heal unscored alerts.
 */
async function storeDelayAlert(orderId: number, delayResult: { delayDays?: number; delayReason?: string; originalDelivery?: string; estimatedDelivery?: string }): Promise<void> {
  const rows = await query<{ id: number }>(
    `INSERT INTO delay_alerts (
      order_id,
      delay_days,
      delay_reason,
      original_delivery_date,
      estimated_delivery_date
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
    RETURNING id`,
    [
      orderId,
      delayResult.delayDays || 0,
      delayResult.delayReason || 'UNKNOWN',
      delayResult.originalDelivery,
      delayResult.estimatedDelivery,
    ],
  );

  const newAlertId = rows[0]?.id;
  if (newAlertId === undefined) return;

  try {
    const priorityScoreService = new PriorityScoreService();
    await priorityScoreService.scoreAlert(newAlertId);
  } catch (scoringError) {
    logger.warn(
      'Priority scoring failed (alert remains unscored, Phase 2.2.c re-score will heal)',
      {
        alertId: newAlertId,
        error: scoringError instanceof Error ? scoringError.message : String(scoringError),
      },
    );
  }
}
