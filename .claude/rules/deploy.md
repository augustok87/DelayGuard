---
name: DelayGuard deploy rules
description: Vercel serverless constraints — 30s timeout, no BullMQ workers, cron pattern
type: project
paths:
  - "delayguard-app/api/**/*.ts"
  - "delayguard-app/vercel.json"
---

# Deployment rules (Vercel)

Production runs on Vercel serverless functions. Local server (`src/server.ts`) is for dev only.

## 30-second function timeout

Every function in [vercel.json](delayguard-app/vercel.json) caps at `maxDuration: 30`. Long-running work (multi-page Shopify pagination, batch ShipEngine refresh, bulk DB updates) **does not belong in a request handler** — enqueue a BullMQ job or schedule a cron endpoint instead.

If a new endpoint needs more than 30s, the design is wrong; split the work.

## No persistent BullMQ workers in serverless

Workers in [queue/setup.ts](delayguard-app/src/queue/setup.ts) require long-running processes and **terminate immediately when the Vercel function ends**. Producers (`addDelayCheckJob`, `addNotificationJob`) work fine — they enqueue to Redis and return.

For background processing on Vercel, the canonical pattern is the cron entry:
```json
"crons": [{ "path": "/api/cron/tracking-refresh", "schedule": "0 0 * * *" }]
```
The cron handler reads the queue and processes a batch within the 30s window. See `queue/setup.ts` leading comment for the full architectural options (Vercel cron, external worker on Railway/Render, Vercel Queue/QStash).

## Vercel-specific commands

- `npm run build` — build for deploy (sets `outputDirectory: public`)
- `npm run db:migrate:vercel` — runs migrations as part of build, not at request time

## Serverless function structure

Files in `delayguard-app/api/` (`index.ts`, `simple.ts`, `health.ts`, `logger.ts`) export a default async handler. Don't import the Koa app entry-point here — these are independent serverless handlers, not Koa routes.

---

For backend conventions (queue config, webhook verification) see [.claude/rules/backend.md](.claude/rules/backend.md).
