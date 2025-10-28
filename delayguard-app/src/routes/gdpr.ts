/**
 * GDPR Webhook Routes
 * Mandatory Shopify GDPR compliance endpoints
 *
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance
 */

import Router from "koa-router";
import { logger } from "../utils/logger";
import { gdprService } from "../services/gdpr-service";
import type {
  GDPRDataRequestWebhook,
  GDPRCustomerRedactWebhook,
  GDPRShopRedactWebhook,
} from "../types";
import crypto from "crypto";

const router = new Router({ prefix: "/gdpr" });

/**
 * Verify GDPR webhook HMAC signature
 */
function verifyGDPRWebhook(data: string, hmac: string): boolean {
  if (!process.env.SHOPIFY_API_SECRET) {
    logger.error("SHOPIFY_API_SECRET not configured");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(data, "utf8")
    .digest("base64");

  return hash === hmac;
}

/**
 * customers/data_request webhook
 * Shopify sends this when a customer requests their data
 * Must respond with all customer data within 30 days
 */
router.post("/customers/data_request", async (ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  // Verify webhook authenticity
  if (!verifyGDPRWebhook(body, hmac)) {
    logger.warn("GDPR webhook verification failed", {
      shop,
      type: "data_request",
    });
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("📋 GDPR data request webhook received", { shop });

  try {
    const webhook = ctx.request.body as GDPRDataRequestWebhook;
    const customerData = await gdprService.handleDataRequest(webhook);

    // Shopify expects a 200 response
    // Actual data should be sent to customer via email or API
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: "Customer data request processed",
      data: customerData,
    };
  } catch (error) {
    logger.error("Error processing GDPR data request webhook", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

/**
 * customers/redact webhook
 * Shopify sends this when a customer requests data deletion
 * Must anonymize/delete customer data within 30 days
 */
router.post("/customers/redact", async (ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  // Verify webhook authenticity
  if (!verifyGDPRWebhook(body, hmac)) {
    logger.warn("GDPR webhook verification failed", {
      shop,
      type: "customer_redact",
    });
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("🗑️ GDPR customer redact webhook received", { shop });

  try {
    const webhook = ctx.request.body as GDPRCustomerRedactWebhook;
    await gdprService.handleCustomerRedact(webhook);

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: "Customer data redaction completed",
    };
  } catch (error) {
    logger.error(
      "Error processing GDPR customer redact webhook",
      error as Error,
    );
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

/**
 * shop/redact webhook
 * Shopify sends this 48 hours after app uninstall
 * Must delete all shop data
 */
router.post("/shop/redact", async (ctx) => {
  const hmac = ctx.get("X-Shopify-Hmac-Sha256");
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get("X-Shopify-Shop-Domain");

  // Verify webhook authenticity
  if (!verifyGDPRWebhook(body, hmac)) {
    logger.warn("GDPR webhook verification failed", {
      shop,
      type: "shop_redact",
    });
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  logger.info("🏪 GDPR shop redact webhook received", { shop });

  try {
    const webhook = ctx.request.body as GDPRShopRedactWebhook;
    await gdprService.handleShopRedact(webhook);

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: "Shop data redaction completed",
    };
  } catch (error) {
    logger.error("Error processing GDPR shop redact webhook", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

export { router as gdprRoutes };
