import { Job } from 'bullmq';
import { logger } from '../utils/logger';
import { CarrierService } from '../../services/carrier-service';
import { DelayDetectionService } from '../../services/delay-detection-service';
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
    logger.info(`🔍 Processing delay check for order ${orderId}, tracking: ${trackingNumber}`);

    // Get order details
    const orderResult = await query(
      `SELECT o.*, s.delay_threshold_days, s.email_enabled, s.sms_enabled 
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
      delay_threshold_days: number;
      email_enabled: boolean;
      sms_enabled: boolean;
    };

    // Initialize services
    const carrierService = new CarrierService();
    const delayDetectionService = new DelayDetectionService();

    // Get tracking information from carrier
    const trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);
    
    // Check for delays
    const delayResult = await delayDetectionService.checkForDelays(trackingInfo);

    if (delayResult.isDelayed) {
      logger.info(`⚠️ Delay detected for order ${orderId}: ${delayResult.delayReason}`);

      // Check if delay meets threshold
      const delayDays = delayResult.delayDays || 0;
      if (delayDays >= order.delay_threshold_days) {
        // Store delay alert in database
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
            delayDays,
            delayResult.delayReason,
            delayResult.originalDelivery,
            delayResult.estimatedDelivery,
          ],
        );

        // Add notification job if notifications are enabled
        if (order.email_enabled || order.sms_enabled) {
          await addNotificationJob({
            orderId,
            delayDetails: {
              estimatedDelivery: delayResult.estimatedDelivery,
              trackingNumber,
              trackingUrl: trackingInfo.trackingUrl || `https://tracking.example.com/${trackingNumber}`,
              delayDays,
              delayReason: delayResult.delayReason,
            },
            shopDomain,
          });
        }
      }
    } else {
      logger.info(`✅ No delay detected for order ${orderId}`);
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
