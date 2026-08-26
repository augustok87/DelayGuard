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

## Deploy with `npm run deploy`, never a bare `npx vercel` (2026-08-26 incident)

**`npx vercel --prod --yes` run from the repo root took production down for ~4 minutes.** The repo root has no `package.json` and no `vercel.json`, so Vercel found nothing to build, produced an empty output, and happily marked it **Ready**:

```
Running "vercel build"
Build Completed in /vercel/output [1s]          ← a real build takes ~45s
Skipping cache upload because no files were prepared
```

Every route then returned **404** — `/health`, `/monitoring/health`, `/legal/*`. Nothing errored. The deploy reported success.

**The rule "deploy from `delayguard-app/`" was already written down here and it did not prevent the incident**, because a shell `cd` had reset between commands. So the guard is now structural instead of advisory:

```bash
cd delayguard-app && npm run deploy      # ✅ npm resolves package.json; fails loudly elsewhere
npx vercel --prod --yes                  # ❌ silently deploys whatever directory you are standing in
```

`npm run <script>` cannot run outside the package directory — it exits with `ENOENT: Could not read package.json`. That turns a silent 4-minute outage into an instant, obvious error. (The `deploy` script now calls `npx vercel` internally, because `vercel` is not installed globally.)

**Two things worth copying from the response, not just the cause:**

1. **Roll back before diagnosing.** `npx vercel promote <last-known-good-url> --yes` restored service in ~2 s. Root-causing came after.
2. **Build duration is a signal.** `12s` against a historical `40–45s` was the first hint, before any log was read. `vercel ls --prod` shows it.

**After any production deploy, probe the running thing** — `/health` AND `/monitoring/health`. A `Ready` status is not evidence that anything was deployed.
