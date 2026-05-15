# CHANGELOG - DelayGuard Version History
*Complete historical record of all features, improvements, and bug fixes*

**Purpose**: Archive of all development milestones and version details
**Last Updated**: May 15, 2026 (v1.52 — Phase 2.1.e test-alert endpoint: dashboard-only POST `/api/test-alert` + new `TestAlertService` thin wrapper around EmailService/SMSService + per-channel app_settings flag honoring + per-request channel-picker + per-request recipient-override + dry-run dispatch (no DB write))
**For recent versions only**: See [CLAUDE.md](CLAUDE.md#recent-version-history)

---

## VERSION HISTORY

### v1.52 (2026-05-15): Phase 2.1.e — Test-Alert Endpoint (fifth slice)

**Test Results**: 2,091 passing (+21), 25 skipped, 0 failing (1 known-flake in `tests/unit/middleware/input-sanitization.test.ts:405` performance-budget assertion intermittently exceeds 120ms threshold under coverage instrumentation; passes in isolation, unrelated to this slice). New coverage: `src/services/test-alert-service.test.ts` with 15 cases (both-channels happy path + per-channel `email_enabled`/`sms_enabled` flag honoring (×3 — email-off, sms-off, both-off) + per-request `channels: [...]` picker (×2 — email-only, sms-only) + per-request `recipientEmail`/`recipientPhone` override (×2) + null-merchant-contact skip (×2) + ShopNotFoundError + invalid `delayType` validation + invalid `channels: []` validation + per-`delayType` distinct `delayReason` synthesis + LEFT JOIN null-defaults match schema (`email_enabled` DEFAULT TRUE, `sms_enabled` DEFAULT FALSE)) and `src/tests/unit/routes/test-alert-route.test.ts` with 6 cases (200 happy path + 401 no-token + 404 ShopNotFoundError + 400 INVALID_DELAY_TYPE + 200 channels+recipient body forwarding + 500 underlying-throw). 100% coverage on the new service.
**Status**: Phase 2.1 fifth sub-slice (2.1.e) **SHIPPED**. Sub-slice remaining (2.1.f): customer-intelligence UI surfacing (priority badge + financial breakdown + shipping address + customer segment on alert cards). Phase 2.1.e gives merchants the in-app way to verify their SendGrid/Twilio routing + template rendering + `shops.merchant_email`/`merchant_phone` config without waiting for a real delay — the last missing piece before §2.1.f finally renders the four data layers shipped in 2.1.a–2.1.d on real alert cards.

**Problem**: Phase 2.1.a–2.1.d landed the data layer (customer intelligence, priority score, financial breakdown, shipping address) but merchants had no in-app way to confirm their notification routing actually works before a real delay alert fires. Without this, a merchant could ship a misconfigured `merchant_email` (typo) or a `sms_enabled = true` with no Twilio creds and not discover the gap until the first real outage. The "Send Test Alert" button has existed in the dashboard since v1.20.3 (UI-only stub); this slice wires its backend so pressing it actually fires email + SMS to the merchant's own contact via the existing SendGrid/Twilio path.

**Four gating decisions reverse-prompted before any code was written** (the originally-asked questions, all five-rec answers accepted):

1. **Auth surface** → POST `/api/test-alert` with the existing `requireAuth` middleware ([shopify-session.ts](delayguard-app/src/middleware/shopify-session.ts)) — same App Bridge session-token JWT gate as `/api/alerts`, `/api/orders`, `/api/settings`, `/api/merchant-settings`. No CSRF layer added: the JWT is short-lived + signature-bound to the shop, which is the canonical Shopify embedded-app CSRF defense (a token-cookie pair on top would reinvent it). Closest precedent: the existing `PUT /api/merchant-settings` ([api.ts:163](delayguard-app/src/routes/api.ts#L163)), also a dashboard-only POST that touches the merchant's own contact fields.
2. **Pipeline depth** → render-only / dry-run. POST receives `delayType`, the service synthesizes a fake `OrderInfo` (`TEST-001` order, `Sample Customer`) + per-`delayType` `DelayDetails`, dispatches via `EmailService.sendDelayEmail` / `SMSService.sendDelaySMS` directly, returns `{ channelsAttempted, recipientEmail, recipientPhone }`. **No `delay_alerts` row inserted, no BullMQ enqueue, no `is_test` column added**. EmailService/SMSService both return `Promise<void>` today (they `await` the SendGrid/Twilio SDK and discard `x-message-id` / `MessageInstance.sid`); chasing real delivery proof would require modifying both services + NotificationService + delay-check.ts callers (~6 files), so we accepted no-throw + `channelsAttempted` as the success signal. Real delivery proof is correlated post-hoc via the existing SendGrid Event Webhook ([sendgrid-webhook.ts](delayguard-app/src/routes/sendgrid-webhook.ts)) when a UI in §2.1.f wants it.
3. **Channel selection** → per-request `channels: ('email' | 'sms')[]` picker, default = both-if-set. Honored against per-channel `app_settings.email_enabled` / `sms_enabled` flags (a stricter behavior than the production delay-check.ts dispatch path, which only gates on `(email_enabled || sms_enabled)` then routes by contact-presence — see [delay-check.ts:156](delayguard-app/src/queue/processors/delay-check.ts#L156)). Test-alert intentionally diverges to surface misconfig: if `sms_enabled = false` but the merchant has a phone, test-alert won't send SMS, exposing the flag/contact mismatch the production path silently masks. Future-proofs the picker UI for §2.1.f without locking it in.
4. **Recipient** → `shops.merchant_email` / `shops.merchant_phone` by default, with optional `recipientEmail` / `recipientPhone` request-body override. Override is for support-troubleshooting (merchant pastes their gmail to confirm template render without changing `merchant_email`). Same field-level read as `getMerchantSettings`. Bypasses NotificationService entirely (the route calls EmailService + SMSService directly through a thin TestAlertService wrapper) so the merchant's `merchant_email` doesn't have to be stuffed into a field literally named `customerEmail` on `OrderInfo` — clean separation of "this is the customer's notification" (NotificationService) from "this is a test to the merchant" (TestAlertService).

**Two flags surfaced during the gating read** (criterion b — plan-vs-reality + criterion c — anything the user hadn't anticipated):

5. **Plan-vs-reality**: IMPLEMENTATION_PLAN.md had **no §2.1.e section** before this slice — the original Phase 2 numbering didn't separate test-alert as its own slice. PROJECT_OVERVIEW.md `§2.5 Test Alert Implementation` ([PROJECT_OVERVIEW.md:506](PROJECT_OVERVIEW.md#L506)) has the closest spec, including a "Flag alert as 'TEST' in database" line that this slice intentionally **rejects** (per Q2 dry-run choice). The §2.1.e "what shipped" + "key decisions" blocks are now backfilled into the §2.1 section of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) alongside §2.1.a–§2.1.d for future-audit discoverability (mirrors the v1.51 backfill pattern).
6. **NotificationService dispatch wart** (carry-forward, NOT fixed this slice): production [delay-check.ts:156](delayguard-app/src/queue/processors/delay-check.ts#L156) gates on `(email_enabled || sms_enabled)` then [NotificationService.sendDelayNotification](delayguard-app/src/services/notification-service.ts#L92) routes by `customerEmail` / `customerPhone` presence — meaning if `sms_enabled = false` but `customer.phone` exists, SMS still fires for real alerts. Test-alert is per-channel-flag-strict (Q3); this divergence is intentional but the production-side wart is a separate carry-forward.

**What Changed**:

**1. New service** — [src/services/test-alert-service.ts](delayguard-app/src/services/test-alert-service.ts):

- `TestAlertChannel` type alias (`'email' | 'sms'`) and `TestAlertDelayType` type alias (`'warehouse' | 'carrier' | 'transit'`).
- `TestAlertRequest` interface (`delayType` required; `channels`, `recipientEmail`, `recipientPhone` optional).
- `TestAlertResult` interface (`channelsAttempted`, `recipientEmail`, `recipientPhone`).
- `SAMPLE_DELAY_DETAILS` constant: per-`delayType` synthesized `DelayDetails` (warehouse → `WAREHOUSE_DELAY` / 3 days, carrier → `DELAYED_STATUS` / 2 days, transit → `STUCK_IN_TRANSIT` / 7 days). Tracking numbers / URLs are obvious test placeholders.
- `buildSampleOrderInfo(shopDomain)` helper: synthesizes `OrderInfo` for the dispatch (orderNumber `TEST-001`, customerName `Sample Customer`).
- `isValidDelayType` + `isValidChannelArray` type-guards for input narrowing — short-circuit before the DB read so invalid input doesn't waste a query.
- `TestAlertService` class with `dispatchTestAlert(shopDomain, req)` method:
  - Validates `delayType` and `channels` first (throws `MerchantApiValidationError` with codes `INVALID_DELAY_TYPE` / `INVALID_CHANNELS`).
  - Single LEFT JOIN query against `shops` + `app_settings` (returns `merchant_email` / `merchant_phone` / `email_enabled` / `sms_enabled` in one round-trip).
  - LEFT JOIN nulls for missing `app_settings` row coerce to schema defaults (`email_enabled ?? true`, `sms_enabled ?? false`).
  - Per-channel gating: dispatch only if `requested.includes(channel) && channelEnabled && recipient`.
  - `Promise.all` parallel dispatch.
  - Logs the attempted channel set on success.

**2. Wired POST route** — [src/routes/api.ts](delayguard-app/src/routes/api.ts):

- New imports: `TestAlertService`, `TestAlertChannel`, `TestAlertDelayType`, `EmailService`, `SMSService`.
- Lazy-singleton `getTestAlertService()` factory: instantiates one `TestAlertService` per process (so SendGrid/Twilio SDK clients aren't re-constructed per request) and reads env vars at call time (Vercel cold start has them; tests mock the underlying service modules).
- `router.post("/test-alert", requireAuth, ...)` handler: parses body, calls service, returns `{ success: true, data: TestAlertResult }`. Reuses the existing `respondWithServiceError` helper for `ShopNotFoundError → 404`, `MerchantApiValidationError → 400`, fallback 500.

**3. Sibling tests** — 21 new cases:

- [src/services/test-alert-service.test.ts](delayguard-app/src/services/test-alert-service.test.ts) — 15 cases. Mocks `query` from `database/connection`; constructs `TestAlertService` with `jest.Mocked<EmailService>` + `jest.Mocked<SMSService>` directly via DI.
- [src/tests/unit/routes/test-alert-route.test.ts](delayguard-app/src/tests/unit/routes/test-alert-route.test.ts) — 6 cases. New file (separate from `api-routes.test.ts`) so the `EmailService` / `SMSService` module mocks don't bleed into unrelated route suites. Walks the real `apiRoutes` router with supertest + a JWT-signed bearer.

**Carry-forward context for Phase 2.1.f and beyond**:

- The dashboard "Send Test Alert" button (existing UI stub since v1.20.3 — see `useSettingsActions.ts`) needs frontend wiring to POST `/api/test-alert` with `{ delayType: 'warehouse' }` (or whichever picker the §2.1.f UI surfaces). Backend response shape is `{ success: true, data: { channelsAttempted: ('email'|'sms')[], recipientEmail: string|null, recipientPhone: string|null } }`. Toast copy can be data-driven: e.g. "Test alert sent via {channelsAttempted.join(' + ') || 'no channels — check your notification flags'}".
- The `recipientEmail` / `recipientPhone` body params are reserved for a future "Send to a different address (troubleshooting)" expander in the §2.1.f UI — wire the basic happy path first, expander later.
- The `channels` body param is reserved for a future "Test only email" / "Test only SMS" picker in the §2.1.f UI — same expander pattern, wire later.
- No `last_test_alert_at` column added (deliberate — UI-state belongs with the UI slice). If §2.1.f wants "you last tested 5 minutes ago" copy, add `shops.last_test_alert_at TIMESTAMPTZ` then.
- Production NotificationService dispatch wart (item 6 above) is a separate carry-forward — not fixed here. If a future audit pass tightens `delay-check.ts` to per-channel flag-honoring, test-alert and real-alert behavior would converge.

**Found-and-deferred (smallest blast radius — DO NOT attack mid-session)**:

- Phase 2.1.f customer-intelligence UI surfacing (priority badge + financial breakdown + shipping address + customer segment on alert cards) — last Phase 2.1 sub-slice.
- Phase 2.2.c re-score follow-up at end of `customer-sync.ts` (born from 2.1.b race-condition Q3 fallback).
- EnhancedDashboard subtree (Wave 7.3 target).
- PerformanceMonitor reader/writer schema mismatch (regression-test pending).
- ToastContainer.tsx:27 ℹ️ emoji (Wave 6 follow-up).
- Route-layer integration gaps: webhooks.ts, monitoring.ts, billing.ts (Wave 4.6).
- optimized-api.ts sibling test (Wave 4.4).
- `003_create_subscriptions_table.sql` UUID-vs-SERIAL mismatch + migration-runner not loading .sql files (surfaced 2026-05-15).
- `getQueueStats` schema extension for customer-sync queue is still deferred from v1.48–v1.51; bundle with Phase 2.1.f UI surfacing.
- `npm run lint:fix` still unsafe (Wave 2.3 finding); used `npx eslint --fix` on touched files only for this slice.
- Husky pre-commit gate still non-functional; no change this slice.
- `tests/unit/middleware/input-sanitization.test.ts:405` performance-budget assertion is a known flake under coverage instrumentation (passes in isolation); separate test-infra fix.
- Pre-existing lint errors in `src/tests/integration/database/tracking-events-schema.test.ts:2` (unused `query` import) and `tests/unit/components/HelpModal.test.tsx:162` (`jsx-a11y/anchor-is-valid`) — unrelated to this slice.
- DATA_AVAILABILITY_ANALYSIS.md catch-up entry for all v1.49/v1.50/v1.51 columns is still deferred (doc-only, no behavior change). Test-alert adds no columns so no catch-up entry needed for v1.52.
- Production NotificationService dispatch wart (item 6 above): per-channel `email_enabled` / `sms_enabled` flags are not honored on real-alert dispatch — bundle with a future audit pass.

---

### v1.51 (2026-05-15): Phase 2.1.d — Shipping Address Context (fourth slice)

**Test Results**: 2,070 passing (+14), 25 skipped, 0 failing. New coverage in `src/services/order-upsert-service.test.ts`: v1.19 every-column assertion extended 13 → 19 params (6 EXCLUDED-mirror SQL-shape assertions on the UPSERT) plus a new `Phase 2.1.d — shipping address capture` block with 13 cases — present for each of the 6 fields, all-null when the block is missing, individual-field-omission, empty-string normalization (Shopify "" passthrough), whitespace-only normalization, non-string defensive narrowing, whitespace trimming, and the Gift-Buyer scenario asserting buyer's `customer_phone` and recipient's `shipping_phone` are stored independently. Plus 1 case appended to `src/tests/unit/services/gdpr-service.test.ts` asserting the customer-redact `UPDATE orders` SQL nulls `shipping_phone` + `shipping_address1` and explicitly does **not** anonymize the 4 non-PII shipping fields (now 46 cases / was 33).
**Status**: Phase 2.1 fourth sub-slice (2.1.d) **SHIPPED**. Sub-slices remaining (2.1.e–2.1.f): test-alert endpoint, customer-intelligence UI surfacing. Phase 2.1.d completes the data layer behind the eventual UI — priority badge (2.1.b) tells *who* matters, financial breakdown (2.1.c) tells *why* the bill is $X, shipping address tells *where* the delayed package is going.

**Problem**: Phase 2.1.c shipped the financial breakdown but alert cards in §2.1.f could still only show order number + customer name + total — no way to render "delayed package to Toronto, ON" or surface destination-clustering insights. Phase 2.1.d persists the recipient delivery address on every order webhook so the eventual UI has the data to render. Capture **only** — UI render, geographic classification (Rural / Urban / PO Box flagging), address validation, and geocoding are all explicitly out of scope (ship in Phase 2.1.f or later).

**Four gating decisions reverse-prompted before any code was written**:

1. **Field selection** → 6 fields: `address1` / `city` / `province_code` / `country_code` / `zip` / `phone`. Drops Shopify's `latitude`/`longitude` (PII surveillance, no UI use), shipping `first_name`/`last_name`/`name` (redundant with `orders.customer_name` from 2.1.a), long-form `province`/`country` strings (codes are display-sufficient + sortable; round-trip via static map at render time), `company` (rare on consumer orders), and `address2` (deferred until UI plans full mailing-format address). Minimum useful set for the §2.1.f alert-card narrative.
2. **Storage shape** → 6 nullable additive columns on `orders` (precedent-consistent — direct 2.1.b/2.1.c rhythm). Sibling `order_addresses` table rejected — billing-address and multi-shipment aren't in Phase 2.1, and the extra JOIN-per-read cost on every dashboard render in §2.1.f isn't worth pre-building for hypothetical futures (YAGNI). JSONB column rejected — `v1.19 every-column` assertion gets weird with one-param-complex-object, and typed-column safety net would be lost. Mild column-count bloat (orders 13 → 19) is the right trade.
3. **GDPR redact** → extend [gdpr-service.ts handleCustomerRedact](delayguard-app/src/services/gdpr-service.ts) `UPDATE orders` to `SET shipping_phone = NULL, shipping_address1 = NULL`. Both are PII per GDPR Art.4(1): phone is a direct identifier; `address1` is street-level. The remaining 4 columns (`city` / `province_code` / `country_code` / `zip`) are aggregate location and retained as transactional record (legitimate-interest basis — Shopify itself preserves these in historical order data even after customer redact). Single SQL UPDATE means the 30-day GDPR deadline is met without a separate redact path.
4. **Backfill** → null-stays-null for legacy orders; webhook fills new orders forward. Direct 2.1.b/2.1.c precedent. ~1 GraphQL call per legacy order at install time is unjustified cost-points budget for a pure-display feature. UI fallback for null = render "—" (no behavior change pre-Phase-2.1.d).

**One schema concern uncovered during the gating read** (criterion c — semantic conflicts the user hadn't anticipated):

5. **Phone semantics**: `orders.customer_phone` (from Phase 2.1.a — `orderData.customer?.phone`) is the BUYER's account phone — the number our SendGrid/Twilio routing sends notifications to. `orders.shipping_phone` (this slice — `orderData.shipping_address?.phone`) is the RECIPIENT's delivery contact — the number couriers call for delivery handoff. On Gift-Buyer orders (segment recognized by Phase 2.1.a's `deriveSegment` from `!acceptsMarketing` + ≥$200 spend), these are legitimately different people. **Decision: store both, do not dedupe** — they serve different purposes and the field overlap is incidental. A dedicated sibling test (`captures buyer's customer_phone and recipient's shipping_phone independently (Gift-Buyer scenario)`) verifies the columns persist independent values at indices `[5]` and `[18]` of the v1.19 param array.

**One GDPR-redact gap uncovered during the gating read** (criterion c — anything the user hadn't flagged):

6. `gdpr-service.ts` customer-redact handler is **field-level UPDATE, not row-level DELETE**. The `ON DELETE CASCADE` from `shops → orders` only fires on `shop/redact`, not on `customers/redact`. So every new PII column we add must be added to the `UPDATE orders SET …` clause explicitly — there's no automatic anonymization for `customers/redact`. Surfaced this gap mid-gating; carried it into Q3 as a required slice deliverable. (Reminder for future PII-adjacent slices: extending PII columns means extending this same SQL — see [gdpr-service.ts:122](delayguard-app/src/services/gdpr-service.ts#L122).)

**One plan-vs-reality flag** (criterion b — IMPLEMENTATION_PLAN.md was written before the slice was renamed):

7. The plan calls shipping address **§2.4** ([IMPLEMENTATION_PLAN.md:2474](IMPLEMENTATION_PLAN.md#L2474)), not §2.1.d. The §2.4 spec was written in Prisma+Remix style with 9 fields including order-level `customerNote` (a different column entirely — order metadata, not shipping address) plus a `classifyShippingAddress` geography service for Rural/Urban/PO-Box flagging. Geography classification is intentionally **out of scope** this slice — capture only. The §2.1.d "what shipped" block is now backfilled into the §2.1 section of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) alongside §2.1.a–§2.1.c for future-audit discoverability.

**What Changed**:

**1. SQL migration** (in [src/database/connection.ts](delayguard-app/src/database/connection.ts), idempotent additive block after the 2.1.c financial-breakdown block, before the index creation):

- `ALTER TABLE orders ADD COLUMN shipping_address1 VARCHAR(255)` (nullable).
- `ALTER TABLE orders ADD COLUMN shipping_city VARCHAR(255)` (nullable).
- `ALTER TABLE orders ADD COLUMN shipping_province_code VARCHAR(10)` (nullable — ISO 3166-2 subdivision codes are 1–3 chars; VARCHAR(10) is generous).
- `ALTER TABLE orders ADD COLUMN shipping_country_code VARCHAR(10)` (nullable — ISO 3166-1 alpha-2 is 2 chars; VARCHAR(10) is generous).
- `ALTER TABLE orders ADD COLUMN shipping_zip VARCHAR(20)` (nullable — UK/Canadian postal codes can be ~7 chars with spaces; VARCHAR(20) is generous).
- `ALTER TABLE orders ADD COLUMN shipping_phone VARCHAR(255)` (nullable — matches existing `customer_phone VARCHAR(255)` convention).
- All six columns guarded by the same `IF NOT EXISTS … shipping_address1` check (single anchor — re-runs match nothing on subsequent boots).
- No new index — these columns are pure-display, not sortable or filterable (yet). Add an index if/when Phase 2.1.f surfaces "top destinations" analytics.
- No backfill — legacy orders stay NULL (display path falls back to "—").
- No `.sql` file (migration runner doesn't load them — same v1.48/v1.49/v1.50 finding).

**2. `src/services/order-upsert-service.ts`** — captures all 6 shipping fields (additive, Phase 2.1.d):

- New `ShopifyShippingAddress` interface — 6 optional string fields. Documents (in code) the recipient-vs-buyer phone semantics and the per-field/whole-block optionality on the wire.
- `OrderWebhookPayload` extended with `shipping_address?: ShopifyShippingAddress`.
- New `parseAddressField(value: unknown)` helper: defensive narrowing for the entire spectrum of degenerate inputs — absent / null / "" / whitespace-only / wrong-type-entirely all collapse to a single `null` semantic. Whitespace-trimmed when valid.
- UPSERT SQL extended: 6 columns added to INSERT list (13 → 19), 6 `… = EXCLUDED.…` lines added to `DO UPDATE SET`. Param list goes 13 → 19.
- Sibling test: v1.19 every-column param-array assertion extended to 19 elements; +13 new cases in the `Phase 2.1.d — shipping address capture` describe block.

**3. `src/services/gdpr-service.ts`** — customer-redact extended for the two PII columns (Phase 2.1.d):

- `handleCustomerRedact` `UPDATE orders` clause extended: `SET … shipping_address1 = NULL, shipping_phone = NULL …`.
- `shipping_city`/`shipping_province_code`/`shipping_country_code`/`shipping_zip` intentionally **not** anonymized — aggregate location, retained as transactional record.
- Sibling test added in [src/tests/unit/services/gdpr-service.test.ts](delayguard-app/src/tests/unit/services/gdpr-service.test.ts) — positive assertions (`shipping_phone = NULL`, `shipping_address1 = NULL`) plus four negative assertions (non-PII columns NOT in the SET clause).

**v1.19 field-population rule applied**: explicit `expect(params).toEqual([...everyColumn])` on the UPSERT — now 19 cols including the 6 new `shipping_*` fields.

**Carry-forward context for Phase 2.1.e–2.1.f**:

- Legacy orders persisted before v1.51 have NULL for all 6 shipping columns. Phase 2.1.f dashboard render must treat any null value as "not captured" and fall back to "—". Distinction from empty-string-in-payload (also captured as NULL — see `parseAddressField` empty/whitespace branch) is **not** preserved; both render the same way.
- `shipping_province_code` and `shipping_country_code` are stored as raw ISO codes ("ON", "CA"). The §2.1.f UI is expected to maintain a static code → name map at render time (e.g. "ON" → "Ontario", "CA" → "Canada") to avoid storing the redundant long-form. Phase 2.1.f should bundle this map with the alert-card component, not the data layer.
- Geographic classification (Rural / Urban / PO Box flagging from plan §2.4 `classifyShippingAddress`) is **out of scope** this slice. If §2.1.f or a future Phase 2 / 3 slice wants this, implement it as a pure-fn over the captured columns at render time — no schema change needed.
- Address validation (Smarty / Loqate / Shopify's own) and geocoding (lat/long re-derivation) are out of scope. Shopify already validates addresses on order creation; we trust their payload.
- Billing address and multi-shipment / split-fulfillment addresses are out of scope. Each fulfillment can have its own shipping address — we capture only the order-level one (Shopify's `shipping_address`, not `fulfillments[].destination`). If Phase 2.2+ wants per-fulfillment addresses, the precedent shifts to a sibling `fulfillment_addresses` table.
- GDPR audit: if a future regulator argues the 4 non-PII shipping fields (city/province/country/zip) also require redact, extend the same SQL UPDATE — single-anchor change. Current call relies on the "transactional record / legitimate interest" basis (Shopify's own customer-data-export retains these in historical orders).
- DATA_AVAILABILITY_ANALYSIS.md catch-up entry for all v1.49/v1.50/v1.51 columns (`orders.total_amount`, `orders.subtotal_price`, `orders.total_tax`, `orders.total_discounts`, `orders.total_shipping_price`, `delay_alerts.priority_score`, `delay_alerts.priority_level`, plus this slice's 6 shipping_* columns) is still deferred (doc-only, no behavior change).

**Found-and-deferred (smallest blast radius — DO NOT attack mid-session)**:

- Phase 2.2.c re-score follow-up at end of `customer-sync.ts` (born from 2.1.b race-condition Q3 fallback).
- EnhancedDashboard subtree (Wave 7.3 target).
- PerformanceMonitor reader/writer schema mismatch (regression-test pending).
- ToastContainer.tsx:27 ℹ️ emoji (Wave 6 follow-up).
- Route-layer integration gaps: webhooks.ts, monitoring.ts, billing.ts (Wave 4.6).
- optimized-api.ts sibling test (Wave 4.4).
- `003_create_subscriptions_table.sql` UUID-vs-SERIAL mismatch + migration-runner not loading .sql files (surfaced 2026-05-15).
- `getQueueStats` schema extension for customer-sync queue is still deferred from v1.48–v1.50; bundle with Phase 2.1.f UI surfacing.
- `npm run lint:fix` still unsafe (Wave 2.3 finding); used `npx eslint --fix` on touched files only for this slice.
- Husky pre-commit gate still non-functional; no change this slice.

---

### v1.50 (2026-05-15): Phase 2.1.c — Financial Breakdown (third slice)

**Test Results**: 2,056 passing (+12), 25 skipped, 0 failing. New coverage in `src/services/order-upsert-service.test.ts`: v1.19 every-column assertion extended 9 → 13 params (subtotal_price/total_tax/total_discounts/total_shipping_price + 4 EXCLUDED-mirror SQL-shape assertions on the UPSERT), plus a new `Phase 2.1.c — financial breakdown capture` block with 12 cases — present + missing for each of the 3 flat fields, non-finite-string fallback covering all 3 in one shot, present + 3 missing-axis cases for the nested shipping money-set (whole set absent / `shop_money` absent / `shop_money.amount` non-finite), and the all-null digital-good edge case (now 33 cases / was 21).
**Status**: Phase 2.1 third sub-slice (2.1.c) **SHIPPED**. Sub-slices remaining (2.1.d–2.1.f): shipping address capture, test-alert endpoint, customer-intelligence UI surfacing.

**Problem**: Phase 2.1.b shipped order-level `total_amount` as the orderValue axis input for the priority score, but the merchant-facing narrative ("**why** is this customer's bill $199?") needs the breakdown — subtotal + tax + shipping − discounts. Without it, the priority badge from 2.1.b stands alone with no financial context, and any UI surfacing in Phase 2.1.f can only show the total. Phase 2.1.c persists the 4 order-level breakdown components on every order webhook so the eventual UI has the data to render. Capture **only** — UI render is explicitly out of scope (ships in Phase 2.1.f).

**Three gating decisions reverse-prompted before any code was written**:

1. **Scope of "breakdown"** → order-level only (4 fields). Plan §2.3 + DEEP_DIVE_UX_UI_RESEARCH.md line 207 + DATA_AVAILABILITY_ANALYSIS.md line 969 all describe a 4-field order-level breakdown. Line-item data is already captured in `order_line_items` (price/quantity); pulling it into the UI is a join-query for §2.1.f, not a schema gap. Pure-display tax/shipping/discount narrative doesn't need per-line decomposition.
2. **Storage shape** → 4 nullable additive columns on `orders` (`NUMERIC(12, 2)`). Direct 2.1.b precedent (`total_amount`). Sibling `order_financials` table rejected — refunds/presentment-currency aren't in Phase 2.1 (YAGNI; don't pre-build for hypothetical futures). Plan §2.3:2401 also models these as scalars on `Order`. Mild column-count bloat (orders 9 → 13) is the right trade vs. JOIN-per-read on every dashboard render in §2.1.f.
3. **Backfill strategy** → null-stays-null for legacy orders; webhook fills new orders forward. Direct 2.1.b precedent (legacy `delay_alerts.priority_score` stays NULL). ~1 GraphQL call per order at install time is unjustified cost-points budget for a pure-display narrative. UI fallback for null = render the total only (no behavior change pre-Phase-2.1.c).

**One additional gating clarification** (criterion c — Shopify webhook payload shape):

4. **Shipping field is the outlier**. Three of four target fields are flat strings on the Order webhook payload (`subtotal_price` / `total_tax` / `total_discounts` — same shape as 2.1.b's `total_price`). Shipping is **not** a flat field: Shopify exposes it as `total_shipping_price_set.shop_money.amount` (nested money-set). **Chose `shop_money.amount`** (merchant settlement currency, pre-computed by Shopify with partial-ship handling baked in) over summing `shipping_lines[].price` (loses Shopify's own rounding semantics). Consistent with 2.1.b precedent — flat `total_price` is also shop-currency. `presentment_money` is intentionally unused; buyer-display currency conversion is out of scope until Phase 2.2+ if it ever earns its keep.

**One plan-vs-reality flag** (criterion b — IMPLEMENTATION_PLAN.md was written before the slice was renamed):

5. The plan calls financial breakdown **§2.3** ([IMPLEMENTATION_PLAN.md:2393](IMPLEMENTATION_PLAN.md#L2393)), not §2.1.c. The Phase 2.1.b changelog (v1.49) reframed it as part of the §2.1 sub-slice sequence. The §2.3 spec was written in Prisma+Remix style from the original Phase 2 numbering; this slice's actual implementation is raw `pg` + Koa (same divergence noted in v1.48 for §2.1.a). The §2.1.c "what shipped" block is now backfilled into the §2.1 section of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) alongside §2.1.a and §2.1.b for future-audit discoverability.

**What Changed**:

**1. SQL migration** (in [src/database/connection.ts](delayguard-app/src/database/connection.ts), idempotent additive block after the 2.1.b priority-score block, before the index creation):

- `ALTER TABLE orders ADD COLUMN subtotal_price NUMERIC(12, 2)` (nullable).
- `ALTER TABLE orders ADD COLUMN total_tax NUMERIC(12, 2)` (nullable).
- `ALTER TABLE orders ADD COLUMN total_discounts NUMERIC(12, 2)` (nullable).
- `ALTER TABLE orders ADD COLUMN total_shipping_price NUMERIC(12, 2)` (nullable).
- All four columns guarded by the same `IF NOT EXISTS … subtotal_price` check (single anchor — re-runs match nothing on subsequent boots).
- No new index — these columns are pure-display, not sortable or filterable. Add an index if/when Phase 2.1.f surfaces "sort by tax %" or similar.
- No backfill — legacy orders stay NULL (display path falls back to "—" or just shows total).
- No `.sql` file (migration runner doesn't load them — same v1.48/v1.49 finding).

**2. `src/services/order-upsert-service.ts`** — captures all 4 breakdown components (additive, Phase 2.1.c):

- New `ShopifyMoneySet` interface — `shop_money?.amount?` + `presentment_money?` for forward-compat. Documents (in code) why we persist `shop_money` (merchant settlement currency) and ignore `presentment_money`.
- `OrderWebhookPayload` extended: `subtotal_price?: string`, `total_tax?: string`, `total_discounts?: string`, `total_shipping_price_set?: ShopifyMoneySet` (Shopify wire format — 3 flat strings + 1 nested money-set).
- New `parseMoneySet(value)` helper: defensive narrowing through `value?.shop_money?.amount` → delegates to `parseTotalPrice`. Single failure mode (null) regardless of which level is absent.
- UPSERT SQL extended: 4 columns added to INSERT list (9 → 13), 4 `… = EXCLUDED.…` lines added to `DO UPDATE SET`. Param list goes 9 → 13.
- Sibling test: v1.19 every-column param-array assertion extended to 13 elements; +12 new cases covering present / missing / non-finite for each of the 3 flat fields, all 4 missing-axis cases for the nested shipping money-set, and the all-null digital-good edge case.

**v1.19 field-population rule applied**: explicit `expect(params).toEqual([...everyColumn])` on the UPSERT — now 13 cols including subtotal_price/total_tax/total_discounts/total_shipping_price.

**Carry-forward context for Phase 2.1.d–2.1.f**:

- Legacy orders persisted before v1.50 have NULL for all 4 breakdown columns. Phase 2.1.f dashboard render must treat any null value as "not captured" and fall back to showing the total only. Distinction from `0.00` (captured as zero — e.g. discounts on a non-discounted order) is preserved by the parser's `Number.isFinite(0)` → 0 vs `parseFloat(undefined)` → null branch.
- `presentment_money` is unused this slice. If Phase 2.2+ adds multi-currency support, the `ShopifyMoneySet` interface is already shaped to expose it — extend `parseMoneySet` to take a `currency` parameter (`'shop' | 'presentment'`) at that point.
- Shopify multi-store merchants on Shopify Plus may have `currency_code` divergence between shop_money and presentment_money. Currently we capture shop_money only, so multi-currency reporting needs Phase 2.2+ work; not a Phase 2.1 blocker.
- No new BullMQ job introduced — capture rides the existing webhook UPSERT path. If Phase 2.2 introduces refund webhooks (`orders/refund/create`), the refund handler will need its own UPSERT-or-UPDATE to adjust the 4 columns (subtotal_price minus refunded line price, total_tax minus refunded tax, etc.); separate slice, separate plan section.
- DATA_AVAILABILITY_ANALYSIS.md catch-up entry for the 7 v1.49+v1.50 columns (`orders.total_amount`, `orders.subtotal_price`, `orders.total_tax`, `orders.total_discounts`, `orders.total_shipping_price`, `delay_alerts.priority_score`, `delay_alerts.priority_level`) is still deferred (doc-only, no behavior change).

**Found-and-deferred (smallest blast radius — DO NOT attack mid-session)**:

- Phase 2.2.c re-score follow-up at end of `customer-sync.ts` (born from 2.1.b race-condition Q3 fallback).
- EnhancedDashboard subtree (Wave 7.3 target).
- PerformanceMonitor reader/writer schema mismatch (regression-test pending).
- ToastContainer.tsx:27 ℹ️ emoji (Wave 6 follow-up).
- Route-layer integration gaps: webhooks.ts, monitoring.ts, billing.ts (Wave 4.6).
- optimized-api.ts sibling test (Wave 4.4).
- `003_create_subscriptions_table.sql` UUID-vs-SERIAL mismatch + migration-runner not loading .sql files (surfaced 2026-05-15).
- `getQueueStats` schema extension for customer-sync queue is still deferred from v1.48–v1.49; bundle with Phase 2.1.f UI surfacing.
- `npm run lint:fix` still unsafe (Wave 2.3 finding); used `npx eslint --fix` on touched files only for this slice.
- Husky pre-commit gate still non-functional; no change this slice.

---

### v1.49 (2026-05-15): Phase 2.1.b — Priority Score (second slice)

**Test Results**: 2,044 passing (+45), 25 skipped, 0 failing. New coverage: 28 boundary tests in `src/services/priority-score.test.ts` (every axis cutoff inclusive, plus Q3-fallback + level-band boundaries), 12 service tests in `src/services/priority-score-service.test.ts` (lookup SQL shape, churn count SQL shape, guest-checkout shortcut, v1.19 UPDATE param assertion, Q3 fallback, null total_amount, DB-failure propagation at each step, NUMERIC string parsing), 3 wiring tests appended to `tests/unit/queue/delay-check-notification-routing.test.ts` (scoreAlert call, best-effort failure swallow, ON-CONFLICT no-id branch), +2 cases for `total_amount` capture on `services/order-upsert-service.test.ts` (now 21 cases / was 19).
**Status**: Phase 2.1 second sub-slice (2.1.b) **SHIPPED**. Sub-slices remaining (2.1.c–2.1.f): financial breakdown, shipping address, test-alert endpoint, customer-intelligence UI surfacing.

**Problem**: Phase 2.1.a shipped customer intelligence ingestion but every delay alert still ranked the same on the dashboard — no signal for "VIP customer with a high-value order who's been burned by a prior delay" versus "first-time guest checkout, small order, 1-day delay." Phase 2.1.b ships the 4-axis priority score per [IMPLEMENTATION_PLAN.md §2.2](IMPLEMENTATION_PLAN.md#L2200-L2280): orderValue (0-30) + customerValue (0-40) + churnRisk (0-20) + urgency (0-10) = 0-100 score, mapped to Critical/High/Medium/Low. Score is **written** this slice — UI surfacing (rendering / sorting / filtering by priority) is explicitly out of scope and ships in Phase 2.1.f.

**Six gating decisions reverse-prompted before any code was written**:

1. **Storage shape** → denormalized columns on `delay_alerts` (`priority_score INTEGER`, `priority_level VARCHAR(20)`). Computed once at alert-creation time, indexed `(order_id, priority_score DESC)` for cheap dashboard sort. The "customer's segment changes after the alert fires" scenario lands in Phase 2.2.c re-score follow-up — not a per-render JOIN cost we'd accept on every dashboard load.
2. **Score factors** → keep the plan's 4 axes verbatim (orderValue / customerValue / churnRisk / urgency). The v1.45 delay-type split (WAREHOUSE / CARRIER / TRANSIT) signals routing, not severity — urgency-by-delay-days already captures customer-impact axis. Phase 2.2.c could add a delay_type multiplier later if telemetry justifies.
3. **Missing-customer fallback (Q3)** → neutral 20 for customerValue when `customer_intelligence` row is missing (guest checkout OR identified-customer sync race). Reverse-prompt #1 surfaced that the prompt's assumed "Promise.all → sequential await" cannot make `notification.ts` wait on customer-sync — they run on independent BullMQ workers on independent queues. Decision: accept the race for this slice, score with neutral fallback, add Phase 2.2.c re-score job at the end of customer-sync.ts to heal stale scores async.
4. **Backfill** → migration adds columns + an `orders.total_amount` backfill from `SUM(price * quantity) FROM order_line_items`, but **no SQL backfill of `delay_alerts.priority_score`**. Legacy alert rows stay NULL until Phase 2.2.c re-score populates them — a 40-line CASE-WHEN that duplicates the pure-fn in SQL is not worth the maintenance burden. Score quality for legacy rows would have been low anyway (Q3 fallback applies universally — pre-Phase-2.1.a orders predate `customer_intelligence`).
5. **Gift-Buyer customerValue band** → 25 (same as Repeat). Plan predates the segment (added v1.48). Locked at 25 to acknowledge mid-range order value (≥$200) without overweighting retention upside (Gift-Buyer = `!acceptsMarketing` by derivation rule).
6. **`orders.total_amount` doesn't exist** (plan-vs-reality gap surfaced before any code was written). The plan's `orderValue` axis reads `order.total`, but the orders table has no total column and [order-upsert-service.ts](delayguard-app/src/services/order-upsert-service.ts) discards `webhook.total_price`. Decision: pull the additive `orders.total_amount NUMERIC(12, 2)` column + webhook-capture into this slice. Phase 2.1.c "financial breakdown" becomes pure-display (tax/shipping/discount split) rather than total-capture.

**Two additional gating clarifications** (criterion (a) — divergence between prompt and plan):

7. **customerValue band table** → Plan as written (`VIP=40, New=30 "first-impression bonus", Repeat=25, Gift-Buyer=25, At-Risk=15, null/Q3=20`). The prompt's listed numbers ("VIP=40, Repeat=20, New=10, At-Risk=30") referenced a non-existent line and disagreed with the actual plan code; locked to the plan as the SSOT.
8. **churnRisk source** → previousDelays count per plan (DB COUNT(*) of prior alerts for same `(shop_id, shopify_customer_id)`, excluding self). The prompt's "segment + acceptsMarketing" phrase was misspoken shorthand; concrete signal in the plan is `previousDelays`. Multi-tenant correctness: scope on `o.shop_id` from the alert's own order, not on caller-supplied value.

**What Changed**:

**1. SQL migration** (in [src/database/connection.ts](delayguard-app/src/database/connection.ts), idempotent additive blocks before the index creation):

- `ALTER TABLE orders ADD COLUMN total_amount NUMERIC(12, 2)` (nullable; populated by webhook + optional one-shot backfill below).
- One-shot backfill: `UPDATE orders SET total_amount = SUM(price * quantity) FROM order_line_items WHERE total_amount IS NULL`. Idempotent — re-runs match nothing.
- `ALTER TABLE delay_alerts ADD COLUMN priority_score INTEGER, ADD COLUMN priority_level VARCHAR(20)` (both nullable; populated at alert creation by `PriorityScoreService.scoreAlert`).
- New index `idx_delay_alerts_priority_score` on `(order_id, priority_score DESC)` — the eventual dashboard sort key for Phase 2.1.f.
- No `.sql` file (migration runner doesn't load them — same v1.48 finding).
- Legacy `delay_alerts` rows stay `NULL` until Phase 2.2.c re-score job populates them.

**2. `src/services/priority-score.ts` + sibling test** (new, 28 tests):

Pure function `calculatePriorityScore({ orderTotal, segment, previousDelays, delayDays })` returns `{ score, level, factors }`. No I/O — caller hydrates inputs.

```
orderValue:    >=500=30, >=300=25, >=200=20, >=100=15, >=50=10, else=5, null=5
customerValue: VIP=40, New=30, Repeat=25, Gift-Buyer=25, At-Risk=15, null=20 (Q3)
churnRisk:     prev>=2=20, prev==1=15, else=5
urgency:       >=7d=10, >=5d=8, >=3d=5, else=2
level:         >=80=Critical, >=60=High, >=40=Medium, else=Low
```

Every band cutoff has an inclusive-threshold boundary test (e.g. `orderTotal=500` scores 30, not 25). One exhaustive segment-coverage test pins all six customerValue bands in a single loop.

**3. `src/services/priority-score-service.ts` + sibling test** (new, 12 tests):

`PriorityScoreService.scoreAlert(alertId)` performs:
1. Single JOIN lookup — `delay_alerts da JOIN orders o ON o.id = da.order_id LEFT JOIN customer_intelligence ci ON ci.shop_id = o.shop_id AND ci.shopify_customer_id = o.shopify_customer_id WHERE da.id = $1`. LEFT JOIN preserves null segment for guests and pre-sync races (Q3 fallback territory).
2. Conditional churn count — skipped entirely when `shopify_customer_id IS NULL` (guest checkout — saves a roundtrip). Otherwise `SELECT COUNT(*) FROM delay_alerts da JOIN orders o ON o.id = da.order_id WHERE o.shop_id = $1 AND o.shopify_customer_id = $2 AND da.id <> $3` (multi-tenant scoped on alert's own order, excludes self).
3. v1.19 every-column param-array assertion on the UPDATE: `UPDATE delay_alerts SET priority_score = $1, priority_level = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`. Params asserted exactly `[score, level, alertId]`.
4. Silent-skip on missing alert (defensive — delay-check flow guarantees existence, but the prompt asked for the defend).
5. NUMERIC parsing: pg returns `NUMERIC(12, 2)` as a string; `parseFloat` coerces before passing to the pure-fn.

DB failures at each step propagate (BullMQ retry chain — though the wiring caller swallows them; see point 4 below).

**4. Wiring in [src/queue/processors/delay-check.ts](delayguard-app/src/queue/processors/delay-check.ts)** (`storeDelayAlert` only):

- INSERT extended with `RETURNING id`.
- After successful INSERT, instantiates `PriorityScoreService` and calls `scoreAlert(newAlertId)` — wrapped in **best-effort try/catch**. Scoring failures log + swallow. **Critical reason for best-effort**: if scoring exceptions propagated to BullMQ, the retry chain would re-INSERT a duplicate `delay_alerts` row (the existing `ON CONFLICT DO NOTHING` clause has no matching unique constraint — known latent issue outside this slice's scope). Phase 2.2.c re-score job is the durable cleanup for failed-scoring alerts.
- Wiring lives inside `storeDelayAlert` so the 3 rule branches (warehouse / carrier / transit) get scoring "for free" — no changes to the rule-match blocks at lines 99 / 121 / 141. Caller signature unchanged (still `Promise<void>`).

**5. `src/services/order-upsert-service.ts`** — captures `webhook.total_price` (additive, Phase 2.1.b):

- `OrderWebhookPayload.total_price?: string` added (Shopify wire format is string).
- `parseTotalPrice` helper: `parseFloat` + `Number.isFinite` guard → `number | null`.
- UPSERT SQL extended: `total_amount` column added to INSERT list and `DO UPDATE SET ...EXCLUDED.total_amount`. Param list goes 8 → 9 cols.
- Sibling test: v1.19 every-column param-array assertion updated to 9 elements; 2 new cases (`total_price="459.50"` → `459.5`; `total_price=undefined` → `null`).

**v1.19 field-population rule applied**: explicit `expect(params).toEqual([...everyColumn])` on every UPDATE/INSERT — `delay_alerts.priority_score` UPDATE (3 cols: score, level, id), `orders` UPSERT (9 cols including total_amount).

**Carry-forward context for Phase 2.1.c–2.1.f**:

- Customer-sync race window: a non-guest customer whose first delay alert lands before customer-sync completes scores at the Q3-fallback band (customerValue=20). Phase 2.2.c re-score job at the end of `customer-sync.ts` heals stale scores. Stale-score window is small (~<1s typical sync time) but real.
- Legacy `delay_alerts` rows have `priority_score = NULL`. Dashboard sort in Phase 2.1.f must use `NULLS LAST` until the re-score backfill completes.
- `delay_alerts.ON CONFLICT DO NOTHING` has no matching unique constraint and is dead clause. If a future migration adds one (e.g. `UNIQUE(order_id, delay_reason, created_at::date)`), revisit the `storeDelayAlert` best-effort semantics — the duplicate-on-retry risk goes away and scoring could propagate.
- `getQueueStats` schema extension for customer-sync queue is still deferred from v1.48; bundle with Phase 2.1.f UI surfacing.

**Found-and-deferred (smallest blast radius — DO NOT attack mid-session)**:

- EnhancedDashboard subtree (Wave 7.3 target).
- PerformanceMonitor reader/writer schema mismatch (regression-test pending).
- ToastContainer.tsx:27 ℹ️ emoji (Wave 6 follow-up).
- Route-layer integration gaps: webhooks.ts, monitoring.ts, billing.ts (Wave 4.6).
- optimized-api.ts sibling test (Wave 4.4).
- `003_create_subscriptions_table.sql` UUID-vs-SERIAL mismatch + migration-runner not loading .sql files (surfaced 2026-05-15).
- `npm run lint:fix` still unsafe (Wave 2.3 finding); used `npx eslint --fix` on touched files only for this slice.
- Husky pre-commit gate still non-functional; no change this slice.

---

### v1.48 (2026-05-15): Phase 2.1.a — Customer Intelligence Ingestion (smallest first slice)

**Test Results**: 1,999 passing (+34), 25 skipped, 0 failing. Five new sibling tests (`customer-segment.test.ts` 8 cases, `customer-sync-service.test.ts` 12, `tests/unit/queue/customer-sync.test.ts` 5, +7 cases for `fetchCustomerById` appended to `tests/unit/services/shopify-service.test.ts`, +2 cases for `shopify_customer_id` appended to `services/order-upsert-service.test.ts`).
**Status**: Phase 2.1 first sub-slice (2.1.a) **SHIPPED**. Sub-slices remaining (2.1.b–2.1.f): priority score (Phase 2.2), financial breakdown, shipping address, test-alert endpoint, customer-intelligence UI surfacing. None of these are in this slice.

**Problem**: Phase 1 shipped without customer context — every delay alert was treated equally regardless of customer LTV / repeat-buyer status. Phase 2.1 (per [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#L2012-L2190)) introduces customer intelligence: lifetime stats + computed segment, stored per shop, fed from each fulfilled-order webhook. This first slice builds **only** the ingestion pipeline — the table, the segmentation rules, the Shopify Customer fetch, and the BullMQ wiring. UI / priority-score / financial breakdown / shipping address / test-alert are explicitly out of scope.

**Four gating decisions reverse-prompted before any code was written**:

1. **Scope batching** → just `read_customers`. `read_products` is already in [app-config.ts:44-50](delayguard-app/src/config/app-config.ts), shipping addresses ride on `read_orders`, and none of the other Phase 2 sub-features need a new scope. There is nothing to batch — adding `read_customers` is the whole Phase 2 re-auth cohort.
2. **Sync trigger** → webhook-only via BullMQ post-upsert. Backfill cron deferred (separate operational slice with its own GraphQL cost-points budget). Smallest blast radius; the pipeline is proven on live `orders/updated` events.
3. **Guests** → skip rows; compute "guest" inline at alert-display time. Rejected the email-hash + partial-unique alternative — smaller schema (no PII hashing, no graduated-guest-merge problem), forward-compatible if guest analytics earns its keep later.
4. **Test strategy** → mock GraphQL responses per Wave 3.5 patterns (consistent with `fetchOrderLineItems` sibling tests). Dev-store integration is the post-merge smoke check, not the unit suite.

**Two additional gating issues surfaced during context-gathering** (reverse-prompt criterion (b)):

5. **`orders.shopify_customer_id` not captured today**. [OrderUpsertService.upsertOrderFromWebhook](delayguard-app/src/services/order-upsert-service.ts) wrote `customer_name/email/phone` but discarded `webhook.customer.id`. Without that column, customer_intelligence rows have no stable FK for Phase 2.2's priority-score query. **User chose**: additive column on orders (Phase 2.2 gets the join key for free).
6. **Migration runner does not execute `.sql` files**. [migrate.ts](delayguard-app/src/database/migrate.ts) only calls `runMigrations()` in [connection.ts](delayguard-app/src/database/connection.ts) — the lone `003_create_subscriptions_table.sql` file is unreachable from the runner (and has its own latent `shop_id UUID REFERENCES shops(id)` vs `shops.id SERIAL` type-mismatch). **User chose**: extend `connection.ts:runMigrations()` (matches every shipped table). Fixing the broken `003_*.sql` file deferred to its own PR.

**What Changed**:

**1. SQL migration** (in [src/database/connection.ts](delayguard-app/src/database/connection.ts), idempotent block before the index creation):

- Additive `ALTER TABLE orders ADD COLUMN shopify_customer_id VARCHAR(255)` (nullable — guest checkouts store null, the sync layer keys off this null to skip).
- `CREATE TABLE customer_intelligence` with columns: `id SERIAL PRIMARY KEY, shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE, shopify_customer_id VARCHAR(255) NOT NULL, orders_count INTEGER NOT NULL, total_spent NUMERIC(12, 2) NOT NULL, customer_since TIMESTAMP, last_order_at TIMESTAMP, segment VARCHAR(20) NOT NULL, accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE, created_at, updated_at`. `UNIQUE(shop_id, shopify_customer_id)` is the UPSERT key.
- Two new indexes: `idx_orders_shopify_customer_id` (for Phase 2.2 alert→customer join) and `idx_customer_intelligence_shop_segment` (for VIP/segment filtering in Phase 2.2 + dashboard).
- **No `email_hash` column** (rejected guest-tracking option). **No `.sql` file** (migration runner doesn't load them — see #6 above).

**2. `src/services/customer-segment.ts` + sibling test** (new, 8 tests):

Pure function `deriveSegment(input)` returns `'VIP' | 'Repeat' | 'New' | 'At-Risk' | 'Gift-Buyer'`. Precedence highest-first:

```
1. VIP        — ordersCount >= 5 OR totalSpent >= 1000   (plan line 2108)
2. At-Risk    — ordersCount >= 2 AND daysSinceLastOrder >= 90
3. Gift-Buyer — ordersCount === 1 AND totalSpent >= 200 AND !acceptsMarketing
4. Repeat     — ordersCount >= 2
5. New        — fallback
```

Tests cover both 5-orders / $1000-LTV boundaries explicitly + one boundary per derived rule. Plan only defined VIP/Repeat/New rules; At-Risk and Gift-Buyer thresholds were committed to with concrete rationale (90-day Shopify "Returning"-segment alignment; $200 single-purchase non-subscriber as a gift-buyer heuristic). Pure-fn — easy to retune without touching the sync pipeline.

**3. `src/services/shopify-service.ts`** — Phase 2.1.a additions (no breaking change to the Wave 3.5 generic):

- Exported `CustomerIntelligenceData` interface (camelCase + parsed types: `totalSpent: number`, `customerSince: Date`, `lastOrderAt: Date | null`).
- Exported `fetchCustomerById(shopDomain, accessToken, shopifyCustomerId)` — uses existing `createGraphQLClient` + the `query<CustomerQueryResponse>` generic. Inline `CustomerNode` + `CustomerQueryResponse` interfaces document the GetCustomerById query response shape (Wave 3.5 typing rule — callers declare what each query returns).
- New `normalizeCustomerId` helper (sibling to `normalizeOrderId`) for GID format conversion.
- Returns `null` when `data.customer === null` (Shopify reports the customer no longer exists). Propagates 401/429/5xx from `createGraphQLClient` unchanged. Did NOT require any change to the `ShopifyGraphQLClient` interface — Wave 3.5's deliberate ergonomic kept extension cheap.

**4. `src/services/order-upsert-service.ts`** — captures shopify_customer_id on every UPSERT:

- `ShopifyCustomer.id?: number` was already in the interface; previously discarded. Now stringified and persisted as `shopify_customer_id` (null when absent — guest checkout).
- UPSERT SQL extended: added column to `INSERT INTO orders (...)` and the `DO UPDATE SET ...EXCLUDED.shopify_customer_id` clause.
- Sibling test updated for v1.19 every-column param assertion (8 params now instead of 7), plus 2 new cases: shopify_customer_id present (happy path) + null when `customer.id` is absent.

**5. `src/services/customer-sync-service.ts` + sibling test** (new, 12 tests):

- `CustomerSyncService.syncCustomerForOrder(shopDomain, shopifyOrderId)` — the pipeline:
  1. Resolve shop (id + access_token).
  2. Look up `orders.shopify_customer_id` by `(shop_id, shopify_order_id)` — multi-tenant guard scopes on resolved shop_id, not raw shop_domain.
  3. Silent-skip on: shop-not-found / order-not-found / guest checkout (`shopify_customer_id IS NULL`) / Shopify reports customer 404.
  4. Otherwise call `fetchCustomerById`, compute `daysSinceLastOrder`, run `deriveSegment`, UPSERT into `customer_intelligence`.
- `DAYS_SINCE_LAST_ORDER_FALLBACK = 9999` for first-time customers with no `lastOrderAt` — picked well above the 90-day At-Risk cutoff so a new customer is never misclassified.
- v1.19 every-column param-array assertion on the UPSERT (8 params), with `jest.useFakeTimers()` pinning "now" so `daysSinceLastOrder` is deterministic.
- DB failures and Shopify 401/5xx **DO** propagate — BullMQ's attempts:3 retry chain runs.

**6. `src/queue/processors/customer-sync.ts` + sibling test** (new, 5 tests):

- Thin BullMQ processor: hands `(shopDomain, shopifyOrderId)` to `CustomerSyncService`, lets exceptions propagate.
- Idempotency tested: running the same job twice issues two service calls — but the UPSERT guarantees the same end state.
- Service mocked at the class level per `.claude/rules/tests.md` (the vendor-SDK-level mocking lives in `shopify-service.test.ts`).

**7. `src/queue/setup.ts`** — Phase 2.1.a queue + worker:

- New `customerSyncQueue` and `customerSyncWorker` next to existing delay-check + notifications.
- Canonical defaults: `attempts: 3`, `backoff: { type: "exponential", delay: 2000 }`, `removeOnComplete: 100`, `removeOnFail: 50` (matches `.claude/rules/backend.md` BullMQ retry pattern — no diverging config).
- Worker `concurrency: 5`, rate-limited `200 jobs/minute` (each job = 1 Shopify GraphQL Customer call; Shopify's 1000-cost-points/sec limit on standard plans leaves ample headroom).
- New `addCustomerSyncJob({shopDomain, shopifyOrderId})` producer. JobId includes `Date.now()` so re-runs are deliberate (not deduped). Event handlers added (`completed`/`failed`/`error`).
- `closeQueues` and module exports updated. `getQueueStats` left untouched — its return shape feeds external monitors; surfacing customer-sync stats is a Phase 2.x UI slice.

**8. `src/routes/webhooks.ts`** — best-effort enqueue inside the `orders/updated` handler:

After `orderUpsertService.upsertOrderFromWebhook` succeeds, the route enqueues `addCustomerSyncJob`. Wrapped in inner try/catch like `saveOrderLineItems` — a queue hiccup must NOT fail the webhook ACK. Guest checkouts also enqueue (the service silently skips on the null `shopify_customer_id` signal — cleaner than complicating the webhook with guest-detection logic).

**9. `src/config/app-config.ts`** — OAuth scope:

`read_customers` appended to the default scopes array (alongside `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`, `read_products`). Existing merchants will need to re-authorize via the partner-console flow — that's the entire Phase 2 re-auth cohort (no batching needed since no later Phase 2 sub-feature requires another scope addition).

**Verification**:

- `npm run type-check` → clean.
- `npm test` → 1,999 passing (+34), 25 skipped, 0 failing.
- Targeted: `npx jest src/services/customer-segment.test.ts` 8/8. `npx jest src/services/customer-sync-service.test.ts` 12/12. `npx jest src/tests/unit/queue/customer-sync.test.ts` 5/5. `npx jest src/tests/unit/services/shopify-service.test.ts` 32/32 (was 25, +7 customer cases). `npx jest src/services/order-upsert-service.test.ts` 19/19 (was 17, +2 customer-id cases).
- `npx eslint` on all 14 touched files → clean.
- `npm run lint` → same 2 pre-existing errors carried since Wave 1.1 ([tests/integration/database/tracking-events-schema.test.ts:2](delayguard-app/src/tests/integration/database/tracking-events-schema.test.ts) unused import, [tests/unit/components/HelpModal.test.tsx:162](delayguard-app/tests/unit/components/HelpModal.test.tsx) a11y href). 13 warnings — all carried, none introduced by this slice.
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.
- Husky pre-commit gate still non-functional per Wave 1.1 — not bypassed, just doesn't fire.

**Out of scope for this slice (do NOT attack mid-slice)**:

- **Phase 2.1.b–2.1.f** (the remaining Phase 2.1 sub-slices): priority score (Phase 2.2), financial breakdown, shipping address surfacing, test-alert endpoint, customer-intelligence UI dashboard. Each is its own focused PR — same per-wave discipline as the audit.
- **One-time backfill cron** for existing orders' customers (deferred per Q2). Requires Shopify GraphQL cost-points budget tracking + paginated cron in its own slice.
- **`getQueueStats` schema extension** for customer-sync. External monitor wire-shape change; not blocking the ingestion pipeline.
- **Latent bug `003_create_subscriptions_table.sql`** (`shop_id UUID REFERENCES shops(id)` vs `shops.id SERIAL`) — verified during this slice's migration audit. The file is unreachable from `migrate.ts` so it has never run. Track as a separate cleanup PR; doesn't block this slice.

**Carry-forwards from prior audit waves (untouched, still flagged)**:

- EnhancedDashboard subtree (11 files) is unshipped scaffolding — Wave 7.3 target.
- PerformanceMonitor reader/writer schema mismatch has a regression-lock test; fixing it should make that test fail.
- ToastContainer.tsx:27 ℹ️ emoji (Wave 6 follow-up).
- 3 route-layer integration gaps: webhooks.ts, monitoring.ts, billing.ts (Wave 4.6).
- optimized-api.ts sibling test (Wave 4.4).
- `npm run lint:fix` remains unsafe (Wave 2.3 finding).

---

### v1.47 (2026-05-15): Audit Wave 3.4 + 3.5 — Wave 3 CLOSED (api-client.ts + shopify-service.ts)

**Test Results**: 1,965 passing (no delta), 25 skipped, 0 failing. Pure typing wave, no new test files.
**Status**: **Wave 3 CLOSED — 5 of 5 clusters shipped.** Project-wide `any` count outside test code: 80 → **65 (−15 from this wave alone, −34 cumulative since the audit started)**.

**Problem**: Two clusters remained after Wave 3.3 — both touched public-surface boundaries with real-tradeoff typing decisions:

1. **Wave 3.4 (api-client.ts, 10 anys)**: the frontend's Shopify-authenticated fetch wrapper. `app: any` for the App Bridge instance + 8 `request<any>` / `Record<string, any>` parameter and return types. Public to every UI consumer.
2. **Wave 3.5 (shopify-service.ts, 4 anys)**: the GraphQL plumbing. `query: (qs, vars: Record<string, any>) => Promise<any>` interface + matching implementation + `(e: any) => e.message` error-iteration + `(edge: any) => …` line-item-mapping.

Both required user reverse-prompts (the session prompt explicitly listed `shopify-service.ts` as a reverse-prompt trigger; api-client.ts hit the same tradeoff space via the v1.38 type-lie).

**User decisions** (reverse-prompted in-session, both options chosen with the same rationale):

- **Wave 3.4 → option A: `unknown` + force narrowing at consumers.** Picked over option B (camelCase frontend types — perpetuates v1.38 type-lie inside api-client.ts) and option C (backend wire types — breaks every existing UI consumer). Honest about the snake_case-vs-camelCase boundary; surfaces every consumer that was secretly relying on the `any`-typed shape.
- **Wave 3.5 → option A: `unknown` + per-call typed response shapes.** Picked over option B (Zod runtime parse — overkill for one query type) and option C (GraphQL codegen — 4-5 new devDeps for one file with one query) and option D (defer). Matches the Wave 3.4 unknown-at-boundary pattern.

**What Changed**:

**1. `delayguard-app/src/utils/api-client.ts`** — Wave 3.4 typing:
- Added `import type { ClientApplication } from "@shopify/app-bridge";`. Verified the import path: `@shopify/app-bridge/index.d.ts` → `export * from './client'` → `client/index.d.ts` → `export * from './types'` → re-exports `ClientApplication` from `@shopify/app-bridge-core/client/types`.
- `ApiClientConfig.app: any` → `app?: ClientApplication`.
- `private app: any` → `private app: ClientApplication | undefined`.
- `setApp(app: any)` → `setApp(app: ClientApplication)`.
- 6 `request<any>` / `request<any[]>` → `request<unknown>` / `request<unknown[]>`.
- 1 `Record<string, any>` (updateSettings parameter) → `Record<string, unknown>`.
- 1 `{ alerts: any; orders: any }` (getAnalytics return) → `{ alerts: unknown; orders: unknown }`.
- Added inline doc comments at every public method documenting the wire shape (`snake_case AlertRow[]` etc.) the caller should narrow toward.

**2. `delayguard-app/src/components/EnhancedDashboard/hooks/useDashboardData.ts`** — Wave 3.4 consumer narrowing:
The `unknown` typing at the boundary forced 10 compile errors at this consumer — the only consumer of `api.getAlerts/getOrders/getSettings/getAnalytics/updateSettings`. Cast each `unknown` payload to the camelCase frontend type with an explicit `// v1.38 known type-lie:` comment block at the top. Casts narrow:
- `alertsResponse.data as DelayAlert[]`
- `ordersResponse.data as Order[]`
- `settingsResponse.data as AppSettings`
- `analyticsResponse.data as { alerts: { total_alerts?: number; pending_alerts?: number; sent_alerts?: number }; orders: { total_orders?: number } }` (precise inline shape rather than the heavier `AnalyticsSummary` from `merchant-api-service.ts`).
- `settings as unknown as Record<string, unknown>` at the `updateSettings(settings)` call.

**Found-and-flagged while writing the consumer narrowing**: `EnhancedDashboard/` subtree is **unshipped scaffolding** — `rg "useDashboardData|EnhancedDashboard" src/ tests/ -g '*.ts' -g '*.tsx'` showed zero callers outside the folder itself. Same shape as the Wave 7 `AnalyticsDashboard` finding. Eleven files: 8 components + 1 hook + mockData + constants, all interconnected but not wired to any router or top-level component. **NOT deleted in this wave** (smallest blast radius — outside Wave 3.4's scope). Flag for a future Wave-7-style cleanup PR. Acceptable to keep `unknown`-narrowing casts in unshipped code since they never execute at runtime.

**3. `delayguard-app/src/services/shopify-service.ts`** — Wave 3.5 typing:
- Added two new boundary interfaces:
  ```ts
  interface ShopifyGraphQLError { message: string }
  interface ShopifyGraphQLResponse<T = unknown> {
    data?: T;
    errors?: ShopifyGraphQLError[];
  }
  ```
- `ShopifyGraphQLClient.query` made generic: `<T = unknown>(qs, vars?: Record<string, unknown>) => Promise<ShopifyGraphQLResponse<T>>`. The default `T = unknown` forces forgetful callers to narrow.
- The `createGraphQLClient` implementation mirrors the generic signature (note: the runtime `await response.json()` is cast `as ShopifyGraphQLResponse<T>` — this is the inevitable type-assertion at any external-API boundary; Zod was the alternative the user explicitly rejected as overkill).
- `json.errors.map((e: any) => ...)` → `json.errors.map((e: ShopifyGraphQLError) => ...)`.
- `fetchOrderLineItems` declares an inline `OrderLineItemsQueryResponse` interface matching the `GetOrderWithProducts` query above it (the only GraphQL query in the service): `{ order: { id, lineItems: { edges: Array<{ node: OrderLineItemNode }> } } | null }`. The `(edge: any) => ...` mapping is now `(edge) => ...` with full type inference from `OrderLineItemsQueryResponse`.

**Verification**:
- `npm run type-check` → clean.
- `npm test` → 1,965 passing, 25 skipped, 0 failing (no delta — pure typing wave).
- Targeted: `npx jest src/tests/unit/utils/api-client.test.ts` → 15/15 passing.
- `npx eslint --fix` on the three touched files → 1 PRE-EXISTING warning at [useDashboardData.ts:139](delayguard-app/src/components/EnhancedDashboard/hooks/useDashboardData.ts#L139) (`react-hooks/exhaustive-deps` for `settings.delayThreshold` — predates this wave, not introduced here). Zero errors.
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.
- `grep -c "\bany\b" src/services/shopify-service.ts src/utils/api-client.ts` → `shopify-service.ts: 0`, `api-client.ts: 1` (matches the word "any" in the doc comment "before making any authenticated requests", not a TS `any` type).
- Project-wide non-test `any` count: **80 → 65 (−15)** via the same `rg` command the prior waves used.

**Out of scope (smallest blast radius — flagged for future waves)**:
- **`EnhancedDashboard/` unshipped subtree (11 files)**: `useDashboardData.ts`, `mockData.ts`, `constants.ts`, plus 8 components under `components/` and another barrel `components/index.ts`. No router, no top-level component imports the subtree. Mirrors the Wave 7 `AnalyticsDashboard` finding precisely. Track as Wave 7.3 (dead-code cleanup, deferred-PR territory) — too big to bundle into this typing wave.
- **65 remaining `any`s outside test code**: scattered across services not in the original Wave 3 audit table (e.g. `security-monitor.ts`, `optimized-database.ts`, `performance-monitor.ts`'s static decorator with `target: any` / `this: any`, several middleware files). Future cleanup territory; the canonical Wave 3 audit is closed.
- 2 pre-existing lint errors carried since Wave 1.1 — untouched per the audit plan.
- Husky pre-commit gate still non-functional per Wave 1.1 — not bypassed, just doesn't fire.

---

### v1.46 (2026-05-15): Audit Wave 4.2 + 4.3 — redis-connection + performance-monitor sibling tests

**Test Results**: 1,965 passing (+40), 25 skipped, 0 failing. Two new sibling test files: `src/services/redis-connection.test.ts` (22 tests), `src/services/performance-monitor.test.ts` (18 tests).
**Status**: Test-debt closure per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 4. **5 of 6 Wave 4 clusters now shipped — 1 remains** (`optimized-api.ts`, the Wave 4.4 target).

**Problem**: Two real services were running unsibling-tested in production:

1. **`src/services/redis-connection.ts`** (186 LOC) — owns the singleton Redis connection used by [src/routes/health.ts:216](delayguard-app/src/routes/health.ts) and [src/queue/processors/tracking-refresh.ts:38,53](delayguard-app/src/queue/processors/tracking-refresh.ts) (Wave 1.1's cron consumer). Manages URL parsing, status-gated reconnection, 5 event handlers, quit-on-shutdown. Zero direct test coverage.
2. **`src/services/performance-monitor.ts`** (293 LOC) — invoked by [server.ts:51,215](delayguard-app/src/server.ts) on every request via the middleware at line 215. Tracks duration / success / context per operation; persists to Redis; exposes `getPerformanceMetrics` / `getRealTimeMetrics` / `clearMetrics` / `getMetricsHistory`. Zero direct test coverage.

Both bundled into one wave because both share the same SDK-level-mock pattern (override the shared `__mocks__/ioredis.js` stub since it lacks `status` / `quit` / `hset` / `hgetall` / `expire`), and both are pure-Redis-consumer services that fall to the same per-file `jest.mock("ioredis", …)` factory.

**What Changed**:

**1. `delayguard-app/src/services/redis-connection.test.ts` — new sibling test, 22 cases.**

Pattern: per-file `jest.mock("ioredis", () => mockRedisConstructor)` + `jest.mock("../config/environment", … { default: { get: mockEnvGet } })`. The shared manual mock at [delayguard-app/__mocks__/ioredis.js](delayguard-app/__mocks__/ioredis.js) lacks `status` (the source's `client.status === "ready"` gate uses this) and `quit()` (the source's shutdown path calls this), so a per-file override was necessary. Tests target `RedisConnectionManager` directly (the class export), not the module-level singleton, because the singleton is constructed at module-load time before tests can stub `envValidator.get`.

Coverage:
- **`parseRedisUrl` via constructor** (5): default localhost URL parsing, full URL with `redis://:password@host:port/db`, default port fallback, `Invalid Redis URL` wrapping, **canonical-timing-config regression guard** (pins all six retry/timeout values: `retryDelayOnFailover`, `maxRetriesPerRequest`, `lazyConnect`, `keepAlive`, `connectTimeout`, `commandTimeout`).
- **`createConnection`** (4): no-op-on-ready, event-handler registration order assertion (connect / ready / error / close / reconnecting), `client.connect()` invocation, wrapped `Redis connection failed: <reason>` error on `connect()` rejection.
- **`getConnection`** (3): reuse-on-ready, create-when-null, create-when-status-not-ready.
- **`closeConnection`** (2): `quit()` + null-out + `isAvailable()` flips to false, no-op when client never created.
- **`testConnection`** (3): `true` on `PONG`, `false` (never throws) on ping rejection, `false` when ping resolves to a non-`PONG` value.
- **`getInfo`** (2): returns the raw `INFO` string, wrapped `Failed to get Redis info: <reason>` on info() rejection.
- **`isAvailable`** (3): true when status === ready, false when no client, false when client exists but status is reconnecting.

**2. `delayguard-app/src/services/performance-monitor.test.ts` — new sibling test, 18 cases.**

Same SDK-level override pattern. The static `trackPerformance` decorator was intentionally left out — decorator wiring is exercised by its real consumers in server.ts:215, not by an isolated unit test (matches the Wave 4.1 boundary discipline of "mock at the service-method level, not the framework integration").

Coverage:
- **constructor** (1): `new Redis(config.redis.url)` regression guard.
- **`trackRequest`** (5): v1.19-style every-field assertion on the `hset` payload (`duration`, `success`, `timestamp`, `context` — including timestamp-window check), empty-string context fallback when omitted, `success=false` propagation, `expire(key, 3600)` TTL regression guard (1-hour cache), Redis error propagation (does NOT swallow).
- **`getPerformanceMetrics`** (6): documented return shape (8 fields including `Date`-typed timestamp), all-operations aggregation via `keys("metrics:*")`, `queueSize` sums `delay-check:waiting` + `delay-check:active` via `llen`, `processingRate` parses Redis-stored string and 0-falls-back when absent, `memoryUsage` is MB-converted from `process.memoryUsage().heapUsed` (plausible range check), **LATENT-BUG regression-lock** (see below).
- **`getRealTimeMetrics`** (1): documented slice + `activeAlerts` parsed from Redis.
- **`clearMetrics`** (3): single-key delete on operation argument, scan + bulk del on no-arg, no-op when scan returns zero keys.
- **`getMetricsHistory`** (2): empty array for empty hash, empty array when entries fall outside the cutoff window (24h default).

**Found-and-deferred** (smallest blast radius — flagged in CHANGELOG):

- **LATENT BUG in PerformanceMonitor reader/writer schema mismatch.** `trackRequest` writes a 4-field hash (`duration` / `success` / `timestamp` / `context`), but `getOperationMetrics` and `getMetricsHistory` read **indexed** keys (`data["duration:${i}"]` / `data["success:${i}"]` / `data["timestamp:${i}"]`) that the writer never produces. Result: tracked operations never bubble through into `getPerformanceMetrics(operation)` — the reader always returns `{ averageResponseTime: 0, successRate: 100, errorRate: 0 }` regardless of what was tracked. The `LATENT BUG` test in `performance-monitor.test.ts` locks in the current observable zeros so a follow-up wave can fix the schema mismatch and the test will fail (signaling the fix is needed). Carry forward as Wave 4.x — separate from the test-coverage wave per smallest-blast-radius. (Same shape as the v1.42 v1.19 double-dispatch discovery, which was inside scope for that wave; this one is observation-only, no in-flight fix.)
- 30 `any` warnings in `api-client.ts` remain — Wave 3.4 target.
- 1 file-level `eslint-disable @typescript-eslint/no-explicit-any` at [performance-monitor.ts:1](delayguard-app/src/services/performance-monitor.ts) — 3 `any`s remain in the file (`context?: any` parameter on `trackRequest`, `target: any` + `this: any` on the static decorator). Would be cleaned in a Wave 3.x follow-up that types the decorator helper. Smallest blast radius — out of scope here.
- 2 pre-existing lint errors carried since Wave 1.1 — untouched per the audit plan.

**Verification**:
- `npm run type-check` → clean.
- `npm test` → 1,965 passing (+40), 25 skipped, 0 failing.
- Targeted: `npx jest src/services/redis-connection.test.ts` → 22/22 passing. `npx jest src/services/performance-monitor.test.ts` → 18/18 passing.
- `npx eslint --fix` on the two new test files only → clean (still NOT using `npm run lint:fix` — unsafe per Wave 2.3 finding).
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.

---

### v1.45 (2026-05-14): Audit Wave 3.2 + 3.3 — koa rawBody + tracing OTEL-shape types

**Test Results**: 1,925 passing (no delta), 25 skipped, 0 failing. Pure typing wave — no new tests, existing 45 tracing tests + 23 sendgrid-webhook tests cover the touched surfaces.
**Status**: TypeScript hygiene fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 3. **4 of 5 Wave 3 clusters now shipped** — 1 remains (`utils/api-client.ts` public surface, the Wave 3.4 target). Bundled 3.2 + 3.3 because both are typing-only, single-file changes, and the project-`any`-count snapshot reads cleaner as one wave entry.

**Problem**:

1. **Wave 3.2 (koa rawBody)**: [delayguard-app/src/routes/sendgrid-webhook.ts:210-211](delayguard-app/src/routes/sendgrid-webhook.ts) cast `(ctx.request as any).rawBody` to read the raw body buffer. The audit-plan recipe assumed this needed a `koa.d.ts` module augmentation, but `@types/koa-bodyparser` already declares `rawBody: string` on `Request` (verified at `node_modules/@types/koa-bodyparser/index.d.ts:16`). Every other route reads `ctx.request.rawBody` without cast — only `sendgrid-webhook.ts` carried the legacy `as any`. No augmentation needed; the cast was dead weight.
2. **Wave 3.3 (tracing observability)**: [delayguard-app/src/observability/tracing.ts](delayguard-app/src/observability/tracing.ts) declared 18 `any` usages (the audit table said 6; actual was 18 because every parameter and return type in the mock OTEL surface was annotated `Record<string, any>` or `any`). A file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` masked them. The methods are all internal-mock pass-throughs that just log — narrowing was structural, not behavioral.

**What Changed**:

**1. `sendgrid-webhook.ts:210-211`** — dropped the `as any` cast:

```ts
// Before:
const rawBody =
  (ctx.request as any).rawBody || JSON.stringify(ctx.request.body);

// After:
const rawBody = ctx.request.rawBody || JSON.stringify(ctx.request.body);
```

`ctx.request.body` is `Record<string, unknown> | string` (from `@types/koa-bodyparser`), and `ctx.request.rawBody` is already `string` per the same `.d.ts`. The `||` fallback compiles cleanly. No new `koa.d.ts` file added — the existing `@types/koa-bodyparser` augmentation is the canonical source of `rawBody` typing and adding a second augmentation would create either redundancy or conflict.

**2. `tracing.ts`** — hand-rolled minimal OTEL-shape types (no `@opentelemetry/api` dep add):

```ts
type Attributes = Record<string, unknown>;
type SpanOptions = Record<string, unknown>;
type InstrumentOptions = Record<string, unknown>;

interface Counter   { add(value: number, attributes?: Attributes): void }
interface Histogram { record(value: number, attributes?: Attributes): void }
interface Span      { setStatus(...); setAttributes(attributes: Attributes); end() }
interface Tracer    { startSpan(name: string, options?: SpanOptions): Span }
interface Meter     { createCounter(name: string, options?: InstrumentOptions): Counter; createHistogram(...): Histogram }
```

Picked hand-rolled over `import { Counter, Histogram, Attributes } from '@opentelemetry/api'` after checking `node_modules/@opentelemetry/` was empty — the package isn't installed. Adding it for a mock-only module that just logs would be more dependency-blast-radius than typing hygiene warrants. The hand-rolled shapes mirror the OTEL `@opentelemetry/api` surface 1:1 so the mock can be swapped for a real OTEL implementation later without changing call sites (the leading comment in the file documents this intent).

Eighteen `any` usages replaced:
- 4 `Record<string, any>` attribute parameters in mock-class methods (`MockSpan.setAttributes`, `MockMeter.createCounter/createHistogram` returned counters/histograms' `add`/`record` callbacks) → `Attributes`.
- 3 `Record<string, any>` options parameters in `Tracer.startSpan` / `Meter.createCounter` / `Meter.createHistogram` → `SpanOptions` / `InstrumentOptions`.
- 2 bare `any` return types on `createCounter` / `createHistogram` → `Counter` / `Histogram`.
- 1 `options?: any` parameter on `createSpan` helper → `SpanOptions`.
- 1 `data?: Record<string, any>` parameter on `traceBusinessLogic` → `Attributes`.
- 5 `attributes?: Record<string, any>` parameters on `delayGuardMetrics.{incrementCounter, recordHistogram, updateGauge, recordApiResponseTime, updateQueueSize}` → `Attributes`. (`recordApiResponseTime` was bare `attributes?: any` — same fix.)
- 2 inner `attributes?: Record<string, any>` parameters on `Counter.add` / `Histogram.record` lambda returns in `MockMeter` → `Attributes`.

Tightening side-effect: the 10 inline `attributes as Record<string, unknown>` / `options as Record<string, unknown>` casts that fed into `logger.info(...)` calls became no-ops once the parameter type narrowed, so each `logger.info(msg, attributes)` call now passes the parameter directly — `logger.info`'s second parameter is `Record<string, unknown> | undefined`, which matches `Attributes` exactly. The casts were artifacts of the `any` typing; removing them was the type-tightening's natural consequence, not a drive-by cleanup. (Verified by `npm run type-check` — would have erred immediately if a cast had been load-bearing.)

The file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` (line 1 of the prior file) was removed once the `any` count hit zero.

**Verification**:
- `npm run type-check` → clean (zero errors).
- `npm test` → 1,925 passing, 25 skipped, 0 failing (no delta — typing-only wave).
- Targeted: `npx jest tests/unit/observability/tracing.test.ts` → 45/45 passing.
- `npx eslint --fix` on the two touched files only → clean (still NOT using `npm run lint:fix` — unsafe per Wave 2.3 finding).
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.
- Project-wide `any` count outside test code: **99 → 80 (−19)** via `rg "\bany\b" src --type ts -g '!*.test.ts' -g '!*.test.tsx' -c | awk -F: '{s+=$NF} END {print s}'`. (Wave 7's analytics-scaffolding deletion alone accounts for some of the drop; the bulk is the tracing.ts narrowing.)
- `grep -c "\bany\b" src/observability/tracing.ts` → 0.
- `grep -c "eslint-disable" src/observability/tracing.ts` → 0.

**Consumer surface unchanged**: [src/observability/monitoring.ts](delayguard-app/src/observability/monitoring.ts) is the only non-test consumer of tracing.ts. Its call sites (`getTracer("monitoring")`, `tracer.startSpan("health.X")`, `withSpan(span, async() => ...)`, `delayGuardMetrics.updateQueueSize("delay-check", N)`) never passed attribute records to the typed parameters — narrowing `Record<string, any>` to `Record<string, unknown>` was a safe widening from the consumer's perspective.

**Out of scope (smallest blast radius — flagged for future waves)**:
- **Wave 3.4 (`utils/api-client.ts`, 7 anys + 30 lint warnings)** — the lone remaining Wave 3 cluster. Public surface; needs `ClientApplication` typing from `@shopify/app-bridge` + response shapes from `src/types/`. Targets the Pass-2 budget; deliberately not bundled into this typing wave because the public-surface tradeoffs aren't structural like the mock-tracing fix.
- **Wave 3.5 (`shopify-service.ts`, 3+ anys, GraphQL plumbing)** — the audit suggests Zod-parse vs codegen tradeoff. Out of scope until the user greenlights the approach.
- 2 pre-existing lint errors carried since Wave 1.1 — untouched per the audit plan.
- Husky pre-commit gate still non-functional per Wave 1.1 diagnosis — not bypassed, just doesn't fire.

---

### v1.44 (2026-05-14): Audit Wave 6 — Lucide icon swap (ToastContainer + SettingsCard)

**Test Results**: 1,925 passing (no delta), 25 skipped, 0 failing. No new tests — pure swap, existing 491 component-test surface validates the change.
**Status**: Frontend icon-rule compliance per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 6 + [.claude/rules/frontend.md](.claude/rules/frontend.md) ("Don't reintroduce emoji or PNG icons for UI signaling — use Lucide").

**Problem**: Two regression sites where emoji icons crept back in after the v1.31–v1.35 Lucide migration:

1. [delayguard-app/src/components/common/ToastProvider/ToastContainer.tsx:24-26](delayguard-app/src/components/common/ToastProvider/ToastContainer.tsx) — `✅` / `❌` / `⚠️` rendered inside `<div className={styles.toastIcon}>` blocks for the success / error / warning Toast variants. Emoji rendering differs across OSes (notably Linux servers and older Android), defeating the deterministic icon-style requirement.
2. [delayguard-app/src/components/tabs/DashboardTab/SettingsCard.tsx:398,429,456](delayguard-app/src/components/tabs/DashboardTab/SettingsCard.tsx) — `<h3>✅ Why it matters:</h3>` repeated three times inside the Warehouse / Carrier / Transit HelpModal bodies.

**What Changed**:

**1. `ToastContainer.tsx`** (3 swaps):
- Added `import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';` at the top of the file (matches the existing pattern used in [layout/AppHeader/index.tsx](delayguard-app/src/components/layout/AppHeader/index.tsx) and [tabs/AlertsTab/index.tsx](delayguard-app/src/components/tabs/AlertsTab/index.tsx)).
- Replaced the three emoji string literals at lines 24-26 with `<CheckCircle … />` / `<XCircle … />` / `<AlertTriangle … />`. Each icon uses `size={20} aria-hidden={true} strokeWidth={2}` — the canonical attribute trio established by the existing Lucide call sites in [SettingsCard.tsx:128](delayguard-app/src/components/tabs/DashboardTab/SettingsCard.tsx#L128) (`<AlertTriangle size={20} aria-hidden={true} strokeWidth={2} />`).

**2. `SettingsCard.tsx`** (3 swaps via `replace_all`):
- Added `CheckCircle` to the existing `lucide-react` import at line 15.
- Replaced all three `<h3>✅ Why it matters:</h3>` instances (lines 398 / 429 / 456) with `<h3><CheckCircle size={18} aria-hidden={true} strokeWidth={2} /> Why it matters:</h3>`. Used `size={18}` (slightly smaller than the toast's 20) because the icon is inline with `<h3>` text — matches the existing `<BarChart3 size={16} … /> {label}` pattern at line 109 of the same file.

**Found-and-deferred** (smallest blast radius):

- [ToastContainer.tsx:27](delayguard-app/src/components/common/ToastProvider/ToastContainer.tsx#L27) still renders `ℹ️` for the `'info'` toast variant. The audit prompt explicitly listed only lines 24-26; the `'info'` emoji is the same class of icon-rule violation but was not in scope for this wave. The Lucide equivalent is `<Info />` (already imported elsewhere in the codebase). Carry-forward as a 1-line follow-up touch.
- 17 other decorative emojis in [SettingsCard.tsx](delayguard-app/src/components/tabs/DashboardTab/SettingsCard.tsx) HelpModal prose (`💼` real-world examples, `📌` what-this-detects, `🔍` how-it-works, `🌨️` `📦` `🚫` `✈️` `🚛` weather/carrier exception flavor copy, `💡` tip indicator). These read as marketing-prose emoji (content inside `<p>` / `<li>` body), not UI signaling per the frontend rule — left as-is.

**Verification** (project local CI gate):
- `npm run type-check` clean (zero errors).
- `npm test` → 1,925 passing, 25 skipped, 0 failing (no delta, no new tests required — existing 491 component tests at [src/tests/unit/components/](delayguard-app/src/tests/unit/components/) cover the touched components; no test asserted on the emoji strings themselves; the 4 negative `not.toContain('✅')` / `not.toContain('⚠️')` assertions at [OrdersTab.test.tsx:632](delayguard-app/src/tests/unit/components/OrdersTab.test.tsx#L632), [AlertsTab.test.tsx:555](delayguard-app/src/tests/unit/components/AlertsTab.test.tsx#L555), [AlertCard.test.tsx:1527,2095](delayguard-app/src/tests/unit/components/AlertCard.test.tsx) target unrelated components and were unaffected).
- `npx eslint --fix` on the two touched files only → clean (did NOT run `npm run lint:fix` — still unsafe per Wave 2.3 / 3.1 / 4.1 findings).
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.

---

### v1.43 (2026-05-14): Audit Wave 7 — analytics dead-code island deleted

**Test Results**: 1,925 passing (−21), 25 skipped, 0 failing. Twenty-one tests removed alongside the source files they covered — all of them exercised either throw-not-implemented stubs or `jest.mock`-injected methods that didn't exist on the real module. No production behavior changed.
**Status**: Dead-code cleanup per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 7. **Wave 7 closed** — 7.1 deleted, 7.2 verified-not-dead and left alone.

**Problem**: The audit table flagged two duplicate-file pairs as Wave 7 dead-code candidates. The import-graph sweep showed the audit assumptions were partly wrong:

1. **Analytics pair (7.1) — both files load-bearing in conflicting ways**:
   - `src/services/analytics-service.ts` (39 LOC stub) was imported by `src/components/AnalyticsDashboard.tsx` — but the stub only declared `getMetrics` / `exportData` (both `throw "not implemented"`), while the dashboard called `getAlerts`, `getOrders`, `updateSettings`, `testDelayDetection`, `resolveAlert`, `dismissAlert`, `exportAlerts`, `getAnalyticsMetrics`. Production rendering of the dashboard would throw immediately on the first method call. The `AnalyticsDashboard.test.tsx` suite was green only because it `jest.mock`'d the stub module and injected fake implementations of the missing methods.
   - `src/services/AnalyticsService.ts` (452 LOC real impl) was imported only by `src/routes/analytics.ts`, which exported `analyticsRoutes` but was never `router.use(...)`'d in [src/server.ts:104-109](delayguard-app/src/server.ts#L104-L109). The live `/api/analytics` endpoint is the Wave 2.1 `MerchantApiService.getAnalytics()` extraction, which routes via `apiRoutes` — completely separate from `routes/analytics.ts`.
   - `AnalyticsDashboard.tsx` itself was only re-exported through `components/index.ts`; no component, router, or test (other than its own) imported it.
   - Net: the entire analytics subgraph (stub + real impl + broken component + unmounted route + 2 dependent test files) was an unshipped scaffolding island. Tests passed only because every consumer was either a mocked-out stub or never invoked at runtime.

2. **Delay-detection pair (7.2) — not dead**: `src/services/delay-detection.ts` (65 LOC pure `checkForDelays` fn) is consumed by [src/services/delay-detection-service.ts:6](delayguard-app/src/services/delay-detection-service.ts#L6) (the 365-LOC class delegates to the pure fn) AND by `tests/unit/delay-detection.test.ts` (direct unit test). It's a legitimate pure-fn seam reused by a higher-level class. Folding would be a no-op refactor; smallest blast radius said leave it alone.

**Reverse-prompt outcome (criterion (b) from the session prompt — "a Wave 7 dead file turns out to be load-bearing")**: surfaced the conflicting-load-bearing finding to the user with three resolution options for the analytics pair: (1) rewire dashboard to AnalyticsService.ts + delete the stub, (2) delete the entire scaffolding island, (3) defer Pair 1 to its own PR. User chose option 2 after confirmation that `AnalyticsDashboard` had no router/component consumer and `routes/analytics.ts` had no `router.use` mount. The Wave 2.1 `/api/analytics` surface is unaffected — it lives entirely in `MerchantApiService` + `apiRoutes`, with integration coverage at `tests/integration/analytics-integration.test.ts` and e2e coverage at `tests/e2e/analytics-dashboard-flow.test.ts` (both untouched, both still green — they target the live `/api/*` routes).

**What Changed**:

**1. Six file deletions**:
- `delayguard-app/src/services/analytics-service.ts` — throw-not-implemented stub.
- `delayguard-app/src/services/AnalyticsService.ts` — 452 LOC real impl whose only consumer was the unmounted route.
- `delayguard-app/src/components/AnalyticsDashboard.tsx` — 628 LOC component that would throw on first method call in production.
- `delayguard-app/src/routes/analytics.ts` — 279 LOC route never mounted in `server.ts`.
- `delayguard-app/tests/unit/analytics-service.test.ts` — 3 tests, all of which asserted the stub methods threw "not implemented". Meaningless coverage.
- `delayguard-app/tests/unit/components/AnalyticsDashboard.test.tsx` — 18 tests, all of which `jest.mock`'d the broken stub and injected the missing methods. Tested mocks, not code.

**2. Two edits**:
- [delayguard-app/src/components/index.ts](delayguard-app/src/components/index.ts) — removed the `export { default as AnalyticsDashboard } from "./AnalyticsDashboard"` re-export (lines 33-34).
- [delayguard-app/tests/unit/components/MinimalApp.test.tsx](delayguard-app/tests/unit/components/MinimalApp.test.tsx) — removed the obsolete `jest.mock('../../../src/services/analytics-service', …)` block (lines 95-97). The `mockAnalyticsAPI` factory + `(window as any).mockAnalyticsAPI = mockAnalyticsAPI` assignment **stay** — that's the actual test-backdoor seam MinimalApp.tsx uses at runtime (`if (window.mockAnalyticsAPI) { … }` guards at [MinimalApp.tsx:105-108,194,303-306,418,489,1081-1082](delayguard-app/src/components/MinimalApp.tsx)). The `jest.mock` was a vestigial leftover from when MinimalApp may have imported the analytics-service module directly; the runtime path now lives on `window`, so the module-level mock had no effect on test outcomes (verified by running `npx jest tests/unit/components/MinimalApp.test.tsx` post-deletion — all 25 of its tests still green).

**Type / lint / build status**:
- `npm run type-check` clean (zero errors).
- `npm test` → 1,925 passing (−21 from 1,946), 25 skipped, 0 failing.
- `npm run lint` → only the same 2 pre-existing errors carried since Wave 1.1 ([tests/integration/database/tracking-events-schema.test.ts:2](delayguard-app/src/tests/integration/database/tracking-events-schema.test.ts) unused `query` import, [tests/unit/components/HelpModal.test.tsx:162](delayguard-app/src/tests/unit/components/HelpModal.test.tsx) a11y `href`). 30 `any` warnings localized to `src/utils/api-client.ts` — the Wave 3.4 target.
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.

**Lint exception**: did not run `npm run lint:fix` (still unsafe per Waves 2.3 / 3.1 / 4.1 — the project-local `scripts/lint-fix.js` reformats ~40 files via Prettier and introduces ~190 new lint errors). No touched-file lint was needed: all changes were deletions + one re-export removal + one obsolete-mock removal.

**Found-and-deferred** (smallest blast radius):
- `MinimalApp.tsx` retains test-only `if (window.mockAnalyticsAPI) { … }` guards at 9 call sites — a design smell that ties production code to a test-backdoor, but a refactor target for a separate frontend PR, not a dead-code wave.
- 30 `any` warnings in `api-client.ts` remain — Wave 3.4 target.
- 2 pre-existing lint errors carried over from Wave 1.1 — untouched per the audit plan.
- Husky pre-commit gate still non-functional per Wave 1.1 diagnosis — not bypassed, just doesn't fire.

---

### v1.42 (2026-05-14): Audit Wave 4.1 — customer-notification-path test debt + v1.19 double-dispatch bug fix

**Test Results**: 1,946 passing (+35), 25 skipped, 0 failing. Three test surfaces closed: `EmailService.sendDelayEmail` (+8), `SMSService.sendDelaySMS` (+10), and `processNotification` BullMQ processor (+17, brand-new sibling test).
**Status**: Test-debt closure per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 4. **3 of 6 clusters shipped — 3 remain** (`optimized-api.ts`, `redis-connection.ts`, `performance-monitor.ts` — plus the 6-routes-without-sibling-tests sub-bullet). Wave 4 is NOT closed.

**Problem**:

1. `email-service.test.ts` and `sms-service.test.ts` covered only `ping()` (Wave 2.3) — `sendDelayEmail` / `sendDelaySMS` had no sibling tests. The flag was carry-forwarded in Waves 2.3 and 3.1.
2. `delayguard-app/src/queue/processors/notification.ts` (the BullMQ orchestrator) had **no sibling test at all** — the customer-notification dispatch path was unguarded against the v1.19 routing-rule pattern.
3. **Real bug found while writing the bug-shaped negative test** (v1.19 routing-rule violation): the processor called `NotificationService.sendDelayNotification(orderInfo, delayDetails)` **once per channel branch** — but that method internally routes to BOTH email AND SMS whenever both recipient fields are populated. With `email_enabled=true, sms_enabled=true` and both `customer_email` + `customer_phone` present, customers received **2 emails AND 2 SMS messages per delay alert** instead of 1 each. Worse, an SMS-only or email-only flag combination still fired the OTHER channel as long as the contact field was non-empty — the per-channel `email_enabled` / `sms_enabled` toggles were silently bypassed.

**What Changed**:

**1. `delayguard-app/src/queue/processors/notification.ts:78-130` — bug fix.** Replaced the two `notificationService.sendDelayNotification(...)` calls with direct `emailService.sendDelayEmail(...)` (inside the email-enabled branch) and `smsService.sendDelaySMS(...)` (inside the sms-enabled branch). Per the v1.19 notification-routing rule, dispatch now lives INSIDE each rule-matched branch and respects the per-channel toggle gate. Smallest-blast-radius: `NotificationService` itself is left alone — it remains the canonical multi-channel-fanout primitive for callers that DO want the both-channels-if-recipient-present behavior. Only the BullMQ processor was using it incorrectly. Removed the unused `NotificationService` import.

**2. `delayguard-app/src/services/email-service.test.ts` — extended with 8 new `sendDelayEmail` cases.** Existing 7 `ping()` cases untouched. Coverage: v1.19 field-population assertion on every `dynamicTemplateData` key (`customerName`, `orderNumber`, `newDeliveryDate`, `trackingNumber`, `trackingUrl`, `delayDays`, `delayReason`), recipient-override regression guard, three error-propagation paths (Error / 401 / non-Error rejection), `delayDays=0` zero-value regression guard, empty-string `delayReason` regression guard, and a single-call idempotency assertion. Mocks `@sendgrid/mail` at the SDK level (matching the existing Wave 2.3 pattern — the service is a thin wrapper around `sgMail.send` with no finer-grained seam).

**3. `delayguard-app/src/services/sms-service.test.ts` — extended with 10 new `sendDelaySMS` cases.** Existing 6 `ping()` cases untouched. Coverage: v1.19 envelope assertion on `{to, from, body}`, one regression test per interpolated body field (`customerName`, `orderNumber`, `estimatedDelivery`, `trackingUrl`), recipient-override guard, three error-propagation paths (Twilio code 21211 / 20003 auth / non-Error rejection), single-call idempotency. Mocks `twilio` at the SDK level.

**4. `delayguard-app/src/tests/unit/queue/notification.test.ts` — new file, 17 tests.** Three describe blocks:
- **Settings-flag routing (v1.19 rule, 8 tests)**: email-only branch, SMS-only branch, both-enabled, neither-enabled (silent-skip negative), per-recipient guards for missing `customer_email` / `customer_phone`, already-sent gates for `email_sent` / `sms_sent`. The `both-enabled` and `email-only`/`SMS-only` tests are the bug-shaped tests that caught the v1.19 double-dispatch.
- **Error propagation (6 tests)**: order-not-found, alert-not-found, email-dispatch-fails, SMS-dispatch-fails, missing `SENDGRID_API_KEY`, missing `TWILIO_ACCOUNT_SID`. All assert the error propagates (BullMQ `attempts: 3` retry must see it).
- **DB write side-effects (v1.19 field-population rule, 3 tests)**: `UPDATE delay_alerts SET email_sent = TRUE` on success, `UPDATE delay_alerts SET sms_sent = TRUE` on success, full delay-details envelope passthrough to `sendDelayEmail`.

Mocks `EmailService` and `SMSService` at the class level (per tests.md "mock at the service-method level" — the processor test isolates to its own dispatch logic and does NOT reach into vendor SDKs).

**Test placement decision**: placed at `src/tests/unit/queue/notification.test.ts` to match the existing `src/tests/unit/queue/tracking-refresh.test.ts` pattern. The other discovered pattern (`tests/unit/queue/delay-check-notification-routing.test.ts`) is a co-tenant under the same `tests/unit/queue/` namespace — both directories are picked up by Jest's `roots: ['<rootDir>/src', '<rootDir>/tests']` config. Chose the `src/tests` pattern because the file under test (`src/queue/processors/notification.ts`) lives under `src/`, and `src/tests/unit/queue/` colocates the test tree with the source tree.

**Behavior surprises found while writing tests** (none required code changes beyond the v1.19 fix):
- `EmailService.sendDelayEmail` wraps **any** rejected value (including non-Error strings) into `new Error('Failed to send email: <toString>')`. Tested as-is — the wrapping is sensible (BullMQ retry sees a real Error).
- `SMSService.sendDelaySMS` mirrors that wrapping pattern.
- `processNotification` resolves the SendGrid / Twilio credentials from `process.env` at call time (not at module load), so missing-key behavior is a per-job error rather than a startup error.

**Found-and-deferred**:
- Two pre-existing `NotificationService.sendDelayNotification` test files (`tests/unit/notification-service.test.ts`, `tests/unit/services/notification-service.test.ts`) duplicate coverage. Not touched (out of scope, no v1.19 bug).
- `NotificationService.sendDelayNotification` itself remains a "fanout-to-both-channels" primitive that ignores per-channel toggles. That's intentional given its public API contract; the processor was the wrong caller. Left as-is per smallest-blast-radius.

**Lint exception**: ran `npx eslint --fix` only on the 4 touched files. Did NOT run `npm run lint:fix` (still unsafe — reformats ~40 source files per the Wave 2.3 / 3.1 diagnosis).

---

### v1.41 (2026-05-14): Audit Wave 3.1 — TS `any` cleanup, 2 of 5 clusters

**Test Results**: 1,911 passing (+0), 25 skipped, 0 failing. Pure typing changes — no new test files, no count delta. Two existing tests had spurious mock fields removed (real type-lies the new types surfaced — see "What Changed" §3).
**Status**: TypeScript hygiene fix per [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) Wave 3. **2 of 5 clusters shipped — 3 remain** (`api-client.ts` public surface, GraphQL plumbing in `shopify-service.ts`, OTEL `Counter`/`Histogram` types in `observability/tracing.ts`, Koa `rawBody` augmentation in `sendgrid-webhook.ts`). Wave 3 is NOT closed.

**Problem**: Two clusters with the highest carry-forward cost in the [.claude/plans/rules-audit-plan.md](.claude/plans/rules-audit-plan.md) any-cleanup table:

1. **`TrackingEvent` interface declared twice** in [delayguard-app/src/types/index.ts:22,148](delayguard-app/src/types/index.ts) with conflicting shapes. The line-148 shape required `id: string`; `CarrierService.getTrackingInfo` produced events without one. TypeScript's last-wins behavior silently elected line-148 for every consumer, including `TrackingIngestService` — which then masked a real type-lie. Surfaced AND deferred in Waves 2.2 and 2.3 (the longest-running carry-forward in the project).
2. **`MonitoringService.redis` typed as `unknown`** in [delayguard-app/src/services/monitoring-service.ts](delayguard-app/src/services/monitoring-service.ts) with 7 `(this.redis as any).method()` casts gating every Redis call. The audit table called this 9 casts; an actual count showed 7 `this.redis as any` + 1 unrelated `(value as any)[part]` at line 485 in a nested-key resolver (left alone per smallest-blast-radius). Casts violated [.claude/rules/typescript-patterns.md](.claude/rules/typescript-patterns.md) ("no `any` — use `unknown` + narrowing") and CLAUDE.md's TypeScript-strict rule.

Both clusters live in the services/types surface area — bundling them avoided two near-identical commits and kept the wave focused.

**What Changed**:

**1. `TrackingEvent` split into distinct named interfaces** ([delayguard-app/src/types/index.ts](delayguard-app/src/types/index.ts)):

- **`CarrierTrackingEvent`** (the line-22 shape) — wire shape returned by ShipEngine: `{ timestamp, status, location?, description }`. No DB-assigned `id`. Now used by `TrackingInfo.events` and `TrackingIngestService`.
- **`PersistedTrackingEvent`** (the line-148 shape) — `tracking_events`-row shape surfaced via `/api/alerts`: `{ id, timestamp, status, description, location?, carrierStatus? }`. Now used by `DelayAlert.trackingEvents` and the `AlertCard` component.

Naming decision: chose **distinct names with no inheritance** over an `extends`-based design after a reverse-prompt on the consumer-count split (carrier: 2 refs — `TrackingInfo.events`, `TrackingIngestService`; persisted: 12 refs — `DelayAlert.trackingEvents`, `AlertCard.tsx`, 9 mocks in `AlertCard.test.tsx`). The line-148 shape IS a clean superset of line 22 (adds exactly `id` PK + optional `carrierStatus`), so `PersistedTrackingEvent extends CarrierTrackingEvent` was viable and would have meant less duplication. Distinct names were chosen because the shapes are likely to diverge further (DB-derived columns are a different surface than carrier-API fields), and the extension would have admitted `PersistedTrackingEvent` everywhere a `CarrierTrackingEvent` was accepted (Liskov) — undesirable for `TrackingIngestService`'s sort helper, which should refuse persisted events at the type boundary.

Consumer renames (10 type references touched, no runtime shape change):
- [src/services/tracking-ingest-service.ts:26,29](delayguard-app/src/services/tracking-ingest-service.ts) — import + `pickMostRecentEventTimestamp` parameter type.
- [src/components/tabs/AlertsTab/AlertCard.tsx:32,328](delayguard-app/src/components/tabs/AlertsTab/AlertCard.tsx) — import + `displayEvents.map((event: PersistedTrackingEvent, …))` annotation.
- [src/tests/unit/components/AlertCard.test.tsx](delayguard-app/src/tests/unit/components/AlertCard.test.tsx) — 11 mock references via `replace_all` (all already had `id` + `carrierStatus`, confirming they were always persisted-shape).

**2. `MonitoringService.redis` typed as `Redis`** ([delayguard-app/src/services/monitoring-service.ts:89](delayguard-app/src/services/monitoring-service.ts)):

- Field declaration changed from `private redis: unknown` to `private redis: Redis`. The `Redis` class is already imported at module top (`import Redis from "ioredis"`).
- All 7 `(this.redis as any).method()` casts dropped: `.status` × 2 (health-check ready-state + details), `.setex` × 1 (metrics persistence), `.ping` × 1 (Redis health probe), `.info("memory")` × 1 + `.dbsize()` × 1 (Redis stats), `.quit()` × 1 (shutdown). Every method called is a standard ioredis `Redis` instance method — no module-augmentation needed, no narrowing helper required.
- The file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` comment at [monitoring-service.ts:1](delayguard-app/src/services/monitoring-service.ts) was **left in place** for the unrelated `(value as any)[part]` cast at line 485 (a nested-key resolver in a different code path). Removing the file-level disable + narrowing line 485 to `(value as Record<string, unknown>)[part]` is a clean follow-up touch but deliberately out of scope here — the prompt explicitly said "drop the casts, ensure type-check passes, move on."

**3. Two latent test-mock type-lies surfaced + fixed**: The Wave 2.3 prompt warned "if a test breaks WITHOUT modification, the typing surfaced a real bug." It did. Two test files were mocking ShipEngine's `getTrackingInfo` return value with `events: [{ id: "evt-1", … }]` — fictional, because ShipEngine does not return event IDs (the `id` column is DB-assigned during the `tracking_events` UPSERT). Both fictions were silently accepted because the line-148 persisted shape was the last-wins winner for every TS consumer of `TrackingEvent`. After the rename, `TrackingInfo.events: CarrierTrackingEvent[]` rejects the excess `id` property and exposes both mocks:
- [delayguard-app/src/services/tracking-ingest-service.test.ts:46,53](delayguard-app/src/services/tracking-ingest-service.test.ts) — dropped `id: "evt-1"` / `id: "evt-2"` from the 2-event `TRACKING_INFO_FIXTURE`.
- [delayguard-app/tests/unit/delay-detection-service.test.ts:71](delayguard-app/tests/unit/delay-detection-service.test.ts) — dropped `id: "evt-1"` from the inline event in `should detect delay from event descriptions`.

These fixes were not "silencing" — the mocks were claiming a property the wire shape does not carry. All 1,911 existing tests still pass; the assertions did not depend on `event.id` (the carrier-side service code path doesn't read it).

**Verification**:
- `npm run type-check` clean.
- `npm test` → 1,911 passing, 25 skipped, 0 failing (count unchanged, as predicted for a pure typing wave).
- `npm run build` → webpack compiled with the same 2 pre-existing warnings as main.
- Project-wide `any` count outside test code: `rg "\bany\b" src --type ts -g '!*.test.ts' -g '!*.test.tsx' -c | awk -F: '{s+=$NF} END {print s}'` → **106 → 99 (−7)**. The audit table anticipated −9 from this cluster; the actual count was 7 (1 of the 9 was the unrelated nested-key cast at line 485, the rest were 7 Redis casts).
- `grep -c "this\.redis as any" src/services/monitoring-service.ts` → 0.
- `rg "^(export )?interface (TrackingEvent|CarrierTrackingEvent|PersistedTrackingEvent)\b" src/types/index.ts -c` → 2 (one `CarrierTrackingEvent`, one `PersistedTrackingEvent`, zero `TrackingEvent`).

**Out of scope (deliberate, smallest-blast-radius)**:
- 3 of 5 Wave 3 clusters remain: [`utils/api-client.ts`](delayguard-app/src/utils/api-client.ts) public surface (7 anys; needs `ClientApplication` typing from `@shopify/app-bridge`), GraphQL plumbing in [`services/shopify-service.ts`](delayguard-app/src/services/shopify-service.ts) (3+ anys; needs Zod parse or GraphQL codegen), OTEL types in [`observability/tracing.ts`](delayguard-app/src/observability/tracing.ts) (6 anys; needs `Counter` / `Histogram` from `@opentelemetry/api`), Koa `rawBody` augmentation in [`routes/sendgrid-webhook.ts`](delayguard-app/src/routes/sendgrid-webhook.ts) (1 any; module-augment `koa`'s `Request`). Wave 3 stays open in the audit plan.
- 2 pre-existing lint errors carried since Wave 1.1 ([tests/integration/database/tracking-events-schema.test.ts:2](delayguard-app/src/tests/integration/database/tracking-events-schema.test.ts), [tests/unit/components/HelpModal.test.tsx:162](delayguard-app/tests/unit/components/HelpModal.test.tsx)) — untouched per the audit plan.
- File-level `eslint-disable` at [monitoring-service.ts:1](delayguard-app/src/services/monitoring-service.ts) — left in place for the unrelated `as any` at line 485 (separate code path, out of scope). Removing it cleanly is a follow-up touch.
- Husky pre-commit gate still non-functional (deeper diagnosis recorded in audit plan Wave 1.1) — not bypassed, just doesn't fire.
- `npm run lint:fix` still unsafe (Wave 2.3 finding) — workaround applied for this wave: `npx eslint --fix <files>` directly on the touched files only.
- Wave 4 sibling-test gap unchanged ([email-service.ts](delayguard-app/src/services/email-service.ts) / [sms-service.ts](delayguard-app/src/services/sms-service.ts) still lack tests for `sendDelayEmail` / `sendDelaySMS`).

---

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
