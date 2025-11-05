/**
 * Tracking Refresh Cron Job API Endpoint
 *
 * Purpose: Hourly cron job that refreshes tracking data for all in-transit orders
 * - Triggered by Vercel Cron or external scheduler
 * - Calls processTrackingRefresh() to fetch latest tracking data from ShipEngine
 * - Returns statistics for monitoring
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Only callable with correct Authorization header
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/tracking-refresh",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import Router from "koa-router";
import { Context } from "koa";
import { logger } from "../utils/logger";
import { processTrackingRefresh } from "../queue/processors/tracking-refresh";

const router = new Router();

/**
 * POST /api/cron/tracking-refresh
 *
 * Triggers tracking refresh for all in-transit orders
 */
router.post("/api/cron/tracking-refresh", async(ctx: Context) => {
  try {
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = ctx.get("Authorization");

    if (!cronSecret) {
      logger.error("CRON_SECRET environment variable not set");
      ctx.status = 500;
      ctx.body = { error: "Server configuration error" };
      return;
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Unauthorized cron job attempt", {
        ip: ctx.ip,
        userAgent: ctx.get("User-Agent"),
      });
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }

    logger.info("🕐 Tracking refresh cron job started");

    // Process tracking refresh
    const stats = await processTrackingRefresh();

    logger.info("✅ Tracking refresh cron job completed", stats);

    ctx.status = 200;
    ctx.body = {
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error in tracking refresh cron job", error as Error);

    ctx.status = 500;
    ctx.body = {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as trackingRefreshCronRoutes };
