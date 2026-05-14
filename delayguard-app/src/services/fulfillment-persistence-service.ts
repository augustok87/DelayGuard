/**
 * Fulfillment persistence service
 *
 * Owns the fulfillments-table UPSERT that previously lived inline in
 * routes/webhooks.ts (processFulfillment). Pure persistence — no
 * ShipEngine HTTP, no tracking_events, no orders ETA update (that lives
 * in TrackingIngestService).
 *
 * The internal `orderId` is supplied by the caller (resolved via
 * OrderUpsertService.upsertOrderFromWebhook or .findOrderId) and is the
 * multi-tenant guard — the Shopify-supplied order_id is never trusted
 * directly.
 */
import { query } from "../database/connection";
import { logger } from "../utils/logger";

interface ShopifyTrackingInfo {
  number?: string;
  company?: string;
  url?: string;
}

export interface FulfillmentWebhookPayload {
  id: number;
  order_id: number;
  tracking_info?: ShopifyTrackingInfo;
  status?: string;
  shipment_status?: string;
}

export class FulfillmentPersistenceService {
  async upsertFulfillment(
    orderId: number,
    fulfillmentData: FulfillmentWebhookPayload,
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO fulfillments (
           order_id,
           shopify_fulfillment_id,
           tracking_number,
           carrier_code,
           tracking_url,
           status
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (order_id, shopify_fulfillment_id)
         DO UPDATE SET
           tracking_number = EXCLUDED.tracking_number,
           carrier_code = EXCLUDED.carrier_code,
           tracking_url = EXCLUDED.tracking_url,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [
          orderId,
          fulfillmentData.id.toString(),
          fulfillmentData.tracking_info?.number,
          fulfillmentData.tracking_info?.company,
          fulfillmentData.tracking_info?.url,
          fulfillmentData.status || "pending",
        ],
      );
    } catch (error) {
      logger.error(
        "Failed to upsert fulfillment",
        error instanceof Error ? error : new Error(String(error)),
        { orderId, shopifyFulfillmentId: fulfillmentData.id },
      );
      throw error;
    }
  }
}
