import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { CarrierService } from '../../services/carrier-service';
import { DelayDetectionService, checkWarehouseDelay, checkTransitDelay } from '../../services/delay-detection-service';
import { query } from '../../database/connection';
import { addNotificationJob } from '../setup';

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

    // Get order details with all 3 threshold settings
    const orderResult = await query(
      `SELECT o.*,
              s.warehouse_delay_days,
              s.carrier_delay_days,
              s.transit_delay_days,
              s.email_enabled,
              s.sms_enabled
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
    };

    let delayDetected = false;
    let triggeredDelayResult: { delayDays?: number; delayReason?: string; estimatedDelivery?: string; originalDelivery?: string } | null = null;
    let trackingInfo: { trackingUrl?: string } | null = null;

    // RULE 1: Check for Warehouse Delays (unfulfilled orders)
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
    }

    // RULE 2 & 3: Check carrier delays only if order has been shipped
    if (trackingNumber && carrierCode) {
      // Initialize services
      const carrierService = new CarrierService();
      const delayDetectionService = new DelayDetectionService(order.carrier_delay_days || 1);

      // Get tracking information from carrier
      trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);

      // RULE 2: Check for Carrier Reported Delays
      logger.info(`🚚 Checking Rule 2: Carrier Reported Delays (threshold: ${order.carrier_delay_days} days)`);
      const carrierDelayResult = await delayDetectionService.checkForDelays(trackingInfo);

      if (carrierDelayResult.isDelayed) {
        logger.info(`⚠️ RULE 2 TRIGGERED: Carrier delay detected (${carrierDelayResult.delayReason})`);
        await storeDelayAlert(parseInt(order.id), carrierDelayResult);
        delayDetected = true;
        // Only override if warehouse delay wasn't already triggered
        if (!triggeredDelayResult) {
          triggeredDelayResult = carrierDelayResult;
        }
      }

      // RULE 3: Check for Stuck in Transit
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
        }
      }
    }

    // Send notification if ANY delay detected and notifications enabled
    if (delayDetected && triggeredDelayResult && (order.email_enabled || order.sms_enabled)) {
      await addNotificationJob({
        orderId: parseInt(order.id),
        delayDetails: {
          estimatedDelivery: triggeredDelayResult.estimatedDelivery || '',
          trackingNumber: trackingNumber || '',
          trackingUrl: trackingInfo?.trackingUrl || `https://tracking.example.com/${trackingNumber || 'unknown'}`,
          delayDays: triggeredDelayResult.delayDays || 0,
          delayReason: triggeredDelayResult.delayReason || 'UNKNOWN',
        },
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
 * Helper function to avoid code duplication
 */
async function storeDelayAlert(orderId: number, delayResult: { delayDays?: number; delayReason?: string; originalDelivery?: string; estimatedDelivery?: string }): Promise<void> {
  await query(
    `INSERT INTO delay_alerts (
      order_id,
      delay_days,
      delay_reason,
      original_delivery_date,
      estimated_delivery_date
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING`,
    [
      orderId,
      delayResult.delayDays || 0,
      delayResult.delayReason || 'UNKNOWN',
      delayResult.originalDelivery,
      delayResult.estimatedDelivery,
    ],
  );
}
