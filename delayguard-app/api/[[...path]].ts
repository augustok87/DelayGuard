/**
 * Vercel catch-all function — LAUNCH_PLAN A1.
 *
 * Adapts the REAL configured Koa app (src/server.ts) to Vercel's Node
 * function signature. Together with the vercel.json rewrite
 * (`/(.*) → /api`, applied after the static filesystem check), every
 * non-static route — /api/*, /webhooks/*, /billing/*, /auth/*, /health,
 * /monitoring/*, /api/cron/* — is served by this single function.
 * Koa routes on the ORIGINAL request path (Vercel preserves req.url
 * through rewrites), so no path translation is needed here.
 *
 * ensureInitialized() sets up the pg pool and the BullMQ producers once
 * per cold start. It creates NO BullMQ Workers (LAUNCH_PLAN B1 /
 * deploy.md) — background processing runs via the /api/cron/* sweeps.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { app, ensureInitialized } from '../src/server';

const koaCallback = app.callback();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await ensureInitialized();
  await koaCallback(req, res);
}
