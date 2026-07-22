/**
 * Cron authentication middleware — LAUNCH_PLAN A4.
 *
 * Every /api/cron/* endpoint is guarded by a CRON_SECRET bearer check.
 * Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`
 * when the CRON_SECRET env var is set on the project.
 *
 * These endpoints are exempt from CSRF and session-token auth
 * (server.ts) — this secret IS their auth.
 */
import { Context, Next } from "koa";
import { logger } from "../utils/logger";

export const requireCronSecret = async(
  ctx: Context,
  next: Next,
): Promise<void> => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET environment variable not set");
    ctx.status = 500;
    ctx.body = { error: "Server configuration error" };
    return;
  }

  const authHeader = ctx.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    logger.error("Unauthorized cron job attempt", undefined, {
      path: ctx.path,
      ip: ctx.ip,
      userAgent: ctx.get("User-Agent"),
    });
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return;
  }

  await next();
};
