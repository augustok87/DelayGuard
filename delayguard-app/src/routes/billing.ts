/**
 * Billing Routes — Shopify App Pricing (LAUNCH_PLAN WS-F F1)
 *
 * Plans are configured in the Partner Dashboard (App Pricing / Managed
 * Pricing); Shopify hosts the plan-selection page and the entire charge
 * lifecycle, so this router intentionally contains no charge-creation,
 * callback, or cancellation code. The shop's live tier is exposed at
 * GET /api/plan (see routes/api.ts).
 *
 * The router is prefix-free — src/server.ts mounts it at /billing.
 */

import Router from "koa-router";
import { logger } from "../utils/logger";
import { billingService } from "../services/billing-service";
import type { Context } from "koa";

const router = new Router();

/**
 * GET /billing/plans
 * Public plan catalog (matches the Partner Dashboard App Pricing plans).
 */
router.get("/plans", async(ctx: Context) => {
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

export { router as billingRoutes };
