/**
 * Tracking ingest service
 *
 * Owns the three-step composition that previously lived inside
 * routes/webhooks.ts processFulfillment:
 *   1. ShipEngine getTrackingInfo() HTTP call (via CarrierService)
 *   2. tracking_events UPSERT per event
 *   3. orders ETA + tracking_status + last_tracking_update UPDATE
 *
 * Behavior contract preserved verbatim from the pre-refactor route:
 *   - ShipEngine failures are LOGGED AND SWALLOWED. The caller (route)
 *     still 200s and still enqueues addDelayCheckJob — the delay-check
 *     worker re-fetches tracking later. Tracking data is nice-to-have;
 *     the canonical webhook ack must succeed so Shopify doesn't retry.
 *   - DB failures on the persistence side DO propagate. The route turns
 *     those into 500s, which Shopify retries with exponential backoff —
 *     the right behavior for a transient outage.
 *
 * v1.19 column: last_tracking_update derives from the MOST RECENT event
 * timestamp (events sorted descending). When events is empty the column
 * is null. The sibling test exercises both branches.
 */
import { CarrierService } from "./carrier-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";
import type { TrackingInfo, CarrierTrackingEvent } from "../types";

function pickMostRecentEventTimestamp(
  events: CarrierTrackingEvent[] | undefined,
): string | null {
  if (!events || events.length === 0) return null;
  // Sort descending by timestamp; events from ShipEngine are not guaranteed sorted.
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return sorted[0].timestamp;
}

export class TrackingIngestService {
  private readonly carrierService: CarrierService;

  constructor(carrierService?: CarrierService) {
    this.carrierService = carrierService ?? new CarrierService();
  }

  async ingestTracking(
    orderId: number,
    trackingNumber: string,
    carrierCode: string,
  ): Promise<void> {
    let trackingInfo: TrackingInfo;
    try {
      trackingInfo = await this.carrierService.getTrackingInfo(
        trackingNumber,
        carrierCode,
      );
    } catch (error) {
      // Behavior preserved from pre-refactor route: ShipEngine failure is
      // non-fatal. Log and return so the webhook still 200s.
      logger.error(
        "Failed to fetch tracking info from ShipEngine",
        error instanceof Error ? error : new Error(String(error)),
        { orderId, trackingNumber, carrierCode },
      );
      return;
    }

    // Persistence path — DB failures DO propagate. Log at the service
    // boundary (same pattern as MerchantApiService / OrderUpsertService);
    // the route's outer try/catch maps the thrown error to a 500, which
    // Shopify retries with exponential backoff.
    try {
      if (trackingInfo.events && trackingInfo.events.length > 0) {
        for (const event of trackingInfo.events) {
          await query(
            `INSERT INTO tracking_events (
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
               updated_at = CURRENT_TIMESTAMP`,
            [
              orderId,
              event.timestamp,
              event.status,
              event.description,
              event.location ?? null,
              trackingInfo.carrierCode,
            ],
          );
        }
      }

      const lastTrackingUpdate = pickMostRecentEventTimestamp(
        trackingInfo.events,
      );

      await query(
        // original_eta is seeded from the first estimate we ever see and then
        // frozen — EasyPost reports only the current estimate, so writing $1
        // unconditionally would blank it on every refresh and leave
        // DATE_DELAY (current_eta > original_eta) permanently unable to fire.
        `UPDATE orders
         SET original_eta = COALESCE(original_eta, $1),
             current_eta = $2,
             tracking_status = $3,
             last_tracking_update = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          trackingInfo.originalEstimatedDeliveryDate ??
            trackingInfo.estimatedDeliveryDate ??
            null,
          trackingInfo.estimatedDeliveryDate ?? null,
          trackingInfo.status,
          lastTrackingUpdate,
          orderId,
        ],
      );
    } catch (error) {
      logger.error(
        "Failed to persist tracking ingest",
        error instanceof Error ? error : new Error(String(error)),
        { orderId, trackingNumber, carrierCode },
      );
      throw error;
    }
  }
}
