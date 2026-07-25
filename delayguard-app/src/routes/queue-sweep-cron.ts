/**
 * Queue-sweep cron endpoints — LAUNCH_PLAN B1 (decision D4).
 *
 * Serverless background processing: Vercel Cron invokes these endpoints
 * (GET, with `Authorization: Bearer ${CRON_SECRET}`); each runs one
 * bounded sweep well inside the 30s function cap:
 *
 *   GET|POST /api/cron/delay-check            → DB-driven delay-check sweep
 *   GET|POST /api/cron/notification-dispatch  → DB-driven pending-alert dispatch
 *   GET|POST /api/cron/customer-sync          → drains queued customer-sync jobs
 *
 * (tracking-refresh lives in tracking-refresh-cron.ts.) Routers carry no
 * prefix (A3): server.ts mounts this at /api/cron. POST is kept for
 * manual/external triggers.
 */
import Router from "koa-router";
import { Context } from "koa";
import { logger } from "../utils/logger";
import { requireCronSecret } from "../middleware/cron-auth";
import { processDelayCheckSweep } from "../queue/sweeps/delay-check-sweep";
import { processNotificationSweep } from "../queue/sweeps/notification-sweep";
import { processCustomerSyncDrain } from "../queue/sweeps/customer-sync-drain";

const router = new Router();

function sweepHandler(
  name: string,
  sweep: () => Promise<unknown>,
): (ctx: Context) => Promise<void> {
  return async(ctx: Context): Promise<void> => {
    try {
      logger.info(`🕐 ${name} cron started`);
      const stats = await sweep();
      logger.info(`✅ ${name} cron completed`, { stats });

      ctx.status = 200;
      ctx.body = {
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error in ${name} cron`, error as Error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  };
}

const delayCheckHandler = sweepHandler("delay-check sweep", processDelayCheckSweep);
router.get("/delay-check", requireCronSecret, delayCheckHandler);
router.post("/delay-check", requireCronSecret, delayCheckHandler);

const notificationHandler = sweepHandler(
  "notification-dispatch sweep",
  processNotificationSweep,
);
router.get("/notification-dispatch", requireCronSecret, notificationHandler);
router.post("/notification-dispatch", requireCronSecret, notificationHandler);

const customerSyncHandler = sweepHandler(
  "customer-sync drain",
  processCustomerSyncDrain,
);
router.get("/customer-sync", requireCronSecret, customerSyncHandler);
router.post("/customer-sync", requireCronSecret, customerSyncHandler);

export { router as queueSweepCronRoutes };
