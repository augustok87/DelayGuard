import Router from "koa-router";
import { logger } from "../utils/logger";
import { query } from "../database/connection";

const router = new Router();

// OAuth initiation endpoint
router.get("/", async(ctx) => {
  try {
    const shop = ctx.query.shop as string;

    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: "Shop parameter is required" };
      return;
    }

    // Validate shop domain format
    if (!shop.includes(".myshopify.com")) {
      ctx.status = 400;
      ctx.body = { error: "Invalid shop domain format" };
      return;
    }

    // Return OAuth URL for Shopify
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/auth/callback`;

    ctx.body = {
      success: true,
      authUrl,
      shop,
      message: "OAuth URL generated successfully",
    };
  } catch (error) {
    logger.error("Error generating OAuth URL", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to generate OAuth URL" };
  }
});

// Store shop information after OAuth
router.post("/callback", async(ctx) => {
  try {
    const { shop, accessToken, scope } = ctx.state.shopify.session;

    // Store shop information in database
    await query(
      `
      INSERT INTO shops (shop_domain, access_token, scope)
      VALUES ($1, $2, $3)
      ON CONFLICT (shop_domain)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        scope = EXCLUDED.scope,
        updated_at = CURRENT_TIMESTAMP
    `,
      [shop, accessToken, scope.split(",")],
    );

    // Create default app settings for the shop
    await query(
      `
      INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled, notification_template)
      SELECT id, 2, true, false, 'default'
      FROM shops
      WHERE shop_domain = $1
      ON CONFLICT (shop_id) DO NOTHING
    `,
      [shop],
    );

    logger.info(`✅ Shop ${shop} authenticated and stored successfully`);

    ctx.body = { success: true, shop };
  } catch (error) {
    logger.error("Error storing shop information", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to store shop information" };
  }
});

// Get current shop information
router.get("/shop", async(ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;

    const result = await query(
      "SELECT shop_domain, created_at, updated_at FROM shops WHERE shop_domain = $1",
      [shop],
    );

    if (result.length === 0) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    ctx.body = result[0];
  } catch (error) {
    logger.error("Error fetching shop information", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch shop information" };
  }
});

export { router as authRoutes };
