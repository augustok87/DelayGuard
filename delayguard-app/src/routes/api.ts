import Router from "koa-router";
import { Context } from "koa";
import { logger } from "../utils/logger";
import { query } from "../database/connection";
import { requireAuth, getShopDomain } from "../middleware/shopify-session";

const router = new Router({ prefix: "/api" });

/**
 * GET /api/alerts
 * Get all delay alerts for authenticated shop
 *
 * @returns Array of delay alerts with order information
 */
router.get("/alerts", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);

    logger.debug("Fetching alerts for shop", { shop: shopDomain });

    // Query database for shop's alerts with order details
    const alerts = await query(
      `
      SELECT 
        da.id,
        da.order_id,
        da.status,
        da.delay_reason,
        da.estimated_delay_days,
        da.notification_sent_at,
        da.created_at,
        da.updated_at,
        o.order_number,
        o.customer_email,
        o.customer_name,
        o.total_price,
        o.created_at as order_created_at
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      ORDER BY da.created_at DESC
      LIMIT 100
      `,
      [shopDomain],
    );

    logger.debug("Fetched alerts", { shop: shopDomain, count: alerts.length });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: alerts,
      count: alerts.length,
    };
  } catch (error) {
    logger.error("Error fetching alerts", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch alerts" };
  }
});

/**
 * GET /api/orders
 * Get recent orders for authenticated shop
 *
 * @query limit - Number of orders to return (default: 50, max: 200)
 * @returns Array of orders with alert counts
 */
router.get("/orders", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const limit = Math.min(parseInt(ctx.query.limit as string) || 50, 200);

    logger.debug("Fetching orders for shop", {
      shop: shopDomain,
      limit,
    });

    const orders = await query(
      `
      SELECT 
        o.id,
        o.shopify_order_id,
        o.order_number,
        o.customer_email,
        o.customer_name,
        o.total_price,
        o.financial_status,
        o.fulfillment_status,
        o.created_at,
        o.updated_at,
        COUNT(da.id) as alert_count,
        MAX(da.created_at) as last_alert_at
      FROM orders o
      LEFT JOIN delay_alerts da ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2
      `,
      [shopDomain, limit],
    );

    logger.debug("Fetched orders", {
      shop: shopDomain,
      count: orders.length,
    });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: orders,
      count: orders.length,
    };
  } catch (error) {
    logger.error("Error fetching orders", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch orders" };
  }
});

/**
 * GET /api/settings
 * Get app settings for authenticated shop
 * Creates default settings if none exist
 *
 * @returns Shop's app settings
 */
router.get("/settings", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);

    logger.debug("Fetching settings for shop", { shop: shopDomain });

    const settings = await query(
      `
      SELECT 
        s.delay_threshold_days,
        s.email_enabled,
        s.sms_enabled,
        s.notification_template,
        s.custom_message,
        s.created_at,
        s.updated_at
      FROM app_settings s
      JOIN shops sh ON s.shop_id = sh.id
      WHERE sh.shop_domain = $1
      `,
      [shopDomain],
    );

    // If no settings exist, create default settings
    if (settings.length === 0) {
      logger.info("Creating default settings for shop", { shop: shopDomain });

      await query(
        `
        INSERT INTO app_settings (
          shop_id, 
          delay_threshold_days, 
          email_enabled, 
          sms_enabled,
          notification_template
        )
        SELECT 
          id, 
          2, 
          true, 
          false,
          'default'
        FROM shops
        WHERE shop_domain = $1
        ON CONFLICT (shop_id) DO NOTHING
        `,
        [shopDomain],
      );

      // Return default settings
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          delay_threshold_days: 2,
          email_enabled: true,
          sms_enabled: false,
          notification_template: "default",
          custom_message: null,
        },
      };
      return;
    }

    logger.debug("Fetched settings", { shop: shopDomain });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: settings[0],
    };
  } catch (error) {
    logger.error("Error fetching settings", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch settings" };
  }
});

/**
 * PUT /api/settings
 * Update app settings for authenticated shop
 * Supports partial updates (only provided fields are updated)
 *
 * @body delay_threshold_days - Number of days before sending delay alert
 * @body email_enabled - Enable email notifications
 * @body sms_enabled - Enable SMS notifications
 * @body notification_template - Template name for notifications
 * @body custom_message - Custom message for notifications
 */
router.put("/settings", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);
    const {
      delay_threshold_days,
      email_enabled,
      sms_enabled,
      notification_template,
      custom_message,
    } = ctx.request.body as Record<string, unknown>;

    logger.debug("Updating settings for shop", {
      shop: shopDomain,
      settings: ctx.request.body,
    });

    // Validate input
    if (delay_threshold_days !== undefined) {
      const threshold = Number(delay_threshold_days);
      if (isNaN(threshold) || threshold < 1 || threshold > 30) {
        ctx.status = 400;
        ctx.body = {
          error: "delay_threshold_days must be between 1 and 30",
          code: "INVALID_THRESHOLD",
        };
        return;
      }
    }

    // Update settings (COALESCE keeps existing value if new value is null)
    await query(
      `
      UPDATE app_settings
      SET 
        delay_threshold_days = COALESCE($1, delay_threshold_days),
        email_enabled = COALESCE($2, email_enabled),
        sms_enabled = COALESCE($3, sms_enabled),
        notification_template = COALESCE($4, notification_template),
        custom_message = COALESCE($5, custom_message),
        updated_at = CURRENT_TIMESTAMP
      WHERE shop_id = (SELECT id FROM shops WHERE shop_domain = $6)
      `,
      [
        delay_threshold_days,
        email_enabled,
        sms_enabled,
        notification_template,
        custom_message,
        shopDomain,
      ],
    );

    logger.info("Settings updated successfully", { shop: shopDomain });

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: "Settings updated successfully",
    };
  } catch (error) {
    logger.error("Error updating settings", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to update settings" };
  }
});

/**
 * GET /api/analytics
 * Get analytics and statistics for authenticated shop
 *
 * @returns Analytics data including alert stats and order stats
 */
router.get("/analytics", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);

    logger.debug("Fetching analytics for shop", { shop: shopDomain });

    // Get alert statistics
    const alertStats = await query(
      `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_alerts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_alerts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as alerts_last_30_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as alerts_last_7_days
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      `,
      [shopDomain],
    );

    // Get order statistics
    const orderStats = await query(
      `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as orders_last_7_days,
        AVG(total_price::numeric) as average_order_value
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      `,
      [shopDomain],
    );

    logger.debug("Fetched analytics", { shop: shopDomain });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        alerts: alertStats[0] || {},
        orders: orderStats[0] || {},
      },
    };
  } catch (error) {
    logger.error("Error fetching analytics", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch analytics" };
  }
});

/**
 * GET /api/shop
 * Get current shop information
 *
 * @returns Shop details
 */
router.get("/shop", requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = getShopDomain(ctx);

    logger.debug("Fetching shop information", { shop: shopDomain });

    const shop = await query(
      `
      SELECT 
        shop_domain,
        shopify_shop_id,
        shop_name,
        email,
        plan_name,
        created_at,
        updated_at
      FROM shops
      WHERE shop_domain = $1
      `,
      [shopDomain],
    );

    if (shop.length === 0) {
      logger.warn("Shop not found in database", { shop: shopDomain });
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    logger.debug("Fetched shop information", { shop: shopDomain });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: shop[0],
    };
  } catch (error) {
    logger.error("Error fetching shop", error as Error, {
      shop: ctx.state.shop,
    });
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch shop" };
  }
});

/**
 * Health check endpoint for API routes
 * Does not require authentication
 */
router.get("/health", async (ctx: Context) => {
  ctx.status = 200;
  ctx.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "api",
  };
});

export { router as apiRoutes };
