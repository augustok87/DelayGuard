import Router from "koa-router";
import { Context } from "koa";
import { logger } from "../utils/logger";
import { requireAuth, getShopDomain } from "../middleware/shopify-session";
import {
  MerchantApiService,
  ShopNotFoundError,
  MerchantApiValidationError,
} from "../services/merchant-api-service";

const router = new Router({ prefix: "/api" });
const merchantApi = new MerchantApiService();

/**
 * Map a service-layer error onto the appropriate HTTP response.
 * - ShopNotFoundError       → 404
 * - MerchantApiValidationError → 400 with the original code
 * - everything else         → 500 (caller logs at the route)
 */
function respondWithServiceError(
  ctx: Context,
  error: unknown,
  fallbackMessage: string,
): void {
  if (error instanceof ShopNotFoundError) {
    logger.warn("Shop not found in database", { shop: error.shopDomain });
    ctx.status = 404;
    ctx.body = { error: "Shop not found" };
    return;
  }
  if (error instanceof MerchantApiValidationError) {
    ctx.status = 400;
    ctx.body = { error: error.message, code: error.code };
    return;
  }
  logger.error(
    fallbackMessage,
    error instanceof Error ? error : new Error(String(error)),
    { shop: ctx.state.shop },
  );
  ctx.status = 500;
  ctx.body = { error: fallbackMessage };
}

/**
 * GET /api/alerts
 * Get all delay alerts for authenticated shop
 */
router.get("/alerts", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const alerts = await merchantApi.getAlerts(shopDomain);
    ctx.status = 200;
    ctx.body = { success: true, data: alerts, count: alerts.length };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch alerts");
  }
});

/**
 * GET /api/orders
 * Get recent orders for authenticated shop
 * @query limit - Number of orders to return (default: 50, max: 200)
 */
router.get("/orders", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const limit = Math.min(parseInt(ctx.query.limit as string) || 50, 200);
    const orders = await merchantApi.getOrders(shopDomain, limit);
    ctx.status = 200;
    ctx.body = { success: true, data: orders, count: orders.length };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch orders");
  }
});

/**
 * GET /api/settings
 * Get app settings for authenticated shop (seeds defaults on first read)
 */
router.get("/settings", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const settings = await merchantApi.getSettings(shopDomain);
    ctx.status = 200;
    ctx.body = { success: true, data: settings };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch settings");
  }
});

/**
 * PUT /api/settings
 * Update app settings for authenticated shop (partial updates supported)
 */
router.put("/settings", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const body = ctx.request.body as Record<string, unknown>;
    await merchantApi.updateSettings(shopDomain, {
      delay_threshold_days: body.delay_threshold_days as number | undefined,
      email_enabled: body.email_enabled as boolean | undefined,
      sms_enabled: body.sms_enabled as boolean | undefined,
      notification_template: body.notification_template as string | undefined,
      custom_message: body.custom_message as string | null | undefined,
    });
    ctx.status = 200;
    ctx.body = { success: true, message: "Settings updated successfully" };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to update settings");
  }
});

/**
 * GET /api/analytics
 * Get analytics and statistics for authenticated shop
 */
router.get("/analytics", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const data = await merchantApi.getAnalytics(shopDomain);
    ctx.status = 200;
    ctx.body = { success: true, data };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch analytics");
  }
});

/**
 * GET /api/shop
 * Get current shop information
 */
router.get("/shop", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const shop = await merchantApi.getShop(shopDomain);
    ctx.status = 200;
    ctx.body = { success: true, data: shop };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch shop");
  }
});

/**
 * GET /api/merchant-settings
 * Get merchant contact information and delay type toggles (Phase 2.6)
 */
router.get("/merchant-settings", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const data = await merchantApi.getMerchantSettings(shopDomain);
    ctx.status = 200;
    ctx.body = { success: true, data };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to fetch merchant settings");
  }
});

/**
 * PUT /api/merchant-settings
 * Update merchant contact information and/or delay type toggles (Phase 2.6)
 */
router.put("/merchant-settings", requireAuth, async(ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const body = ctx.request.body as Record<string, unknown>;
    await merchantApi.updateMerchantSettings(shopDomain, {
      merchantEmail: body.merchantEmail as string | null | undefined,
      merchantPhone: body.merchantPhone as string | null | undefined,
      merchantName: body.merchantName as string | null | undefined,
      warehouseDelaysEnabled: body.warehouseDelaysEnabled as boolean | undefined,
      carrierDelaysEnabled: body.carrierDelaysEnabled as boolean | undefined,
      transitDelaysEnabled: body.transitDelaysEnabled as boolean | undefined,
    });
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: "Merchant settings updated successfully",
    };
  } catch (error) {
    respondWithServiceError(ctx, error, "Failed to update merchant settings");
  }
});

/**
 * Health check endpoint for API routes
 * Does not require authentication
 */
router.get("/health", async(ctx: Context) => {
  ctx.status = 200;
  ctx.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "api",
  };
});

export { router as apiRoutes };
