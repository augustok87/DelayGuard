/**
 * Shopify webhook routes
 *
 * Per .claude/rules/backend.md, the route owns:
 *   1. HMAC verification (signature check NEVER short-circuits)
 *   2. Payload parsing
 *   3. Dispatch to services for persistence
 *   4. Side-effect dispatch: addDelayCheckJob (BullMQ producer)
 *   5. Response status + body
 *
 * All DB queries moved into services (Wave 2.2 — see rules-audit-plan).
 *
 * Silent-skip semantics: a missing shop or missing order is a 200, not
 * a 4xx, because Shopify retries on non-2xx and would create a retry
 * storm against shops that have uninstalled. Services return null/false
 * to signal silent-skip; the route still ACKs the webhook.
 */
import Router from "koa-router";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { addDelayCheckJob, addCustomerSyncJob } from "../queue/setup";
import { saveOrderLineItems } from "../services/shopify-service";
import { handleSendGridWebhook } from "./sendgrid-webhook";
import {
  OrderUpsertService,
  type OrderWebhookPayload,
} from "../services/order-upsert-service";
import {
  FulfillmentPersistenceService,
  type FulfillmentWebhookPayload,
} from "../services/fulfillment-persistence-service";
import { TrackingIngestService } from "../services/tracking-ingest-service";

const router = new Router();

const orderUpsertService = new OrderUpsertService();
const fulfillmentService = new FulfillmentPersistenceService();
// TrackingIngestService is lazy — CarrierService constructor throws if
// SHIPENGINE_API_KEY is unset, and we want the route module to load even
// in environments without ShipEngine (tests, local dev).
let _trackingIngestService: TrackingIngestService | null = null;
function getTrackingIngestService(): TrackingIngestService {
  if (!_trackingIngestService) {
    _trackingIngestService = new TrackingIngestService();
  }
  return _trackingIngestService;
}

// Inbound Shopify webhook payload — narrow shape for the route handlers.
interface ShopifyOrderWithFulfillments extends OrderWebhookPayload {
  fulfillments?: FulfillmentWebhookPayload[];
}

function verifyWebhook(data: string, hmac: string): boolean {
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    throw new Error("SHOPIFY_API_SECRET environment variable is required");
  }
  const hash = crypto
    .createHmac("sha256", apiSecret)
    .update(data, "utf8")
    .digest("base64");

  return hash === hmac;
}

async function processFulfillmentSide(
  orderId: number,
  shopDomain: string,
  fulfillment: FulfillmentWebhookPayload,
): Promise<void> {
  await fulfillmentService.upsertFulfillment(orderId, fulfillment);

  const trackingNumber = fulfillment.tracking_info?.number;
  const carrierCode = fulfillment.tracking_info?.company;
  if (!trackingNumber || !carrierCode) return;

  // ShipEngine + tracking_events + orders-ETA persistence.
  // Service swallows ShipEngine failures (logs and returns); DB failures
  // here DO propagate to our caller (and become a 500).
  await getTrackingIngestService().ingestTracking(
    orderId,
    trackingNumber,
    carrierCode,
  );

  // Enqueue delay-check job — uses shopDomain from the verified webhook
  // header. The pre-refactor JOIN that re-derived shop_domain from the
  // orders row is no longer needed: the value is identical (we just
  // upserted the order under this exact shop_id) but the JOIN required
  // an extra DB call. Wave 2.2 drops it for one fewer round-trip.
  await addDelayCheckJob({
    orderId,
    trackingNumber,
    carrierCode,
    shopDomain,
  });

  logger.info("Delay check job enqueued", {
    trackingNumber,
    orderId,
  });
}

router.post("/orders/updated", async(ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("Order updated webhook received", { shop });

  try {
    const orderData = ctx.request.body as ShopifyOrderWithFulfillments;
    const upsertResult = await orderUpsertService.upsertOrderFromWebhook(
      shop,
      orderData,
    );

    if (upsertResult) {
      const { orderId, accessToken } = upsertResult;
      const orderIdInt = parseInt(orderId);

      // Line items fetch + save: best-effort. A failure here must not
      // fail the webhook ACK — Shopify retries and we'd re-do the order
      // upsert pointlessly.
      try {
        await saveOrderLineItems(
          orderIdInt,
          shop,
          accessToken,
          orderData.id.toString(),
        );
      } catch (lineItemError) {
        logger.error(
          "Failed to fetch/save line items",
          lineItemError as Error,
          { orderId, shopifyOrderId: orderData.id },
        );
      }

      // Phase 2.1.a: enqueue customer-sync. Best-effort — if the queue
      // enqueue fails (e.g. Redis hiccup), we don't fail the webhook
      // ACK. CustomerSyncService is idempotent (UPSERT) so a future
      // webhook from the same customer will close the gap. Guest
      // checkouts also enqueue here; the service silently skips them
      // on the null shopify_customer_id signal.
      try {
        await addCustomerSyncJob({
          shopDomain: shop,
          shopifyOrderId: orderData.id.toString(),
        });
      } catch (enqueueError) {
        logger.error(
          "Failed to enqueue customer-sync job",
          enqueueError as Error,
          { orderId, shopifyOrderId: orderData.id },
        );
      }

      if (orderData.fulfillments && orderData.fulfillments.length > 0) {
        for (const fulfillment of orderData.fulfillments) {
          await processFulfillmentSide(orderIdInt, shop, fulfillment);
        }
      }
    }

    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    logger.error("Error processing order update webhook", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

router.post("/fulfillments/updated", async(ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("Fulfillment updated webhook received", { shop });

  try {
    const fulfillmentData = ctx.request.body as FulfillmentWebhookPayload;
    const orderId = await orderUpsertService.findOrderId(
      shop,
      fulfillmentData.order_id.toString(),
    );

    if (orderId !== null) {
      await processFulfillmentSide(parseInt(orderId), shop, fulfillmentData);
    }

    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    logger.error(
      "Error processing fulfillment update webhook",
      error as Error,
    );
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

router.post("/orders/paid", async(ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("Order paid webhook received", { shop });

  try {
    const orderData = ctx.request.body as OrderWebhookPayload;
    await orderUpsertService.markOrderAsPaid(shop, orderData);
    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    logger.error("Error processing order paid webhook", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

// Phase 1.3: SendGrid webhook for email engagement tracking
router.post("/sendgrid", async(ctx) => {
  await handleSendGridWebhook(ctx);
});

export { router as webhookRoutes };
