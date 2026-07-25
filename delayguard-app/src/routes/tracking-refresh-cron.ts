/**
 * Tracking Refresh Cron Endpoint
 *
 * Purpose: cron-triggered refresh of tracking data for in-transit orders
 * - Invoked by Vercel Cron (GET) or an external scheduler (POST kept for
 *   manual triggers)
 * - Calls processTrackingRefresh() to fetch latest tracking data from
 *   ShipEngine for a bounded batch (cursor-resumed, 25s time budget)
 * - Returns statistics for monitoring
 *
 * Security: guarded by the shared CRON_SECRET bearer check
 * (src/middleware/cron-auth.ts) — Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically.
 *
 * Routing: no router-level prefix (LAUNCH_PLAN A3) — server.ts mounts
 * this router at /api/cron, so the endpoint is /api/cron/tracking-refresh
 * (matching the vercel.json crons entry).
 */

import Router from "koa-router";
import { Context } from "koa";
import { logger } from "../utils/logger";
import { requireCronSecret } from "../middleware/cron-auth";
import { processTrackingRefresh } from "../queue/processors/tracking-refresh";

const router = new Router();

const trackingRefreshHandler = async(ctx: Context): Promise<void> => {
  try {
    logger.info("🕐 Tracking refresh cron job started");

    // Process tracking refresh
    const stats = await processTrackingRefresh();

    logger.info("✅ Tracking refresh cron job completed", { ...stats });

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
};

router.get("/tracking-refresh", requireCronSecret, trackingRefreshHandler);
router.post("/tracking-refresh", requireCronSecret, trackingRefreshHandler);

export { router as trackingRefreshCronRoutes };
