---
name: DelayGuard backend rules
description: Koa services/routes/middleware/queue/database guidance — webhook signing, BullMQ retry pattern, migration recipe, incident-derived rules
type: project
paths:
  - "delayguard-app/src/services/**/*.ts"
  - "delayguard-app/src/routes/**/*.ts"
  - "delayguard-app/src/middleware/**/*.ts"
  - "delayguard-app/src/queue/**/*.ts"
  - "delayguard-app/src/database/**"
  - "delayguard-app/src/observability/**/*.ts"
---

# Backend rules

Koa + PostgreSQL (raw `pg`) + BullMQ + Redis. Run from `delayguard-app/`.

## Webhook signature verification

Every inbound webhook verifies HMAC-SHA256 BEFORE reading payload state. Two canonical patterns:

- **Shopify** — see `verifyWebhook(data, hmac)` in [webhooks.ts](delayguard-app/src/routes/webhooks.ts). Header: `X-Shopify-Hmac-Sha256`. Secret: `SHOPIFY_API_SECRET`.
- **SendGrid** — see `verifyWebhookSignature(payload, signature, timestamp)` in [sendgrid-webhook.ts](delayguard-app/src/routes/sendgrid-webhook.ts). Headers: `X-Twilio-Email-Event-Webhook-Signature` and `…-Timestamp`. Includes a 10-minute replay-window check (rejects timestamps older than `10 * 60 * 1000` ms).

Rules:
- Never short-circuit signature verification (no env-toggle bypasses, no `skipVerify` flags).
- Never log raw body or trust any payload field before verify returns true.
- New webhook integrations replicate the existing pattern verbatim — copy the timestamp window from SendGrid even if the upstream doesn't send one (defense in depth).

## Webhook field-population rule (v1.19 incident)

When extracting fields from webhook payloads into DB columns, write a **field-by-field assertion test for every persisted column**, not just a happy-path return-value check. The `last_tracking_update` column was silently never populated for one release because the test only verified the handler returned 200.

Test shape: `expect(persistedRow).toMatchObject({ ...everySingleColumn })` — listing each column explicitly.

## BullMQ retry pattern

Canonical config in [queue/setup.ts](delayguard-app/src/queue/setup.ts):

```ts
defaultJobOptions: {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
}
```

New queues match this baseline unless there's a reason to diverge (document the reason inline). Producers (`addDelayCheckJob`, `addNotificationJob`) work in serverless; **workers do NOT run on Vercel** — see [.claude/rules/deploy.md](.claude/rules/deploy.md) and the leading comment in `queue/setup.ts`.

## Notification routing rule (v1.19 incident)

When adding a new delay rule, the notification-dispatch block must live **inside** the rule-matched branch, not after the conditional. Warehouse delay alerts were silently dropped for a release because dispatch was placed in a parent scope.

Required tests for any new rule:
- `rule matches → notification fires` (positive)
- `rule does not match → notification does NOT fire` (negative — the bug-shaped test)

## Database migrations

- Migration files: manual SQL at `delayguard-app/src/database/migrations/NNN_name.sql`
- Run dev: `npm run db:migrate` (resolves to `ts-node src/database/migrate.ts`)
- Connection pool: see [connection.ts](delayguard-app/src/database/connection.ts)
- **No rollback tooling exists.** Write forward-compatible migrations only — additive columns with defaults, no `DROP`/`ALTER` that breaks the previous app version.
- Schema tests are excluded from the default Jest run (race conditions); invoke explicitly with `npm run test:db:schema`.

## Service layer

Business logic lives in `delayguard-app/src/services/*.ts` (24 files). Routes in `delayguard-app/src/routes/*.ts` are thin — parse input, call a service, format response. Don't put DB queries or external API calls in route handlers; if you need one, add it to the appropriate service.

---

For workflow basics (TDD-first, lint, type-check, doc updates) see the root [CLAUDE.md](CLAUDE.md).
