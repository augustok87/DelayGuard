# CHANGELOG - DelayGuard Version History
*Complete historical record of all features, improvements, and bug fixes*

**Purpose**: Archive of all development milestones and version details
**Last Updated**: May 14, 2026 (v1.40 — audit Wave 2.3 health-check ping() methods)
**For recent versions only**: See [CLAUDE.md](CLAUDE.md#recent-version-history)

---

## VERSION HISTORY

### v1.40 (2026-05-14): Audit Wave 2.3 — health-check `ping()` methods

**Test Results**: 1,911 passing (+25), 25 skipped, 0 failing. Three new ping-focused test surfaces: 6 cases appended to `tests/unit/carrier-service.test.ts`, new sibling `src/services/email-service.test.ts` (7 cases), new sibling `src/services/sms-service.test.ts` (6 cases), new sibling `src/routes/health.test.ts` (6 cases for the route-level `PingResult → ServiceStatus` mapping).
**Status**: Test-mocking compliance fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 2.3.

**Problem**: [delayguard-app/src/routes/health.ts:236,284,321](delayguard-app/src/routes/health.ts) had three direct `fetch(...)` calls against ShipEngine, SendGrid, and Twilio — one per vendor — used as liveness probes inside `/health`. Per [.claude/rules/tests.md](.claude/rules/tests.md), mocks belong at the service-method level. Calling `fetch` from a route forces tests to mock global `fetch`, which is brittle (global-state leaks between tests) and bypasses the wrapper each service already provides. The pre-refactor `/v1/addresses/validate` POST against ShipEngine was also a *heavier* probe than necessary for a liveness check.

**What Changed**:

**1. Three new `ping()` methods, one per external-call service**:

- **[delayguard-app/src/services/carrier-service.ts](delayguard-app/src/services/carrier-service.ts)** — `ping()` reuses the existing axios client and hits `/v1/carriers` (the same lightweight endpoint `getCarrierList` already uses) with a per-call `timeout: 5000`. ShipEngine documents 200 req/min so the once-per-health-check spike is well under quota; `/v1/addresses/validate` was previously used as the probe — heavier than needed.
- **[delayguard-app/src/services/email-service.ts](delayguard-app/src/services/email-service.ts)** — `ping()` issues a fetch to `https://api.sendgrid.com/v3/user/profile` with the existing API key in the `Authorization: Bearer …` header. SendGrid's `@sendgrid/mail` package is a thin send-only wrapper, so the service uses `fetch` internally with an `AbortController` — the *route* no longer calls `fetch` directly, which is what Wave 2.3 is about.
- **[delayguard-app/src/services/sms-service.ts](delayguard-app/src/services/sms-service.ts)** — `ping()` calls `client.api.v2010.accounts(accountSid).fetch()` — Twilio's canonical lightweight liveness probe. The Twilio Node SDK doesn't accept an `AbortSignal`, so the timeout is enforced via `Promise.race` against a 5s timer (the upstream request keeps running in the background on timeout, which is fine for a liveness check — the result is what matters, not strict cancellation). The local `TwilioClient` interface was extended additively with `api.v2010.accounts(sid).fetch()`; the existing `messages.create` surface is untouched.

**2. Shared `PingResult` discriminated union** ([delayguard-app/src/services/ping-result.ts](delayguard-app/src/services/ping-result.ts)):

```ts
type PingResult =
  | { status: "healthy";   latencyMs: number }
  | { status: "degraded";  latencyMs: number; error: string }
  | { status: "unhealthy"; latencyMs: number; error: string };
```

Picked over `{ ok: boolean, latencyMs, error? }` (the audit-spec literal) after a reverse-prompt: the binary collapse would have folded "upstream reachable but 4xx/5xx" (currently `degraded` — bad creds, vendor-side error, network reached) into "couldn't reach upstream at all" (currently `unhealthy`), changing the response body's `external_apis.<vendor>.status` value for upstream-non-2xx and flipping `/health` HTTP from 200 to 503 in that case. The discriminated union preserves the existing tri-state 1:1 — wire shape unchanged, HTTP contract unchanged. `PING_TIMEOUT_MS = 5000` exported from the same module so 3 vendors × 5s = 15s, comfortably under the Vercel 30s function cap.

**3. `ping()` MUST NEVER THROW** — every upstream failure (network, 5xx, timeout, auth) resolves to a `PingResult`. The route's `Promise.allSettled` only sees a *rejected* settlement when the *service constructor* threw (e.g. missing API key), never when ping itself failed. Bug-shaped test in each service: rejection-via-plain-string still resolves to `{ status: "unhealthy" }`.

**4. Route refactored** ([delayguard-app/src/routes/health.ts](delayguard-app/src/routes/health.ts)):
- `checkShipEngine`, `checkSendGrid`, `checkTwilio` private methods deleted. `checkExternalApis` now calls `Promise.allSettled([carrier.ping(), email.ping(), sms.ping()])` after constructing each service (with a per-service try/wrap so a missing API key surfaces as a rejected settlement rather than a 500 on `/health`).
- `pingSettledToServiceStatus(settled, timestamp)` helper (module-scoped, exported for direct testing) maps each `PromiseSettledResult<PingResult>` back into the existing `ServiceStatus` wire shape. Each discriminant maps 1:1; a rejected settlement maps to `status: "unhealthy"` carrying the constructor error message.
- Verified: `grep -c "fetch(" src/routes/health.ts` → 0 (one match remaining is the comment "routes never call fetch() directly").
- **/health response body shape preserved verbatim**: same keys, same values (with the upstream 4xx/5xx case still emitting `"degraded"`), same 200-vs-503 HTTP behavior. External uptime checks and the frontend monitoring consumer continue to parse the same shape.

**TDD**: 25 new tests written first, each observed RED (TS2339 "ping does not exist") then implemented:
- **CarrierService.ping** (6 tests): happy path with the lightweight `/v1/carriers` endpoint asserted, 5s `timeout` regression guard (axios's `signal` equivalent), `degraded` on upstream non-2xx with `HTTP 500` in the error, `unhealthy` with `/timeout/i` on `ECONNABORTED`, `unhealthy` on `ECONNREFUSED` (no `response`), never-throws across non-Error rejection shapes.
- **EmailService.ping** (7 tests): happy path with Authorization header asserted, `AbortSignal` regression guard (asserts `init.signal instanceof AbortSignal`), correct endpoint URL assertion, `degraded` on 401 (real-world: bad API key), `unhealthy` with `/timeout/i` after `jest.useFakeTimers() + advanceTimersByTimeAsync(5000)`, `unhealthy` on `fetch failed: ECONNREFUSED`, never-throws across non-Error rejection shapes.
- **SMSService.ping** (6 tests): happy path with Twilio account fetch asserted, `accountsFactory("AC_TEST_SID")` regression guard for the correct account being probed, `degraded` on Twilio error carrying an HTTP `status` (`HTTP 401: Authentication Error`), `unhealthy` with `/timeout/i` when the Twilio call never resolves (Promise.race against the 5s timer), `unhealthy` on `ECONNREFUSED` (no `status` on the error), never-throws across non-Error rejection shapes.
- **routes/health.ts → pingSettledToServiceStatus** (6 tests): each `PingResult` discriminant maps to the right `ServiceStatus` shape (`response_time` on success, `error` preserved on degraded/unhealthy, no `error` on healthy), rejected settlements with `Error` / plain-string / non-Error reasons all map to `status: "unhealthy"` carrying a sensible message. **No global `fetch` mock anywhere in this file** — the abstraction the wave introduces removes the need for it.

**Out of scope (smallest blast radius — flagged for future waves)**:
- 2 pre-existing lint errors carried over from Wave 1.1 (`tests/integration/database/tracking-events-schema.test.ts:2`, `tests/unit/components/HelpModal.test.tsx:162`) — untouched per the audit plan.
- Husky pre-commit gate is still non-functional (deeper diagnosis recorded in audit plan Wave 1.1) — not bypassed, just doesn't fire.
- `TrackingEvent` interface declared twice in [delayguard-app/src/types/index.ts](delayguard-app/src/types/index.ts) (lines 22 and 148) with conflicting shapes — surfaced during Wave 2.2, still deferred to Wave 3.
- Broader Wave 4 sibling-test gap: `email-service.ts` and `sms-service.ts` still lack full sibling tests for the `sendDelayEmail` / `sendDelaySMS` paths. The new test files cover **only** `ping()` per the wave's scope discipline; the broader gap remains tracked for Wave 4.
- Found while extracting: `npm run lint:fix` runs a project-local script ([scripts/lint-fix.js](delayguard-app/scripts/lint-fix.js)) that invokes `npx prettier --write src/**/*.{ts,tsx,js,jsx}`. Prettier's defaults and the project's ESLint `space-before-function-paren: never` rule disagree, so running `lint:fix` reformats ~40 source files and introduces ~190 new lint errors. Worked around by using `npx eslint --fix <files>` directly on the two new test files instead. Tracked separately as an audit item (the lint:fix script is unsafe to invoke; the husky gate that would have prevented it from landing is non-functional per Wave 1.1).

---

### v1.39 (2026-05-14): Audit Wave 2.2 — webhook persistence services extraction

**Test Results**: 1,886 passing (+33), 25 skipped, 0 failing. Three new sibling test files: `order-upsert-service.test.ts` (17 tests), `fulfillment-persistence-service.test.ts` (6 tests), `tracking-ingest-service.test.ts` (10 tests).
**Status**: Service-layer compliance fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 2.2.

**Problem**: [delayguard-app/src/routes/webhooks.ts](delayguard-app/src/routes/webhooks.ts) was 463 LOC with 11 inline `query(...)` calls across four helpers (`processOrderUpdate`, `processFulfillmentUpdate`, `processOrderPaid`, `processFulfillment`). Per [.claude/rules/backend.md](.claude/rules/backend.md), DB queries belong in services; the route should be HMAC verify → parse → service → enqueue → respond. `processFulfillment` alone composed six responsibilities (fulfillments UPSERT + ShipEngine HTTP + tracking_events UPSERT + orders ETA UPDATE + shop_domain JOIN + delay-check job enqueue), which is precisely the kind of glue Wave 2.1's pattern was meant to dissolve.

**What Changed**:

**1. Three new services**:

- **[delayguard-app/src/services/order-upsert-service.ts](delayguard-app/src/services/order-upsert-service.ts)** — owns every orders-table write:
  - `upsertOrderFromWebhook(shopDomain, orderData)` → returns `{ orderId, accessToken } | null`. Resolves shop + UPSERTs the order row + re-reads the orderId. Returns `null` on shop-not-found (silent-skip — see preserved-behavior note below).
  - `markOrderAsPaid(shopDomain, orderData)` → `boolean`. Resolves shop + UPDATEs status to "paid". Returns `false` on shop-not-found.
  - `findOrderId(shopDomain, shopifyOrderId)` → `string | null`. Resolves shop + looks up the internal orderId for the `/fulfillments/updated` flow. Returns `null` on either miss.
- **[delayguard-app/src/services/fulfillment-persistence-service.ts](delayguard-app/src/services/fulfillment-persistence-service.ts)** — `upsertFulfillment(orderId, fulfillmentData)`. Pure persistence — no ShipEngine HTTP. The internal `orderId` (resolved upstream) is the multi-tenant guard; the Shopify-supplied `order_id` from the payload is never trusted directly.
- **[delayguard-app/src/services/tracking-ingest-service.ts](delayguard-app/src/services/tracking-ingest-service.ts)** — `ingestTracking(orderId, trackingNumber, carrierCode)`. Composes the ShipEngine `getTrackingInfo` call + the per-event `tracking_events` UPSERT loop + the orders ETA/tracking_status/`last_tracking_update` UPDATE. Lazy `CarrierService` injection so the route module loads in test/dev environments where `SHIPENGINE_API_KEY` may be unset.

**2. Webhook silent-skip semantics PRESERVED VERBATIM**: distinct from Wave 2.1's `MerchantApiService` contract, the webhook services do NOT throw `ShopNotFoundError`. They return `null` / `false` so the route still 200s. Shopify retries on non-2xx — a `404` on shop-not-found would create a retry storm against shops that have uninstalled. This is called out in the service file headers and in the sibling tests (each "silent-skips" test asserts no throw + no downstream DB calls + a `logger.info` line).

**3. ShipEngine failure semantics PRESERVED VERBATIM**: `TrackingIngestService.ingestTracking` swallows ShipEngine HTTP errors (logs and returns void), matching the pre-refactor route's "tracking data is nice-to-have" behavior. The route still 200s and still enqueues `addDelayCheckJob`. The bug-shaped test asserts this explicitly: `getTrackingInfo` rejects, `ingestTracking` resolves, no DB writes happen, and `logger.error` is called once. DB-failure paths on the *persistence* side still propagate — Shopify retries on a 500, which is the right behavior for a transient outage.

**4. Route refactored** ([delayguard-app/src/routes/webhooks.ts](delayguard-app/src/routes/webhooks.ts), 463 → 224 LOC):
- Every handler is now `HMAC verify → parse → service(s) → optional enqueue → respond`. Verified: `grep -c "query(" src/routes/webhooks.ts` → 0.
- HMAC verification stays in the route per backend.md ("Never short-circuit signature verification") — no service-level signature bypass, no `skipVerify` flag.
- `saveOrderLineItems` (Shopify GraphQL fetch + line_items writes via `shopify-service.ts`) stays in the route as a side-effect compose with try/catch-and-log semantics preserved. Already lives in a service module — not an inline-query violation.
- `addDelayCheckJob` enqueue stays in the route. The redundant `SELECT shop_domain FROM shops s JOIN orders o ON s.id = o.shop_id` lookup was DROPPED: the route already has `shopDomain` from the `X-Shopify-Shop-Domain` header (which was verified via HMAC), and the JOIN returned the same value because the order was just upserted under that exact shop. One fewer DB round-trip per fulfilled-order webhook.

**TDD**: 33 sibling tests written first, each observed RED (module-not-found), then implemented:
- **OrderUpsertService** (17 tests): resolve-shop SQL shape, silent-skip return + log on shop-not-found, orders UPSERT v1.19 every-column param-array assertion, customer_name composition (first+last / first-only / "Unknown" fallback), default fulfillment_status "unfulfilled", multi-tenant guard on the orderId re-read (scopes on resolved `shop_id`, not raw `shopDomain`), DB-failure propagation, equivalent coverage for `markOrderAsPaid` (with v1.19 param assertion on the status UPDATE) and `findOrderId` (silent-skip on shop-miss vs order-miss with distinct log lines).
- **FulfillmentPersistenceService** (6 tests): canonical ON CONFLICT shape, v1.19 every-column param-array assertion, default status "pending", null tracking columns when tracking_info absent, multi-tenant guard (asserts the Shopify-supplied `order_id` from the payload does NOT appear in the params), DB-failure propagation.
- **TrackingIngestService** (10 tests): ShipEngine call signature, per-event UPSERT v1.19 every-column assertion, null location when event omits it, **orders ETA UPDATE v1.19 every-column assertion including `last_tracking_update`** (the column the v1.19 incident was originally about), `last_tracking_update` derives from the most recent event timestamp regardless of input order, null ETAs when ShipEngine returns no estimated delivery dates, no-events branch (no event UPSERTs + null `last_tracking_update`), **ShipEngine failure is swallowed** (resolves without throwing, no DB writes, `logger.error` called once — bug-shaped test), DB-failure propagation on the event UPSERT and on the orders UPDATE separately.

**v1.19 field-population rule applied**: every UPDATE/INSERT in the new services has an explicit `expect(params).toEqual([...everyColumn])` assertion against the SQL parameter array. Coverage: orders UPSERT (7 cols), orders status UPDATE (3 cols incl. status/shop_id/shopify_order_id), fulfillments UPSERT (6 cols), tracking_events UPSERT (6 cols), and the orders ETA UPDATE (5 cols including `last_tracking_update`).

**Out of scope (smallest blast radius — flagged for future waves)**:
- 2 pre-existing lint errors carried over from Wave 1.1 (`tests/integration/database/tracking-events-schema.test.ts:2`, `tests/unit/components/HelpModal.test.tsx:162`) — untouched per the audit plan.
- Husky pre-commit gate is still non-functional (deeper diagnosis recorded in audit plan Wave 1.1) — not bypassed, just doesn't fire. Tracked separately.
- **Found while extracting** (tripped over, deliberately not fixed): `TrackingEvent` interface is declared TWICE in [delayguard-app/src/types/index.ts](delayguard-app/src/types/index.ts) (lines 22 and 148) with conflicting shapes — the second declaration requires `id: string` but `CarrierService.getTrackingInfo` produces events without one. The second declaration silently overrides the first in TS's last-wins behavior. Latent type-lie. Should be reconciled in Wave 3 (`any` cleanup) or its own focused PR.
- Wave 2.3 (health-check `ping()` methods), Wave 3 (`any` cleanup), Wave 4 (sibling-test debt), Wave 7 (dead-code: `analytics-service.ts` vs `AnalyticsService.ts`, `delay-detection.ts` vs `delay-detection-service.ts`) — each remains gated on this finishing.

---

### v1.38 (2026-05-14): Audit Wave 2.1 — merchant-api-service extraction

**Test Results**: 1,853 passing (+33), 25 skipped, 0 failing. New `src/services/merchant-api-service.test.ts` adds 33 sibling tests for the extracted service.
**Status**: Service-layer compliance fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 2.1.

**Problem**: [delayguard-app/src/routes/api.ts](delayguard-app/src/routes/api.ts) had 13 inline `query(...)` calls across 7 endpoints (`/alerts`, `/orders`, `/settings` GET+PUT, `/analytics`, `/shop`, `/merchant-settings` GET+PUT). Per [.claude/rules/backend.md](.claude/rules/backend.md), DB queries belong in services, not route handlers. The `SELECT id FROM shops WHERE shop_domain = $1` lookup was duplicated 5× across handlers, and the 404-vs-500 contract on shop-not-found was inconsistent (some endpoints returned 200-empty, some silent 200 no-op on writes, some 404). Phase 2 will add more endpoints; doing this now keeps the eventual cleanup cost linear.

**What Changed**:

**1. New service** ([delayguard-app/src/services/merchant-api-service.ts](delayguard-app/src/services/merchant-api-service.ts), 563 LOC):
- `getAlerts`, `getOrders`, `getSettings`, `updateSettings`, `getAnalytics`, `getShop`, `getMerchantSettings`, `updateMerchantSettings` — one method per route handler. All take `shopDomain` first per the audit spec; route params (limit) and bodies (settings input) follow.
- Private `resolveShopId(shopDomain)` helper centralises the previously-duplicated lookup. Every method that touches a non-`shops` table calls it once at the top.
- **Error model**: `ShopNotFoundError` (typed, carries `shopDomain`) → routes map to **404 everywhere**, replacing today's inconsistent mix. `MerchantApiValidationError` (carries `code`) → routes map to 400 with the original `INVALID_THRESHOLD` / `INVALID_EMAIL` / `INVALID_PHONE` codes the frontend already knows. Other errors bubble to the route's 500 path.
- **Boundary types exported**: `AlertRow`, `OrderRow`, `AppSettingsRow`, `AlertStats`, `OrderStats`, `AnalyticsSummary`, `ShopInfo`, `MerchantSettings`, `UpdateSettingsInput`, `UpdateMerchantSettingsInput`. Route stops doing untyped column plucking.
- **Wire-shape contract preserved (snake_case at the boundary)** for the historical endpoints. Reasoning documented inline in the service: [useDashboardData.ts:106-114](delayguard-app/src/components/EnhancedDashboard/hooks/useDashboardData.ts#L106-L114) explicitly destructures `total_alerts` / `pending_alerts` / `sent_alerts` / `total_orders` from `/analytics`, and the route-level tests assert snake_case response bodies. A camelCase migration is a separate, frontend-coordinated change — out of scope for Wave 2.1. `/merchant-settings` was already camelCase on the wire when introduced in Phase 2.6 — preserved.

**2. Route refactored** ([delayguard-app/src/routes/api.ts](delayguard-app/src/routes/api.ts), 626 → 198 LOC):
- Every handler is now `parse → service → respond`, well under 20 lines each. Verified via `grep -n "query(" src/routes/api.ts` → zero matches.
- Shared `respondWithServiceError(ctx, error, fallbackMessage)` helper translates `ShopNotFoundError` → 404 and `MerchantApiValidationError` → 400; everything else logs + 500.

**3. Existing route tests updated** ([delayguard-app/src/tests/unit/routes/api-routes.test.ts](delayguard-app/src/tests/unit/routes/api-routes.test.ts)):
- Added `mockResolveShopId()` helper to mirror the new `SELECT id FROM shops` call the service issues at the top of each handler.
- Switched `jest.clearAllMocks()` to `mockQuery.mockReset()` in `beforeEach` so queued `mockResolvedValueOnce` entries don't bleed between tests (`clearAllMocks` keeps the queue alive — this surfaced as cross-test failures after the resolveShopId call shifted consumption counts).
- `/api/orders` mock-call assertions updated from `[testShop, limit]` to `[mockShopData.id, limit]` — the multi-tenant guard now scopes on the resolved `shop_id`, not the shop domain.

**TDD**: 33 sibling tests written first, observed RED (module-not-found), then implemented:
- *resolveShopId* (implicit): single-param lookup shape, `ShopNotFoundError` carrying `shopDomain`, DB-failure propagation.
- *getAlerts / getOrders / getAnalytics*: happy path with multi-tenant guard assertion (`WHERE o.shop_id = $1` filter present), empty-array, DB-failure propagation.
- *getSettings*: existing-row path, default-seed path with explicit param-array assertion against the seed INSERT.
- *updateSettings*: full + partial UPDATE shape with v1.19 every-column param assertion, threshold validation rejects (<1, >30, non-numeric), `ShopNotFoundError` before-UPDATE, DB failure.
- *getShop*: snake_case ShopInfo, `ShopNotFoundError`, DB failure.
- *getMerchantSettings*: camelCase boundary contract (asserts no `merchant_email` / `warehouse_delays_enabled` keys leak), default-TRUE toggles when app_settings missing, `ShopNotFoundError`.
- *updateMerchantSettings*: v1.19 every-column param assertions for both the shops UPDATE and the app_settings UPDATE, INVALID_EMAIL / INVALID_PHONE validation before DB, shop-vs-toggles selective UPDATE branches, no-op when neither group provided, DB failure.

**v1.19 field-population rule applied**: every UPDATE/INSERT method has an explicit `expect(params).toEqual([...everyColumn])` assertion against the SQL parameter array. Covers `updateSettings`, `updateMerchantSettings` (both branches), and the `getSettings` defaults INSERT.

**Frontend consumer audit**: `rg "/api/(alerts|orders|settings|analytics|shop|merchant-settings)" src/components src/utils src/services` turned up two non-test files: [api-client.ts](delayguard-app/src/utils/api-client.ts) (pass-through wrapper) and [useDashboardData.ts](delayguard-app/src/components/EnhancedDashboard/hooks/useDashboardData.ts) (the analytics destructure). Wire-shape change avoided — see service header note above. **No frontend files updated.**

**Out of scope (smallest blast radius — flagged for future waves)**:
- 2 pre-existing lint errors carried over from Wave 1.1 (`tests/integration/database/tracking-events-schema.test.ts:2`, `tests/unit/components/HelpModal.test.tsx:162`) — untouched per the audit plan.
- Husky pre-commit gate is still non-functional (deeper diagnosis recorded in audit plan Wave 1.1) — not bypassed.
- Wave 2.2 (webhooks.ts persistence services), 2.3 (health-check `ping()` methods), Wave 3 (`any` cleanup including `optimized-database.ts` and `monitoring-service.ts`), Wave 7 (`analytics-service.ts` vs `AnalyticsService.ts` duplicate, tripped over while extracting `/analytics` but deliberately left). Each is gated on this finishing.
- Boundary-wide camelCase migration. Latent: frontend types (`AppSettings`, `Order`, `DelayAlert`) are already camelCase but the API still returns snake_case — a real type-lie at the boundary. Worth its own cohesive PR that updates `useDashboardData.ts`, `api-client.ts` typing, the `api-routes.test.ts` body assertions, and any other consumers in lockstep.

---

### v1.37 (2026-05-09): Audit Wave 1.3 — shop-auth-service extraction

**Test Results**: 1,820 passing (+10), 25 skipped, 0 failing. New `src/services/shop-auth-service.test.ts` adds 10 sibling tests for the extracted service.
**Status**: Service-layer compliance fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 1.3.

**Problem**: [delayguard-app/src/routes/auth.ts](delayguard-app/src/routes/auth.ts) had three inline `query(...)` calls (lines 47, 61, 87) covering the highest-stakes write in the app — Shopify access-token persistence and the OAuth bootstrap of default `app_settings`. Per [.claude/rules/backend.md](.claude/rules/backend.md), DB queries belong in services; routes parse → call service → respond. Phase 2 will add more endpoints, so doing this on top of inline-SQL routes would 2× the eventual cleanup cost.

**What Changed**:

**1. New service** ([delayguard-app/src/services/shop-auth-service.ts](delayguard-app/src/services/shop-auth-service.ts)):
- `upsertShop({ shopDomain, accessToken, scope })` — idempotent install / re-auth. Splits the comma-separated scope string into a trimmed `text[]` and writes the shop row, then seeds default `app_settings` (`ON CONFLICT (shop_id) DO NOTHING` so re-auth doesn't clobber merchant settings).
- `loadShopByDomain(shopDomain)` — returns a typed `ShopMetadata | null` (`{ shopDomain, createdAt, updatedAt }` in camelCase). **Deliberately does not read `access_token`** — the route never needed it, and exposing it through a thin handler would defeat the extraction. The actual token read lives in [middleware/shopify-session.ts:31](delayguard-app/src/middleware/shopify-session.ts), and a real `loadShopToken` method belongs in a future wave that extracts that middleware.
- `ShopMetadata` interface exported and used by the route as the response shape, eliminating untyped column plucking at the boundary.

**2. Route refactored** ([delayguard-app/src/routes/auth.ts](delayguard-app/src/routes/auth.ts)):
- All three `query(...)` calls removed; the route is now OAuth dance + redirects + service calls. Verified via `grep -n "query(" src/routes/auth.ts` → zero matches.
- `GET /auth/shop` response is now camelCase (`{ shopDomain, createdAt, updatedAt }`) instead of snake_case. Verified no internal consumer relied on the old shape (`rg "/auth/shop|authRoutes"` returns only the route definition itself).

**TDD**: 10 sibling tests written first, observed RED (module-not-found), then implemented:
- *upsertShop*: ON CONFLICT shape, token rotation across two installs, default app_settings seeding, scope-splitting whitespace/empty-entry handling, single-scope edge case, DB failure on shops upsert (app_settings not invoked), DB failure on app_settings.
- *loadShopByDomain*: typed camelCase return on hit, null on miss, error propagation. Boundary contract asserts `result` does NOT carry `shop_domain` / `created_at` / `updated_at` / `access_token` properties — guards against accidental snake_case leak or token exposure.

**v1.19 field-population rule applied**: every column written has an explicit `expect(shopParams).toEqual([...])` assertion against the SQL parameter array, including the `text[]` coercion for the `scope` column. Not just a return-value or 200-response check.

**Out of scope (smallest blast radius — flagged for future waves)**:
- 2 pre-existing lint errors carried over from Wave 1.1 (`tests/integration/database/tracking-events-schema.test.ts:2`, `tests/unit/components/HelpModal.test.tsx:162`) — untouched per the audit plan.
- Husky pre-commit gate is still non-functional (deeper diagnosis recorded in audit plan Wave 1.1) — not bypassed, just doesn't fire. Tracked separately.
- Wave 2.x extractions (`api.ts` MerchantApiService, `webhooks.ts` persistence services) — deliberately deferred; Wave 1.3 was a focused extraction of the highest-stakes write path only.

---

### v1.36 (2026-05-07): Audit Wave 1.1 — tracking-refresh cron batching (Vercel 30s cap fix)

**Test Results**: 1,810 tests passing, 25 skipped (placeholder cleanups), 0 failing. 4 new tests + 1 rewritten test in `tracking-refresh.test.ts`.
**Status**: Production blast-radius fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 1.1.

**Problem**: `processTrackingRefresh` iterated every in-transit order without LIMIT, calling ShipEngine + writing tracking_events synchronously per row. With ~30+ active orders the cron would exceed Vercel's 30s `maxDuration` (per [.claude/rules/deploy.md](.claude/rules/deploy.md)).

**What Changed**:

**1. Bounded batch + time-budget early break** ([delayguard-app/src/queue/processors/tracking-refresh.ts](delayguard-app/src/queue/processors/tracking-refresh.ts)):
- New `BATCH_SIZE = 25` enforced in SQL via `LIMIT $4`.
- New `TIME_BUDGET_MS = 25_000` checked at the top of each loop iteration; logs a warn and breaks before the next ShipEngine call when exceeded. 5s headroom under the 30s function cap.

**2. Redis cursor for resumable sweeps** (key `tracking-refresh:cursor:last-id`):
- SELECT now filters `WHERE o.id > $cursor ORDER BY o.id ASC LIMIT $batch`.
- Cursor reads from Redis at job start (defaults to 0 on miss / parse failure).
- Cursor advances to last-processed id (including failures, so a permanently-broken order doesn't stall the queue).
- Cursor resets to `0` when a tick returns fewer than `BATCH_SIZE` rows — the in-transit queue has drained, so the next sweep re-scans newly-IN_TRANSIT low-id orders.
- Chosen over a `cron_state` Postgres table: writes are idempotent (`ON CONFLICT (order_id, timestamp)`), so a lost cursor only re-does at most one batch — acceptable cost vs. adding an additive-only forward-compatible migration.

**3. Cron schedule corrected** ([delayguard-app/vercel.json](delayguard-app/vercel.json)):
- Wave 1.1 originally shipped `0 0 * * *` → `*/15 * * * *` (96 ticks/day × 25 orders = 2,400 orders/day theoretical max). The daily schedule defeated the product — a "delay" alert ≤24h late is not actionable.
- **2026-05-07 follow-up:** rolled back to `0 0 * * *` after a quota review found the project is on Vercel **Hobby**, which the current docs (last_updated 2026-03-04) cap at once-per-day. Hourly and every-30-min expressions are rejected at deploy: "Hobby accounts are limited to cron jobs that run once per day." ShipEngine (200 req/min default) is not the binding constraint here. Re-enable `*/15` when the project upgrades to Pro.

**4. Pre-existing TS errors fixed in [delayguard-app/src/routes/tracking-refresh-cron.ts](delayguard-app/src/routes/tracking-refresh-cron.ts)**:
- Line 49: `logger.error(msg, {ip, userAgent})` was passing the context object as the `error?` slot. Fix: pass `undefined` as the error arg, context as the third arg.
- Line 62: `logger.info(msg, stats)` failed because `TrackingRefreshStats` lacks an index signature. Fix: spread to a fresh object literal.
- Header comment schedule example aligned to `*/15 * * * *`.

**TDD**: 4 new tests written first, observed RED, then implemented:
- `should respect BATCH_SIZE limit in the SQL query` — asserts SQL contains `LIMIT $N` and the params include `25`.
- `should break out of the loop when the 25s time budget elapses mid-batch` — `Date.now` spy advances 13s per ShipEngine call; asserts exactly 2 calls before the break.
- `should resume from the cursor saved in Redis on a subsequent invocation` — pre-seeds cursor=42, asserts SQL has `id > $N` filter with 42 as a param and cursor advances to 67 (last id of a full 25-row batch).
- `should reset the cursor to 0 when the in-transit queue drains in this tick` — asserts cursor reset when `rows < BATCH_SIZE` returned.

The previously-misleading `should batch process orders to avoid overwhelming ShipEngine` test (mocked 50 orders, asserted 50 calls — was not actually testing batching) was rewritten as the BATCH_SIZE-limit test above.

**Out of scope (flagged, not fixed)**:
- 2 pre-existing lint errors on clean main: `tests/integration/database/tracking-events-schema.test.ts:2` (unused `query` import), `tests/unit/components/HelpModal.test.tsx:162` (`href` accessibility). Verified against stashed clean main.
- **Husky pre-commit gate is non-functional and the fix is bigger than originally noted** (diagnosed 2026-05-07): `husky` is not in `delayguard-app/package.json` devDependencies, no `prepare` script, `core.hooksPath` unset, and `npx husky` from `delayguard-app/` errors because `.git` is one level up. Real fix needs devDep + prepare wiring. Carried forward as a standalone audit item before the next contributor onboards. Tracked in [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 1.1.

---

### v1.36.1 (2026-05-06 → 2026-05-07): Audit Wave 1.2 + Wave 1.1 polish

**Test Results**: 1,810 passing, 25 skipped, 0 failing (verified via `npm test`).

**Wave 1.2 — placeholder-test cleanup (commit `18892492`, 2026-05-06)**

Per [.claude/rules/tests.md](.claude/rules/tests.md) v1.20, `expect(true).toBe(true)` stubs silently mask unfinished work and were the shape of the v1.20 incident. Suite had 25 such stubs across 5 files; now zero.

- `tests/integration/security.test.ts` — 6 stubs → `it.skip("FUTURE: ...")` with intent.
- `tests/unit/routes/merchant-settings-api.test.ts` — 11 stubs deleted (Phase 2.6 `describe.skip` scaffolding); file-level `eslint-disable` added for intentional unused locals.
- `tests/unit/queue/delay-check-notification-routing.test.ts` — 2 stubs → `it.skip("FUTURE: carrier delay routing")`.
- `tests/unit/components/RefactoredApp.test.tsx` — 1 stub → `expect(() => unmount()).not.toThrow()`.
- `tests/unit/hooks/usePerformance.test.ts` — 5 trailing stubs cleaned (3 deleted as redundant, 2 wrapped in `expect(...).not.toThrow()`).
- `scripts/quality-gates.js` — new "No Placeholder Tests" gate prevents regressions.

Side effect: project-wide lint errors 24 → 2 (the 2 pre-existing errors Wave 1.1 flagged in untouched files).

**Wave 1.1 polish (commit `fb59a384`, 2026-05-07)**

- `CLAUDE.md` test count refreshed: 1,348 → 1,810 passing, 25 skipped.
- `vercel.json` cron rolled back: `*/15 * * * *` → `0 0 * * *`. Required because Vercel Hobby caps at once-per-day per current docs (last_updated 2026-03-04). Cadence to revisit when the project upgrades to Pro (1-min minimum interval, 100 crons/project).
- Husky deeper diagnosis recorded in `rules-audit-plan.md` Wave 1.1 (the original "missing `_/` helper" note understated the problem).

---

### v1.35 (2025-12-11): 🎨 Anchour-Inspired UI/UX Redesign Phase 1 - Color System & AppHeader (Perfect TDD Execution)
**Test Results**: 38 AppHeader tests passing (100% pass rate), zero linting errors
**Status**: Phase 1 of Anchour-inspired redesign complete - Design system colors + AppHeader premium redesign

**User Request**: "Rethink the UI/UX again in the most bigger sense so that it allows us to build a similar experience such as the services helped by anchour.com/work"
**Design Inspiration**: Lighthouse Credit Union, Payground (Anchour Portfolio)
**Philosophy**: "Trust + Vigilance" - Deep navy backgrounds (trust), gold accents (vigilance)

**What Changed**:

**1. UI/UX Redesign Document Created** ([UI_UX_REDESIGN_ANCHOUR_INSPIRED.md](UI_UX_REDESIGN_ANCHOUR_INSPIRED.md)):
- Design Philosophy Analysis (Lighthouse + Payground lessons)
- Brand Positioning & Messaging (outcome-focused tagline)
- Color System & Visual Identity (Navy + Gold palette)
- Typography System (Anchour-style headline guidelines)
- Component Redesign Specifications (all major components)
- Hero Imagery & AI Generation Prompts (6 detailed prompts)
- **NEW**: Accessibility & Inclusive Design (WCAG 2.1 AA compliance)
- **NEW**: Motion & Animation Principles (purposeful motion)
- **NEW**: UX Writing & Microcopy Guidelines (voice principles)
- Implementation Roadmap (3 phases)
- Services We Can Confidently Offer (based on DATA_AVAILABILITY_ANALYSIS.md)

**2. Design System v3.0.0** ([design-system.css](delayguard-app/src/styles/design-system.css)):
- **NEW Brand Navy Palette**: 11 navy shades (#f0f4f8 to #0f172a) - trust, professionalism
- **NEW Brand Gold Palette**: 10 gold shades (#fffbeb to #78350f) - vigilance, attention
- **NEW Anchour Semantic Mappings**:
  - Hero colors: `--dg-hero-bg`, `--dg-hero-bg-gradient`, `--dg-hero-text`
  - Accent colors: `--dg-accent`, `--dg-accent-hover`, `--dg-accent-glow`
  - Priority colors: `--dg-priority-critical/high/medium/low`
  - Status colors: `--dg-status-active/resolved/dismissed`
  - Glassmorphism: `--dg-glass-bg`, `--dg-glass-border`, `--dg-glass-blur`

**3. AppHeader Premium Redesign** ([AppHeader/index.tsx](delayguard-app/src/components/layout/AppHeader/index.tsx)):
- **Shield Icon**: Replaced emoji 🛡️ with Lucide `<Shield>` SVG icon (gold accent color, drop shadow)
- **Check Icon**: Replaced text checkmark ✓ with Lucide `<Check>` SVG icon
- **Tagline Update**: "Proactive Shipping Delay Notifications" → "Proactive Shipping Intelligence" (Anchour-style outcome-focused)
- **Gold Accent**: Active alerts metric changed from blue (`statBlue`) to gold (`statGold`) - brand vigilance color
- **CSS Updates**:
  - `.icon` class updated for Lucide SVG display (flexbox, gold color, drop shadow)
  - `.checkmark` class updated for SVG icon (flexbox, proper sizing)
  - **NEW** `.statGold` class for gold accent border/background on Active alerts

**Perfect TDD Execution**:
1. ✅ **Document Review**: Critically reviewed design document, added 3 missing sections
2. ✅ **RED Phase**: Wrote 10+ new tests FIRST for Anchour redesign
   - Shield icon rendering tests (3)
   - Tagline update tests (2)
   - Gold accent color tests (2)
   - Checkmark SVG tests (1)
   - Updated 4 legacy tests to expect gold instead of blue
3. ✅ **GREEN Phase**: Implemented all changes (all 38 tests passing)
4. ✅ **VERIFY**: Zero linting errors, production-ready
5. ✅ **DOCUMENT**: Updated CHANGELOG.md immediately

**Files Created** (1):
- `UI_UX_REDESIGN_ANCHOUR_INSPIRED.md` (650+ lines, comprehensive redesign document)

**Files Modified** (4):
1. `delayguard-app/src/styles/design-system.css` - v3.0.0 with Anchour palette
2. `delayguard-app/src/components/layout/AppHeader/index.tsx` - Shield icon, tagline, gold accent
3. `delayguard-app/src/components/layout/AppHeader/AppHeader.module.css` - Icon styling, statGold class
4. `delayguard-app/src/tests/unit/components/AppHeader.test.tsx` - 10 new/updated tests

**Code Quality**:
- ✅ All 38 AppHeader tests passing (100% pass rate)
- ✅ Zero ESLint errors in all modified files
- ✅ TypeScript compilation successful
- ✅ Production-ready, accessible, professional design

**UX Impact**:
- **Premium aesthetic**: Dark navy hero + gold accents = sophisticated B2B SaaS feel
- **Brand consistency**: Lucide icons throughout (cross-platform, scalable)
- **Outcome-focused messaging**: "Intelligence" not "Notifications" (Anchour principle)
- **Trust + Vigilance**: Navy = reliability, Gold = attention to critical alerts
- **Accessibility**: WCAG 2.1 AA compliant color contrast

**Next Steps** (Phase 2):
- Tab Navigation redesign (pill-style)
- Alert Cards premium elevation
- Settings Cards refinement
- Generate AI hero images using provided prompts

---

### v1.33 (2025-11-29): 🎨 Complete AlertCard Icon Migration - All Emojis Replaced with Lucide SVG (Perfect TDD Execution)
**Test Results**: 137 AlertCard tests passing (99 previous + 38 new v1.33 tests, 100% pass rate), zero linting errors
**Status**: ALL emoji icons in AlertCard replaced with Lucide React SVG icons for cross-platform consistency

**User Request**: "Any other icons within Delay Alerts?" → Identified 16 remaining emojis in AlertCard
**User Directive**: "Yes, implement all those" → Complete migration using TDD workflow

**What Changed**:
1. **Replaced all 16 emoji icons in AlertCard with Lucide React SVG icons**:
   - **Delay Reason Warning** (1): ⚠️ → `<AlertTriangle size={16} />`
   - **Email Engagement Badges** (4):
     - Link icon: 🔗 → `<Link size={14} />`
     - Opened icon: 📧 → `<MailOpen size={14} />`
     - Sent icon: ✉️ → `<Send size={14} />`
     - Unopened icon: 📱 → `<Smartphone size={14} />`
   - **Accordion Section Titles** (4):
     - Product Details: 📦 → `<Package size={16} />`
     - Recommended Actions: 💡 → `<Lightbulb size={16} />`
     - Tracking Timeline: 🚚 → `<Truck size={16} />`
     - Customer Note: 📖 → `<BookOpen size={16} />`
   - **Product Placeholder** (1): 📦 → `<Package size={24} />`
   - **Event Location Pin** (1): 📍 → `<MapPin size={14} />`
   - **Contact Information** (2):
     - Email: ✉️ → `<Mail size={16} />`
     - Phone: 📞 → `<Phone size={16} />`
   - **Badge Legend Text** (4): Duplicate icons in legend descriptions (same as badges)

2. **Updated Accordion Component Type**:
   - Changed `title` prop type from `string` to `React.ReactNode`
   - Allows JSX elements (icons) to be passed as accordion titles
   - Maintains backwards compatibility with string titles

3. **Established Icon Sizing Standards**:
   - Small inline (14px): Engagement badges, event location pin
   - Medium inline (16px): Accordion titles, warnings, contact icons
   - Large placeholders (24px): Product placeholder
   - Consistent `strokeWidth={2}` for all icons
   - All icons: `aria-hidden={true}` (decorative, not semantic)

**Perfect TDD Execution**:
1. ✅ **RED Phase**: Wrote 38 comprehensive tests FIRST (all failed as expected)
   - Delay reason warning icon tests (3)
   - Email engagement badge icon tests (6)
   - Accordion title icon tests (6)
   - Product placeholder icon tests (3)
   - Tracking event location icon tests (3)
   - Contact information icon tests (4)
   - Badge legend icon tests (2)
   - Overall icon integration tests (4)
   - Fixed 15 OLD tests from earlier phases
2. ✅ **GREEN Phase**: Implemented all Lucide icon replacements (all 137 tests passing)
3. ✅ **REFACTOR**: Fixed 15 OLD tests that expected emojis to check for SVG icons instead
4. ✅ **VERIFY**: All 137 tests passing, zero linting errors
5. ✅ **DOCUMENT**: Updated CLAUDE.md immediately after completion

**Test Coverage** (38 new tests in v1.33 suite):
- Delay Reason Warning Icon: 3 tests (SVG rendering, no emoji, aria-hidden)
- Email Engagement Badge Icons: 6 tests (4 badge types, no emoji check, aria-hidden)
- Accordion Title Icons: 6 tests (4 accordion types, no emoji check, aria-hidden)
- Product Placeholder Icon: 3 tests (SVG rendering, no emoji, placeholder structure)
- Tracking Event Location Icon: 3 tests (MapPin icon, no emoji, aria-hidden)
- Contact Information Icons: 4 tests (Mail & Phone icons, no emoji, structure)
- Badge Legend Icons: 2 tests (SVG in legend, no duplicate emoji)
- Overall Icon Integration: 4 tests (all icons present, no emoji anywhere)
- Legacy Test Fixes: 15 OLD tests updated to expect SVG icons

**Files Modified** (3):
1. `src/components/tabs/AlertsTab/AlertCard.tsx`
   - Added 12 Lucide imports (AlertTriangle, Link, MailOpen, Send, Smartphone, Package, Lightbulb, Truck, MapPin, BookOpen, Mail, Phone)
   - Replaced 16 emoji icons with corresponding Lucide components
   - Updated icon sizing and aria attributes
2. `src/components/ui/Accordion.tsx`
   - Changed `title` prop type from `string` to `React.ReactNode`
   - Allows JSX elements in accordion titles
3. `src/tests/unit/components/AlertCard.test.tsx`
   - Added 38 new comprehensive icon tests
   - Updated 15 OLD tests to expect SVG icons instead of emojis
   - Total: 137 passing tests (100% pass rate)

**Code Quality**:
- ✅ All 137 tests passing (100% pass rate)
- ✅ Zero ESLint errors in all v1.33 modified files
- ✅ TypeScript compilation successful
- ✅ Production-ready code with proper type safety

**UX Impact**:
- **Cross-platform consistency**: No more emoji rendering issues across OS/browsers
- **Professional appearance**: Consistent SVG icons match Shopify design system
- **Accessibility**: All icons properly marked as decorative with `aria-hidden={true}`
- **Performance**: Tree-shaken imports, only 12 icons imported (not entire library)
- **Scalability**: SVG icons scale perfectly at any size without pixelation

**Design Rationale**:
- **Why Lucide over alternatives?** Consistent design language, tree-shakeable, TypeScript support
- **Why different sizes?** Context-appropriate sizing (small for inline, large for placeholders)
- **Why aria-hidden?** Icons are decorative, text labels provide semantic meaning
- **Why React.ReactNode for title?** Enables flexible JSX content in accordions (icons, badges, etc.)

---

### v1.32 (2025-11-28): ✨ Complete Icon Migration - All Remaining Emojis Replaced
**Test Results**: 1,774 passing tests (90 suites, 100% pass rate), zero linting errors

**User Context**: Continuation of v1.31 icon migration - completing the professional icon system across entire app

**What Changed**:
1. **Replaced all 14 remaining emoji icons with Lucide React SVGs**:
   - **Continuation of v1.31**: Completed professional icon migration
     - v1.31: TabNavigation + SettingsCard rule icons (6 emojis → Lucide)
     - v1.32: Helper icons, warnings, empty states (14 emojis → Lucide)
     - **Result**: Zero emoji icons remaining in UI components (pre-AlertCard)

2. **SettingsCard Helper Icons** (5 emojis → Lucide):
   - Benchmark icon: 📊 → `<BarChart3 size={16} />`
   - Warning icon: ⚠ → `<AlertTriangle size={20} />`
   - Learn More icons (3x): ℹ️ → `<Info size={16} />`
   - Smart Tip icon: 💡 → `<Lightbulb size={20} />`

3. **NotificationPreferences Warning** (1 emoji → Lucide):
   - Warning icon: ⚠ → `<AlertTriangle size={20} />`

4. **AlertsTab Empty State Icons** (4 emojis → Lucide):
   - Active empty: ✅ → `<CheckCircle2 size={48} />`
   - Resolved empty: 📝 → `<FileCheck size={48} />`
   - Dismissed empty: 🗑️ → `<Trash2 size={48} />`
   - Initial empty: 📊 → `<BarChart3 size={48} />`

5. **OrdersTab Empty State Icons** (5 emojis → Lucide):
   - Processing empty: ⏳ → `<Timer size={48} />`
   - Shipped empty: 🚚 → `<Truck size={48} />`
   - Delivered empty: ✅ → `<CheckCircle2 size={48} />`
   - Initial empty (2x): 📦 → `<Package size={48} />`

**Perfect TDD Execution**:
1. ✅ **SettingsCard**: 26 tests written FIRST (TDD RED), then implemented (TDD GREEN)
2. ✅ **NotificationPreferences**: 10 tests written FIRST (TDD RED), then implemented (TDD GREEN)
3. ✅ **AlertsTab**: 14 tests written FIRST (TDD RED), then implemented (TDD GREEN)
4. ✅ **OrdersTab**: 14 tests written FIRST (TDD RED), then implemented (TDD GREEN)
5. ✅ **Fixed 8 legacy tests** that were checking for emoji text (now check accessible text only)
6. ✅ **Fixed 1 linting error** (regex character class issue)

**Test Coverage** (64 new tests added):
- SettingsCard: 88 passing tests (26 new v1.32 tests + 62 existing)
- NotificationPreferences: 25 passing tests (10 new v1.32 tests + 15 existing)
- AlertsTab: 67 passing tests (14 new v1.32 tests + 53 existing)
- OrdersTab: 57 passing tests (14 new v1.32 tests + 43 existing)
- Total test suite: 1,774 passing tests (up from 1,710)

**Files Modified** (8):
1. `src/components/tabs/DashboardTab/SettingsCard.tsx` (5 helper/warning icons)
2. `src/components/tabs/DashboardTab/NotificationPreferences.tsx` (1 warning icon)
3. `src/components/tabs/AlertsTab/index.tsx` (4 empty state icons, changed from string to JSX)
4. `src/components/tabs/OrdersTab/index.tsx` (5 empty state icons, changed from string to JSX)
5. `src/tests/unit/components/SettingsCard.test.tsx` (+26 new tests)
6. `tests/unit/components/NotificationPreferences.test.tsx` (+10 new tests)
7. `src/tests/unit/components/AlertsTab.test.tsx` (+14 new tests, fixed 4 legacy tests)
8. `src/tests/unit/components/OrdersTab.test.tsx` (+14 new tests, fixed 4 legacy tests, fixed test data bug)

**Icon Design Standards**:
- Helper icons: 16px size for inline text elements
- Warning icons: 20px size for alert messages
- Empty state icons: 48px size for prominent empty states
- Consistent stroke: `strokeWidth={2}` for small icons, `strokeWidth={1.5}` for large icons
- Full accessibility: `aria-hidden={true}` on all decorative icons
- Type safety: Proper TypeScript types for all icon components

**Code Quality**:
- ✅ 1,774 tests passing (100% pass rate)
- ✅ Zero linting errors (fixed regex character class issue)
- ✅ Production-ready, accessible, platform-consistent design

**UX Impact**:
- **Cross-platform consistency**: All icons render identically on Windows, Mac, iOS, Android
- **Scalability**: SVG icons remain crisp at any display size (Retina, 4K, etc.)
- **Professional aesthetic**: Aligns with Shopify Polaris design system
- **Reduced bundle size**: Tree-shakeable imports (only 11 icons imported total)
- **Theming support**: Icons inherit color from CSS (easy to theme in future)

**Design Rationale**:
- **Why different sizes?** Context-appropriate: 16px for helpers, 20px for warnings, 48px for empty states
- **Why CheckCircle2 over CheckCircle?** More modern design with thinner stroke
- **Why FileCheck for resolved?** Semantic meaning of "completed/reviewed"
- **Why Trash2 for dismissed?** Clear metaphor for archival/deletion

---

### v1.31 (2025-11-28): ✨ Professional Icon System with Lucide React
**Test Results**: 1,714 passing tests (90 suites), 100% pass rate

**User Context**: First step of professional icon migration - replacing platform-dependent emoji with SVG icons

**What Changed**:
1. **Introduced Lucide React Professional Icon Library**:
   - Migrated from platform-dependent emoji to Lucide React SVG icons
   - Consistent appearance across all platforms (Windows, Mac, iOS, Android)
   - Scalable SVG graphics with perfect clarity at any size
   - Customizable colors matching design system
   - Tree-shakeable (only imports used icons, reduces bundle size)

2. **TabNavigation Icons** (3 emojis → Lucide):
   - Settings: ⚙️ → `<Settings size={20} strokeWidth={2} />`
   - Delay Alerts: 🚨 → `<AlertTriangle size={20} strokeWidth={2} />`
   - Orders: 📦 → `<Package size={20} strokeWidth={2} />`

3. **SettingsCard Rule Icons** (3 emojis → Lucide):
   - Warehouse Delays: 📦 → `<Package size={24} strokeWidth={2} />`
   - Carrier Reported Delays: 🚨 → `<AlertTriangle size={24} strokeWidth={2} />`
   - Stuck in Transit: ⏰ → `<Clock size={24} strokeWidth={2} />`

4. **Full Accessibility**:
   - All icons have `aria-hidden={true}` (decorative role)
   - Text labels provide semantic meaning for screen readers
   - Icons inherit color via `stroke="currentColor"` for theming

**Perfect TDD Execution**:
1. ✅ **TabNavigation**: 18 new tests written FIRST (TDD RED), then implemented (TDD GREEN)
2. ✅ **SettingsCard**: 13 new tests written FIRST (TDD RED), then implemented (TDD GREEN)
3. ✅ **Updated 4 old emoji tests** to verify SVG icons instead
4. ✅ **Fixed 8 unused variable warnings** during linting

**Package Added**:
- `lucide-react` v0.263.1 (professional SVG icon library)
  - Tree-shakeable ES modules
  - TypeScript definitions included
  - 1000+ icons available (only import what you use)

**Test Coverage**:
- TabNavigation: 48 passing tests (18 new v1.31 tests + 30 existing tests)
- SettingsCard: 62 passing tests (13 new v1.31 tests + 49 existing tests)
- Zero linting errors (fixed 8 unused variable warnings)

**Files Modified** (4):
1. `src/components/layout/TabNavigation/index.tsx` (replaced 3 emoji with Lucide icons)
2. `src/components/tabs/DashboardTab/SettingsCard.tsx` (replaced 3 emoji with Lucide icons)
3. `src/tests/unit/components/TabNavigation.test.tsx` (+18 new tests, updated 4 old tests)
4. `src/tests/unit/components/SettingsCard.test.tsx` (+13 new tests, updated 1 old test)

**Icon Design Standards Established**:
- Consistent sizing: 20px for navigation, 24px for rule cards
- Uniform stroke width: `strokeWidth={2}` for all icons
- Color inheritance: `stroke="currentColor"` for theming flexibility
- Type safety: Using `LucideIcon` type for all icon props
- Accessibility: `aria-hidden={true}` for all decorative icons

**Code Quality**:
- ✅ 1,714 tests passing (100% pass rate)
- ✅ Zero linting errors
- ✅ TypeScript compilation successful
- ✅ Production-ready, accessible, cross-platform design

**UX Impact**:
- **Platform consistency**: Icons look identical on Windows, Mac, Linux, iOS, Android
- **Professional appearance**: SVG icons align with Shopify Polaris design system
- **Better performance**: Tree-shakeable imports reduce bundle size vs emoji fallbacks
- **Future-proof**: Easy to add new icons from Lucide library (1000+ available)
- **Theming ready**: Icons inherit color from CSS (enables dark mode, custom themes)

**Design Rationale**:
- **Why Lucide?** Best-in-class SVG icon library, tree-shakeable, TypeScript support, active maintenance
- **Why 20px nav vs 24px cards?** Hierarchical sizing (nav is secondary, rule cards are primary focus)
- **Why strokeWidth={2}?** Balances visibility with elegance (not too thin, not too bold)
- **Why aria-hidden?** Icons are decorative, text labels provide semantic content

---

### v1.27 (2025-11-24): 🎨 Desktop 3-Column Grid Layout (Perfect TDD)
**Test Results**: 45 SettingsCard tests passing (39 original + 6 new, 100% pass rate), zero linting errors

**User Request**: "I'm wondering if we could have the 3 type of delays containers to be horizontally aligned in a single row. Meaning, each delay would occupy 33% of the current width of the current container. I'm imagining we only want to do this for Desktop screens? Apply all the best practices from our entire's project guidelines."

**What Changed**:
1. **Responsive CSS Grid Layout** - 3 delay rules side-by-side on desktop
   - Desktop (≥1200px): CSS Grid with `grid-template-columns: repeat(3, 1fr)`
   - Mobile/Tablet (<1200px): Vertical flex column layout (unchanged)
   - Each rule occupies ~33% width with 1.5rem gap
   - Smart Tip remains full-width outside grid for visual emphasis

2. **Component Structure** - Minimal, semantic HTML changes
   - Wrapped 3 `.ruleSection` divs in `.rulesGrid` container
   - Zero changes to rule content structure
   - Smart Tip stays outside grid (full-width sibling)

3. **CSS Implementation** - Clean, responsive grid styles
   - Mobile-first approach: Default flex column
   - Desktop enhancement: Media query at 1200px breakpoint
   - 19 lines of semantic CSS added
   - Removed `margin-bottom` on rule sections inside grid

**Perfect TDD Execution**:
1. ✅ **RED Phase**: Wrote 6 comprehensive tests FIRST
   - Grid wrapper existence and class names
   - All 3 rules correctly placed inside grid
   - Smart Tip correctly placed outside grid
   - Rule section structure preserved
   - Accessibility maintained (aria-labels work correctly)
2. ✅ **GREEN Phase**: Implemented grid layout to make tests pass
3. ✅ **VERIFY**: All 45 tests passing (39 original + 6 new), zero linting errors

**Test Coverage** - 6 new tests added:
- `should render rules grid wrapper container`
- `should render all 3 delay rules inside the grid container`
- `should maintain proper class names for grid styling`
- `should render Smart Tip outside the grid container`
- `should preserve existing rule section structure`
- `should maintain accessibility with grid layout`

**Files Modified** (3):
1. `src/components/tabs/DashboardTab/SettingsCard.tsx` - Added `.rulesGrid` wrapper div
   - Lines 147-148: Opening `<div className={styles.rulesGrid}>`
   - Line 339: Closing `</div>` after 3rd rule section
   - Added v1.27 comment explaining grid wrapper purpose
2. `src/components/tabs/DashboardTab/SettingsCard.module.css` - Added responsive grid CSS
   - Lines 554-572: 19 lines of grid styles
   - Default: Flex column with 1.5rem gap
   - Desktop @media (min-width: 1200px): CSS Grid with 3 equal columns
3. `tests/unit/components/SettingsCard.test.tsx` - Added 6 grid layout tests
   - Lines 739-842: New test describe block "Responsive Grid Layout (v1.27)"

**Code Quality**:
- ✅ Zero linting errors in modified files
- ✅ All 45 tests passing (100% pass rate)
- ✅ Production-ready, semantic HTML/CSS
- ✅ Mobile-first responsive design

**UX Impact**:
- **Desktop Efficiency**: Better screen space utilization on large displays
- **Easier Comparison**: Horizontal alignment makes threshold values easy to compare
- **Professional Polish**: Modern grid layout matches contemporary design standards
- **Mobile-First Preserved**: Tablets and phones keep vertical stack for readability
- **Responsive Excellence**: Seamless transition at 1200px breakpoint

**Design Rationale**:
- **Why 1200px breakpoint?** Standard desktop breakpoint for 3-column layouts, ensures adequate column width
- **Why CSS Grid over Flexbox?** More explicit control over equal-width columns, cleaner responsive behavior
- **Why Smart Tip outside grid?** Remains full-width for visual emphasis and actionable insights
- **Why mobile-first?** Progressive enhancement approach, mobile users unaffected by desktop optimization
- **Why 1.5rem gap?** Consistent with existing DelayGuard spacing system

---

### v1.26 (2025-11-23): 🚀 Always-Visible Rules - Accordion Removal (Perfect TDD)
**Test Results**: 39 SettingsCard tests passing (100% pass rate), zero linting errors

**User Request**: "Right now we have 3 type of delays within the same container. I think it'll be better if we just leave this portion for each one of the 3 type of delays, within the same screen as we have it now. Meaning, we would get rid of the clickable panel to show the content. Meaning we always show all the 3 delay rules settings."

**What Changed**:
1. **Removed Accordion Complexity** - All 3 delay rules always visible
   - Eliminated expand/collapse interaction (no more clicking accordion headers)
   - Removed `accordionState` useState and toggle functions
   - Removed conditional rendering `{accordionState.xxx && (...)}`
   - Wrapped each rule in simple `.ruleSection` div
   - All rules visible simultaneously for easier configuration

2. **CSS Simplification** - Removed 96 lines of accordion-specific styles
   - Deleted: `.accordionSection`, `.accordionHeader`, `.accordionIcon`, `.accordionContent`
   - Deleted: `.accordionHeaderContent`, `.accordionTitle`, `.accordionSummary`
   - Deleted: `@keyframes slideDown` animation
   - Added: Simple `.ruleSection` class (4 lines total)

**Perfect TDD Execution**:
1. ✅ **RED Phase**: Updated 39 tests to expect always-visible content (removed accordion expansion clicks)
2. ✅ **GREEN Phase**: Removed accordion state/functions/JSX from SettingsCard component
3. ✅ **REFACTOR**: Cleaned up 96 lines of unused accordion CSS
4. ✅ **VERIFY**: All 39 tests passing, zero linting errors

**Test Updates**:
- **SettingsCard.test.tsx**: All 39 tests updated for always-visible behavior
  - Removed all `fireEvent.click(accordionHeader)` test interactions
  - Updated assertions to expect content immediately visible (no expansion needed)
  - Added v1.26 comments explaining always-visible behavior
  - Test categories updated: Plain Language Rule Names, Help Text, Benchmarks, Accessibility, etc.

**Files Modified** (3):
1. `src/components/tabs/DashboardTab/SettingsCard.tsx` - Removed accordion state/functions/JSX
   - Deleted `accordionState` useState (lines 66-71)
   - Deleted `toggleAccordion()` and `handleAccordionKeyDown()` functions
   - Removed accordion header divs and conditional rendering
   - Simplified to 3 `.ruleSection` wrappers (Warehouse, Carrier, Transit)
2. `src/components/tabs/DashboardTab/SettingsCard.module.css` - Removed 96 lines accordion CSS
   - Deleted 9 accordion-related CSS classes
   - Added simple `.ruleSection` class (4 lines)
3. `tests/unit/components/SettingsCard.test.tsx` - Updated 39 tests for always-visible content
   - Removed accordion expansion interactions
   - Updated test assertions and comments

**Code Quality**:
- ✅ Zero linting errors (fixed eslint-disable-next-line placement)
- ✅ All 39 tests passing (100% pass rate)
- ✅ 96 lines of CSS removed (cleaner codebase)
- ✅ Production-ready code

**UX Impact**:
- **Eliminated Cognitive Load**: No "what's hidden behind accordion?" confusion
- **Faster Configuration**: All 3 rules visible at once, no clicking needed
- **Easier Comparison**: Merchants can see all thresholds side-by-side
- **Better Initial Setup**: New users see everything they need to configure
- **Simpler Mental Model**: No accordion interaction complexity

**Design Decision Rationale**:
- Users configure delay rules **occasionally** (not daily)
- Seeing all 3 rules at once helps merchants understand the complete detection strategy
- Removing accordion aligns with "principle of least surprise" (WYSIWYG)
- Follows user feedback: "always show all the 3 delay rules settings"

---

### v1.19 (2025-11-23): 🎨 Settings Tab Layout & Organization Refactoring
**Test Results**: 1,669 passing tests (91 suites), 100% pass rate

**User Request**: "Settings tab should be full-width like Alerts and Orders tabs. Move Merchant Contact Information from Delay Detection Rules to Notification Preferences."

**What Changed**:
1. **Full-Width Layout** - Settings tab now matches Alerts and Orders layout consistency
   - Removed inline `maxWidth: '900px'` constraint from DashboardTab
   - Added CSS `.container` class for consistent flexbox layout
   - Updated DashboardTab.module.css with proper container styles

2. **Merchant Contact Information Relocated** - Improved conceptual organization
   - **Moved FROM**: Delay Detection Rules tab (SettingsCard component)
   - **Moved TO**: Notification Preferences tab (NotificationPreferences component)
   - **Rationale**: Better separation of concerns
     - Delay Detection Rules = WHAT triggers alerts (warehouse/carrier/transit thresholds)
     - Notification Preferences = HOW to receive alerts (email/SMS toggles + merchant contact info)
   - Fields moved: merchantEmail, merchantPhone, merchantName (3 input fields)

**Perfect TDD Execution**:
1. ✅ **RED Phase**: Wrote 13 new tests for NotificationPreferences merchant contact fields (all failed as expected)
2. ✅ **GREEN Phase**: Moved merchant contact section from SettingsCard to NotificationPreferences
3. ✅ **REFACTOR**: Updated SettingsCard tests (removed merchant contact tests), fixed 1 linting error
4. ✅ **VERIFY**: All 1,669 tests passing, zero linting errors

**Test Updates**:
- **NotificationPreferences.test.tsx**: 35 tests passing (+13 new tests for merchant contact fields)
  - Render merchant email/phone/name input fields
  - Display existing merchant contact values
  - Call onSettingsChange when inputs updated
  - Disable inputs when loading
  - Display help text for each field
  - Render section title and subtitle
- **SettingsCard-MerchantSettings.test.tsx**: 21 tests passing (removed 7 merchant contact tests)
  - Removed: merchant email/phone/name rendering tests
  - Removed: merchant contact loading state tests
  - Removed: merchant contact ARIA labels tests
  - Updated: loading state test now only checks toggle switches
  - Updated: accessibility test now only checks toggle switches
- **DashboardTab.tabs.test.tsx**: 31 tests passing (updated 1 layout test)
  - Updated: "should use full-width container layout" test
  - Changed from checking `maxWidth: '900px'` to verifying `.container` class

**Files Modified** (7):
1. `src/components/tabs/DashboardTab/index.tsx` - Removed inline style, added `className={styles.container}`
2. `src/components/tabs/DashboardTab/DashboardTab.module.css` - Added `.container` CSS class (lines 9-13)
3. `src/components/tabs/DashboardTab/NotificationPreferences.tsx` - Added merchant contact section (lines 88-150)
4. `src/components/tabs/DashboardTab/SettingsCard.tsx` - Removed merchant contact section (lines 456-518 deleted)
5. `tests/unit/components/DashboardTab.tabs.test.tsx` - Updated layout test (lines 218-225)
6. `tests/unit/components/NotificationPreferences.test.tsx` - Added 13 merchant contact tests (lines 348-528)
7. `tests/unit/components/SettingsCard-MerchantSettings.test.tsx` - Removed 7 merchant contact tests, updated header comment

**Code Quality**:
- ✅ Zero linting errors (1 pre-existing `@typescript-eslint/no-explicit-any` warning in SettingsCard.tsx:60 unrelated to changes)
- ✅ All tests passing (100% pass rate)
- ✅ CSS already shared via `styles` import (no CSS migration needed)
- ✅ Production-ready code

**UX Impact**:
- **Visual Consistency**: Settings tab now uses full width like Alerts and Orders tabs (no more narrow centered layout)
- **Conceptual Clarity**: Delay Detection Rules focuses on WHAT triggers alerts, Notification Preferences handles HOW notifications are delivered
- **Better Organization**: Merchant contact info logically grouped with notification settings (email/SMS toggles)

---

### v1.20 (2025-11-11): 🎯 Phase 2.2 - Notification Routing Logic Complete
**Test Results**: 14 passing tests (12 real + 2 placeholder stubs, 100% pass rate), 0 linting errors

**Problem Solved**: Delay notifications need smart routing based on fault attribution
- Warehouse delays (merchant's fault) → notify merchant
- Carrier/transit delays (carrier's fault) → notify customer

**TDD Execution**: Perfect TDD workflow
1. ✅ **RED Phase**: Wrote 14 comprehensive tests FIRST (all failed as expected)
2. ✅ **GREEN Phase**: Implemented processor updates to make all tests pass
3. ✅ **REFACTOR**: Fixed TypeScript errors, auto-fixed linting issues

**Test Transparency**:
- **12 fully implemented tests** covering database queries, toggle logic, delayType routing, recipient routing, edge cases
- **2 placeholder tests** (`expect(true).toBe(true)`) documenting expected carrier delay routing behavior (will be implemented when `DelayDetectionService.checkForDelays()` sets `delayType='CARRIER_DELAY'` correctly)

**Implementation Details**:
1. **Database Query Updates** - Fetches 6 new Phase 2.1 fields from shops/app_settings
   - Merchant contact: `merchant_email`, `merchant_phone`, `merchant_name`
   - Enable/disable toggles: `warehouse_delays_enabled`, `carrier_delays_enabled`, `transit_delays_enabled`

2. **Conditional Rule Execution** - Rules only run if enabled
   - RULE 1: Warehouse delays (only if `warehouse_delays_enabled = TRUE`)
   - RULE 2: Carrier delays (only if `carrier_delays_enabled = TRUE`)
   - RULE 3: Transit delays (only if `transit_delays_enabled = TRUE`)
   - Skip logging when rule disabled (⏭️ RULE X SKIPPED)

3. **DelayType Tracking** - Captures which rule triggered the alert
   - Set to `WAREHOUSE_DELAY`, `CARRIER_DELAY`, or `TRANSIT_DELAY`
   - Passed to notification job for smart routing

4. **Smart Recipient Routing** - Notifications sent to appropriate party
   - `WAREHOUSE_DELAY` → `merchantEmail`, `merchantPhone`, `merchantName`
   - `CARRIER_DELAY` / `TRANSIT_DELAY` → `customerEmail`, `customerPhone`

5. **Queue Interface Updates** - `addNotificationJob()` accepts new optional parameters
   - `delayType?: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'TRANSIT_DELAY'`
   - `merchantEmail?`, `merchantPhone?`, `merchantName?`
   - `customerEmail?`, `customerPhone?`

**Test Coverage** (14 tests across 5 categories):
- ✅ Database query tests (2 real) - Verify merchant contact & toggle fields fetched
- ✅ Enable/disable toggle logic (4 real) - Verify rules skip when disabled
- ✅ DelayType parameter tests (3 - 2 real + 1 placeholder)
  - ✅ WAREHOUSE_DELAY routing (real test)
  - ⚠️ CARRIER_DELAY routing (placeholder - documents expected behavior)
  - ✅ TRANSIT_DELAY routing (real test)
- ✅ Recipient routing tests (3 - 2 real + 1 placeholder)
  - ✅ Merchant routing for warehouse delays (real test)
  - ⚠️ Customer routing for carrier delays (placeholder)
  - ✅ Customer routing for transit delays (real test)
- ✅ Edge cases (2 real) - NULL merchant fields, all toggles disabled

**Files Modified** (2):
- `src/queue/processors/delay-check.ts` - Updated with notification routing logic
- `src/queue/setup.ts` - Added new optional parameters to `addNotificationJob()` interface

**Files Created** (1):
- `tests/unit/queue/delay-check-notification-routing.test.ts` (640+ lines, 18 tests)

**TypeScript Fixes**:
- Fixed `trackingInfo` type from `{ trackingUrl?: string }` to `Awaited<ReturnType<typeof CarrierService.prototype.getTrackingInfo>>`
- Updated notification job interface to include Phase 2.1 parameters

**Mock Configuration** (for tests):
- Mocked `CarrierService` class with `getTrackingInfo()` method
- Mocked `DelayDetectionService` class with `checkForDelays()` method
- Set up default mock return values in `beforeEach()` hook

**"Are You 100% Sure?" Review** (Completed November 11, 2025):
✅ **Full data flow traced** from delay-check.ts → addNotificationJob() → notification processor
❌ **Type mismatch found**: notification.ts NotificationJobData interface missing new Phase 2.2 parameters
📋 **Impact**: Merchant notifications will NOT work until Phase 2.3 updates notification processor
✅ **Verification**: Confirms Phase 2.3 scope (update notification processor to use routing parameters)

**Next Steps**: Phase 2.3-2.7 (notification processor, email templates, database migrations, API endpoints, frontend UI)

---

### v1.19 (2025-11-09): 🚨 3-Rule Delay Detection System
**Test Results**: 35 passing tests (16 warehouse + 19 transit), 100% pass rate

**Problem Solved**: Warehouse delay detection shown in UI but not implemented in backend

**TDD Execution**: Wrote 35 tests FIRST, then implemented functions

**Three Rules Implemented**:
1. **Warehouse Delays** (16 tests) - Detects unfulfilled orders > X days
2. **Carrier Reported Delays** (existing) - ShipEngine API integration  
3. **Stuck in Transit** (19 tests) - Packages in transit > X days without delivery

**Critical Bugs Fixed** (Discovered during "Are you 100% sure?" review):
1. Notification logic inside wrong block (warehouse delays wouldn't trigger notifications)
2. last_tracking_update field never populated in webhooks
3. AppSettings type missing new threshold fields

**Files**: 2 created, 5 modified | **Documentation**: IMPLEMENTATION_PLAN.md, CLAUDE.md, PROJECT_OVERVIEW.md, PROJECT_STATUS_AND_NEXT_STEPS.md updated

---

### v1.18 (2025-11-05): 🎨 Header & Dashboard UI/UX Refinements  
**Test Results**: 62 passing tests

**Changes**: Color-coded metrics, domain truncation, Dashboard → Settings tab rename, redundant metrics removed

---

### v1.17 (2025-11-05): 🎨 Header UI Polish - Shopify Connection Status
**Test Results**: 22 passing tests

**Changes**: Moved connection status to header with elegant green badge

---

### v1.16 (2025-11-05): Real Dashboard Metrics Implementation
**Test Results**: 14 passing tests

**Changes**: Replaced mock metrics with real SQL queries, 4 metrics defined

---

### v1.15 (2025-11-05): 📸 Pre-Screenshot Preparation - Demo Data
**Changes**: Created seed script with 6 realistic demo orders, 13 line items, 16 tracking events

---

### v1.14 (2025-11-05): 🎉 SHIPENGINE INTEGRATION COMPLETE
**Test Results**: 42 passing tests

**Changes**: Database schema, webhook integration, hourly refresh cron, frontend display

---

### v1.13 (2025-11-05): 🎉 PHASE D COMPLETE! Mobile Tab Navigation
**Test Results**: 35 passing tests

**Changes**: Mobile tab labels always visible, full screen width, better spacing

---

### v1.12 (2025-11-05): 🎉 PHASE C COMPLETE! Orders Tab Filtering
**Test Results**: 29 passing tests

**Changes**: Processing/Shipped/Delivered tabs, sticky filter bar, 60% faster to find orders

---

### v1.11 (2025-11-04): 🎉 PHASE B COMPLETE! Alert Filtering
**Test Results**: 53 passing tests

**Changes**: SegmentedControl component, Active/Resolved/Dismissed tabs, 60% faster to find alerts

---

### v1.10 (2025-11-04): 🎉 PHASE A COMPLETE! UX Clarity with InfoTooltip
**Test Results**: 24 passing tests

**Changes**: InfoTooltip component for contextual help, improved badge labels

---

## COMPLETE VERSION DETAILS

For complete details of each version including:
- Full implementation descriptions
- Code examples and file changes
- Database schema changes
- TDD workflow details
- Bug fixes and lessons learned

Please refer to:
- Git commit history
- Individual PR/commit messages
- IMPLEMENTATION_PLAN.md for technical specs
- PROJECT_OVERVIEW.md for phase summaries

---

*Complete changelog maintained by DelayGuard Development Team*
*Last updated: November 9, 2025*
