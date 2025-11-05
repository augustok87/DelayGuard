/**
 * Tracking Refresh Cron Job Processor
 *
 * Purpose: Runs hourly to refresh tracking data for all in-transit orders
 * - Fetches latest tracking events and ETAs from ShipEngine
 * - Updates database with new tracking events and ETAs
 * - Handles errors gracefully without blocking other orders
 * - Returns statistics for monitoring
 */

import { CarrierService } from '../../services/carrier-service';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

interface TrackingRefreshStats {
  ordersProcessed: number;
  eventsStored: number;
  errors: number;
}

interface InTransitOrder {
  id: number;
  tracking_number: string | null;
  carrier_code: string | null;
  shop_domain: string;
}

export async function processTrackingRefresh(): Promise<TrackingRefreshStats> {
  const stats: TrackingRefreshStats = {
    ordersProcessed: 0,
    eventsStored: 0,
    errors: 0,
  };

  try {
    logger.info('🔄 Starting tracking refresh for in-transit orders');

    // Fetch all in-transit orders with tracking numbers
    const inTransitOrders = await query<InTransitOrder>(
      `
      SELECT
        o.id,
        f.tracking_number,
        f.carrier_code,
        s.shop_domain
      FROM orders o
      JOIN fulfillments f ON f.order_id = o.id
      JOIN shops s ON s.id = o.shop_id
      WHERE o.tracking_status IN ($1, $2)
        AND f.tracking_number IS NOT NULL
        AND f.carrier_code IS NOT NULL
    `,
      ['IN_TRANSIT', 'DELAYED'],
    );

    logger.info(`📊 Found ${inTransitOrders.length} in-transit orders to refresh`);

    if (inTransitOrders.length === 0) {
      return stats;
    }

    // Initialize carrier service
    const carrierService = new CarrierService();

    // Process each order
    for (const order of inTransitOrders) {
      try {
        // Skip orders with null tracking info (extra safety check)
        if (!order.tracking_number || !order.carrier_code) {
          continue;
        }

        stats.ordersProcessed++;

        // Fetch tracking info from ShipEngine
        const trackingInfo = await carrierService.getTrackingInfo(
          order.tracking_number,
          order.carrier_code,
        );

        // Store tracking events
        if (trackingInfo.events && trackingInfo.events.length > 0) {
          for (const event of trackingInfo.events) {
            await query(
              `
              INSERT INTO tracking_events (
                order_id,
                timestamp,
                status,
                description,
                location,
                carrier_status
              ) VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (order_id, timestamp)
              DO UPDATE SET
                status = EXCLUDED.status,
                description = EXCLUDED.description,
                location = EXCLUDED.location,
                carrier_status = EXCLUDED.carrier_status,
                updated_at = CURRENT_TIMESTAMP
            `,
              [
                order.id,
                event.timestamp,
                event.status,
                event.description,
                event.location || null,
                trackingInfo.carrierCode,
              ],
            );

            stats.eventsStored++;
          }
        }

        // Update ETAs and tracking status
        await query(
          `
          UPDATE orders
          SET
            original_eta = $1,
            current_eta = $2,
            tracking_status = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
          [
            trackingInfo.originalEstimatedDeliveryDate || null,
            trackingInfo.estimatedDeliveryDate || null,
            trackingInfo.status,
            order.id,
          ],
        );

        logger.info(
          `✅ Refreshed tracking for order ${order.id}: ${trackingInfo.events?.length || 0} events`,
        );
      } catch (error) {
        // Log error but continue processing other orders
        stats.errors++;

        const errorObj = error as Error & { statusCode?: number };
        logger.error(
          `Failed to refresh tracking for order ${order.id}`,
          errorObj,
          {
            orderId: order.id,
            trackingNumber: order.tracking_number,
            carrierCode: order.carrier_code,
            statusCode: errorObj.statusCode,
          },
        );
      }
    }

    logger.info('✅ Tracking refresh completed', {
      ordersProcessed: stats.ordersProcessed,
      eventsStored: stats.eventsStored,
      errors: stats.errors,
    });

    return stats;
  } catch (error) {
    logger.error('Error in processTrackingRefresh', error as Error);
    throw error;
  }
}
