/**
 * Billing Routes
 * Handles Shopify subscription management and plan upgrades/downgrades
 */

import Router from "koa-router";
import { logger } from "../utils/logger";
import { billingService } from "../services/billing-service";
import { query } from "../database/connection";
import type { Context } from "koa";

const router = new Router({ prefix: "/billing" });

/**
 * GET /billing/plans
 * Get available subscription plans
 */
router.get("/plans", async (ctx: Context) => {
  try {
    const plans = {
      free: billingService.getPlanConfig("free"),
      pro: billingService.getPlanConfig("pro"),
      enterprise: billingService.getPlanConfig("enterprise"),
    };

    ctx.status = 200;
    ctx.body = {
      success: true,
      plans,
    };
  } catch (error) {
    logger.error("Error fetching billing plans", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch billing plans" };
  }
});

/**
 * GET /billing/subscription
 * Get current subscription for authenticated shop
 */
router.get("/subscription", async (ctx: Context) => {
  try {
    // Get shop from session (set by Shopify auth middleware)
    const shop = ctx.session?.shop;

    if (!shop) {
      ctx.status = 401;
      ctx.body = { error: "Not authenticated" };
      return;
    }

    // Get shop UUID from domain
    const shopResult = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shop],
    );

    if (shopResult.length === 0) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    const shopId = shopResult[0].id;
    const summary = await billingService.getBillingSummary(shopId);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: summary,
    };
  } catch (error) {
    logger.error("Error fetching subscription", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch subscription" };
  }
});

/**
 * POST /billing/subscribe
 * Create or upgrade subscription
 *
 * For Shopify Billing API integration, this endpoint should:
 * 1. Create a RecurringApplicationCharge
 * 2. Redirect merchant to charge confirmation URL
 * 3. Handle callback after confirmation
 */
router.post("/subscribe", async (ctx: Context) => {
  try {
    const { plan_name } = ctx.request.body as {
      plan_name: "free" | "pro" | "enterprise";
    };
    const shop = ctx.session?.shop;

    if (!shop) {
      ctx.status = 401;
      ctx.body = { error: "Not authenticated" };
      return;
    }

    if (!["free", "pro", "enterprise"].includes(plan_name)) {
      ctx.status = 400;
      ctx.body = { error: "Invalid plan name" };
      return;
    }

    // Get shop UUID
    const shopResult = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shop],
    );

    if (shopResult.length === 0) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    const shopId = shopResult[0].id;

    // For free plan, create subscription directly
    if (plan_name === "free") {
      const subscription = await billingService.createSubscription(
        shopId,
        "free",
      );

      ctx.status = 200;
      ctx.body = {
        success: true,
        subscription,
      };
      return;
    }

    // For paid plans, generate Shopify charge
    const returnUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/billing/callback`;
    const isTest = process.env.NODE_ENV !== "production";

    const charge = billingService.generateRecurringCharge(
      plan_name,
      returnUrl,
      isTest,
    );

    // In a real implementation, you would:
    // 1. Create RecurringApplicationCharge via Shopify API
    // 2. Return confirmation URL to redirect merchant
    // 3. Store pending charge ID

    logger.info("Billing charge generated", {
      shop,
      plan_name,
      charge,
    });

    // For now, create subscription directly (in production, do this in callback)
    const subscription = await billingService.createSubscription(
      shopId,
      plan_name,
      "test-charge-id",
    );

    ctx.status = 200;
    ctx.body = {
      success: true,
      subscription,
      charge,
      // confirmation_url: 'https://...' // Would be returned from Shopify API
    };
  } catch (error) {
    logger.error("Error creating subscription", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to create subscription" };
  }
});

/**
 * GET /billing/callback
 * Handle Shopify billing callback after charge confirmation
 */
router.get("/callback", async (ctx: Context) => {
  try {
    const { charge_id } = ctx.query as { charge_id: string };
    const shop = ctx.session?.shop;

    if (!shop) {
      ctx.status = 401;
      ctx.body = { error: "Not authenticated" };
      return;
    }

    if (!charge_id) {
      ctx.status = 400;
      ctx.body = { error: "Missing charge_id parameter" };
      return;
    }

    // In a real implementation:
    // 1. Fetch charge from Shopify API using charge_id
    // 2. Verify charge status is 'accepted'
    // 3. Activate the charge
    // 4. Create/update subscription in database

    logger.info("Billing callback received", {
      shop,
      charge_id,
    });

    ctx.redirect("/dashboard?billing_success=true");
  } catch (error) {
    logger.error("Error handling billing callback", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to process billing callback" };
  }
});

/**
 * POST /billing/cancel
 * Cancel current subscription
 */
router.post("/cancel", async (ctx: Context) => {
  try {
    const shop = ctx.session?.shop;

    if (!shop) {
      ctx.status = 401;
      ctx.body = { error: "Not authenticated" };
      return;
    }

    // Get shop UUID
    const shopResult = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shop],
    );

    if (shopResult.length === 0) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    const shopId = shopResult[0].id;
    const cancelledSubscription =
      await billingService.cancelSubscription(shopId);

    // In a real implementation, also cancel the charge via Shopify API

    ctx.status = 200;
    ctx.body = {
      success: true,
      subscription: cancelledSubscription,
    };
  } catch (error) {
    logger.error("Error cancelling subscription", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to cancel subscription" };
  }
});

/**
 * GET /billing/usage
 * Get current billing period usage
 */
router.get("/usage", async (ctx: Context) => {
  try {
    const shop = ctx.session?.shop;

    if (!shop) {
      ctx.status = 401;
      ctx.body = { error: "Not authenticated" };
      return;
    }

    // Get shop UUID
    const shopResult = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shop],
    );

    if (shopResult.length === 0) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    const shopId = shopResult[0].id;
    const limitCheck = await billingService.checkAlertLimit(shopId);

    ctx.status = 200;
    ctx.body = {
      success: true,
      usage: limitCheck,
    };
  } catch (error) {
    logger.error("Error fetching billing usage", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch billing usage" };
  }
});

export { router as billingRoutes };
