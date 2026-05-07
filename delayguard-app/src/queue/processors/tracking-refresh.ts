/**
 * Tracking Refresh Cron Job Processor
 *
 * Purpose: Refresh tracking data for a bounded batch of in-transit orders per tick.
 * - Pulls up to BATCH_SIZE orders, ordered by id, resuming from a Redis cursor.
 * - Calls ShipEngine + persists events/ETAs sequentially.
 * - Breaks early if wall-clock exceeds TIME_BUDGET_MS so the cron stays under
 *   the 30s Vercel function cap (see .claude/rules/deploy.md).
 * - Persists the last processed id back to Redis; resets to 0 when a tick
 *   returns fewer rows than BATCH_SIZE (the in-transit queue has drained).
 */

import { CarrierService } from '../../services/carrier-service';
import { query } from '../../database/connection';
import { getRedisConnection } from '../../services/redis-connection';
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

const BATCH_SIZE = 25;
// 5s headroom under the 30s Vercel function cap.
const TIME_BUDGET_MS = 25_000;
const CURSOR_KEY = 'tracking-refresh:cursor:last-id';

async function readCursor(): Promise<number> {
  try {
    const redis = await getRedisConnection();
    const raw = await redis.get(CURSOR_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    logger.error('Failed to read tracking-refresh cursor; starting from 0', error as Error);
    return 0;
  }
}

async function writeCursor(value: number): Promise<void> {
  try {
    const redis = await getRedisConnection();
    await redis.set(CURSOR_KEY, String(value));
  } catch (error) {
    logger.error('Failed to persist tracking-refresh cursor', error as Error);
  }
}

export async function processTrackingRefresh(): Promise<TrackingRefreshStats> {
  const startedAt = Date.now();
  const stats: TrackingRefreshStats = {
    ordersProcessed: 0,
    eventsStored: 0,
    errors: 0,
  };

  try {
    logger.info('🔄 Starting tracking refresh for in-transit orders');

    const cursor = await readCursor();

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
        AND o.id > $3
      ORDER BY o.id ASC
      LIMIT $4
    `,
      ['IN_TRANSIT', 'DELAYED', cursor, BATCH_SIZE],
    );

    logger.info(`📊 Found ${inTransitOrders.length} in-transit orders to refresh (cursor=${cursor})`);

    if (inTransitOrders.length === 0) {
      // Drained from this cursor position; reset so the next tick re-scans from id=0.
      if (cursor > 0) {
        await writeCursor(0);
      }
      return stats;
    }

    const carrierService = new CarrierService();
    let lastProcessedId = cursor;

    for (const order of inTransitOrders) {
      // Time-budget guard: stop before another ShipEngine call if we've blown the budget.
      // Cursor is still advanced for whatever we've processed, so the next tick resumes here.
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        logger.warn('⏱️  Tracking refresh time budget exhausted; stopping mid-batch', {
          processed: stats.ordersProcessed,
          remaining: inTransitOrders.length - stats.ordersProcessed,
        });
        break;
      }

      try {
        if (!order.tracking_number || !order.carrier_code) {
          lastProcessedId = order.id;
          continue;
        }

        stats.ordersProcessed++;

        const trackingInfo = await carrierService.getTrackingInfo(
          order.tracking_number,
          order.carrier_code,
        );

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

        lastProcessedId = order.id;

        logger.info(
          `✅ Refreshed tracking for order ${order.id}: ${trackingInfo.events?.length || 0} events`,
        );
      } catch (error) {
        // Advance the cursor on failure too; otherwise a permanently-failing order
        // would block every subsequent tick. Reset-on-drain gives it a retry next sweep.
        stats.errors++;
        lastProcessedId = order.id;

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

    // Persist cursor: reset to 0 if this tick drained the queue, otherwise advance.
    if (inTransitOrders.length < BATCH_SIZE) {
      await writeCursor(0);
    } else {
      await writeCursor(lastProcessedId);
    }

    logger.info('✅ Tracking refresh completed', {
      ordersProcessed: stats.ordersProcessed,
      eventsStored: stats.eventsStored,
      errors: stats.errors,
      lastProcessedId,
      durationMs: Date.now() - startedAt,
    });

    return stats;
  } catch (error) {
    logger.error('Error in processTrackingRefresh', error as Error);
    throw error;
  }
}
