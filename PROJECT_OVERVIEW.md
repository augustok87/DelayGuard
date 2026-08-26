# DelayGuard - Project Overview & Roadmap

**Last Updated**: August 26, 2026 (v1.67–v1.73 — nine blockers closed: R17 proven in production, R19, R18 2/3, R11, R20, R21+R5, R22, R23)
**Current Phase**: 🚀 **Deployed to production 2026-07-28** — live and healthy at `https://delayguard-api.vercel.app`. Phase 1 + Audit Waves 1-7 + launch integration (WS-A..H) complete; all 13 production blockers resolved and shipped (see Production wiring status). Phase 2.1.a–e shipped 2026-05-15; Phase 2.1.f (customer-intelligence UI) landed with WS-G. **The remaining critical-path work is no longer code** — the notification pipeline's correctness blockers (R17, R19, R11, and 2 of R18's 3) were fixed and deployed 2026-08-26. What is left is Partner-Dashboard and browser work: see [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §7.
**Latest Update**: **2026-08-26 — the notification pipeline is now correct per alert, and proven so in production.** **R17** (v1.67): `notification.ts` completed with `WHERE order_id = $1`, so one send marked all four alerts on production order 1 delivered with one timestamp to the microsecond — a merchant whose order slips repeatedly would be told once and every later delay suppressed *and recorded as delivered*. Fixed by keying the read and the write on the alert id; **verified in the real cron pipeline: three sends, three `notification_sent_at` ~20 ms apart.** The guard is a real SQL engine (pg-mem) running the production `runMigrations()`, because `__mocks__/pg.js` answers every `UPDATE` with `rowCount: 1` — which is exactly how R17 hid from 2,446 tests. That harness immediately surfaced **R19** (v1.67): the processor never selected `s.shop_domain`, so the SMS plan gate resolved an undefined shop and fail-closed to `free` — **SMS could not fire on any plan**, a dead paid entitlement that H3 would have exposed. **R18** (v1.68): `Order ##DG1001` and the empty "New estimated delivery:" fixed data-side in both email and SMS (defect 3 needs a SendGrid template push — the production key is `mail.send` only). **R11** (v1.69): the boot validator finally checks both SendGrid variables; *absence* is fatal in production, every *format* check only warns, because `process.exit(1)` on a false positive is a total outage. Prior: **2026-08-25 — DelayGuard delivered its first notification email** from the real cron pipeline; see CHANGELOG.md and LAUNCH_PLAN.md §6 R1.
**Document Purpose**: Single consolidated view of current state, readiness, and future roadmap

---

## Production wiring status

**Updated 2026-07-29 — the app is LIVE in production.** Deployed 2026-07-28 to `https://delayguard-api.vercel.app`. All 13 blockers from the 2026-07-21 audit are resolved **and shipped**; the full [LAUNCH_PLAN.md](LAUNCH_PLAN.md) Appendix B probe matrix is green (re-probed 2026-07-29: `/health` healthy with Postgres 3ms + Redis 2ms, every webhook/API/legal route responding correctly). What remains is **not code** — see [LAUNCH_PLAN.md](LAUNCH_PLAN.md) **§6 Remaining blockers** for the live list.

| # | Problem (2026-07-21 audit) | Status now |
|---|---|---|
| 1 | Koa backend never deployed; real routes 404 | ✅ **Live** — single-function `api/index.ts` adapts the Koa app (WS-A `c6f2ae70`, deploy fix `f84839b2`); probe matrix green |
| 2 | No background-job runtime; cron pointed at nothing | ✅ **Live** — cron batch processing (WS-B `877c1881`); Vercel Hobby caps crons at once/day, so scheduling runs from a GitHub Actions workflow every ~10 min (`b70e969d`), succeeding in production |
| 3 | Webhooks never registered with Shopify | ✅ **RESOLVED 2026-08-05** — all three topics registered and confirmed by querying Shopify (`ORDERS_UPDATED`, `FULFILLMENTS_UPDATE`, `ORDERS_PAID`), unblocked by the PCD grant. History: ⛔ **BLOCKED — verified 2026-07-30.** `shopify app deploy` released the config, but Shopify refuses **every** functional topic pending **Protected Customer Data approval**, and `webhookSubscriptions` on the installed store returns `[]`. A wrong topic enum (`FULFILLMENTS_UPDATED` → `FULFILLMENTS_UPDATE`) was also fixed. See LAUNCH_PLAN.md §6 R7. Previously: ✅ deployed — `shopify app deploy` released `delayguard-3` (2026-07-28). Compliance topics via `shopify.app.toml`; the three functional topics register per-shop after OAuth (`use_legacy_install_flow` forbids app-specific subscriptions) via `webhook-registration-service` (`812b772b`). ⏳ *Not yet observed firing on a real dev-store install* |
| 4 | Middleware kill-chain (CSP framing, CSRF, double prefixes) | Fixed in code (WS-A `c6f2ae70`) |
| 5 | OAuth broken (VERCEL_URL redirect, no state, dead callback) | Fixed in code — `SHOPIFY_APP_URL` + state nonce + real token exchange (WS-C `0e034a0b`). ⚠️ Two further defects found on the live install path 2026-07-29 and fixed (`560b86b0`): the authorize URL carried a trailing-newline scope (`read_customers%0A`) from an untrimmed `SHOPIFY_SCOPES`, and the **App URL never redirected into OAuth** — Shopify's install request hits `/`, which Vercel's static CDN answers before Koa sees it. See LAUNCH_PLAN.md §6 R2 |
| 6 | API pinned `2024-01`; customer query used removed fields | Fixed in code — bumped to `2026-07`, query rewritten (WS-C `0e034a0b`) |
| 7 | Prod DB schema never created | ✅ **Live** — schema single-source-of-truth (WS-D `3e56dd7c`); `npm run migrate:vercel` run against prod Neon 2026-07-28, all 8 tables present (D3 done) |
| 8 | Billing was a stub | Fixed in code — App-Pricing plan-gate, fails closed to free (WS-F `3e56dd7c`); plan config is human (H3) |
| 9 | Notification details (placeholder template, example.com, routing) | ✅ **PROVEN END-TO-END 2026-08-25** — an email was delivered to a real inbox from the production cron pipeline. Four gates had to fall, in this order: unset `SENDGRID_DELAY_TEMPLATE_ID` → a sender domain we never owned → **the SDK binding lost to CommonJS interop (v1.64 — `import * as` dropped `setApiKey`/`send`, so no send had ever left the process)** → the expired trial. Now: SendGrid Essentials 50K, `delayguardapp.com` domain-authenticated (5 CNAMEs + DMARC `p=none`), template `d-5755ad471bd64f15bf2bd61f8b848ad0` live. ✅ **Both defects the delivered email exposed are now addressed (2026-08-26):** §6 **R17** fixed and **proven in production** (three alerts → three sends → three distinct timestamps), and **R18** 2 of 3 fixed data-side; defect 3 (the missing CTA on a no-tracking order) awaits a SendGrid template push, since the production key is Restricted-Access `mail.send` only. A third, **R19**, was found by the same work: SMS could not fire on any plan. History: ⛔ E1 was blocked on the SendGrid account from 2026-07-29 |
| 10 | Dashboard rendered mock data; apiClient unmounted | Fixed in code — real API thunks + apiClient mounted (WS-G `fdc03f82`) |
| 11 | Listing assets violated current rules | Fixed in code — testimonials/stats removed, pricing reconciled, feature media (WS-H `eb20d745`); **human** — listing submission (H-4) |
| 12 | `read_customers` scope missing; PCD never requested | ✅ **RESOLVED 2026-08-05** — scope fixed in code (WS-C `0e034a0b`); PCD Level 2 **granted** after building the missing access log (v1.58). See LAUNCH_PLAN.md §6 R7 |
| 13 | Expiring offline tokens mandatory 2027-01-01 | Post-launch fast-follow (C5); not launch-blocking |

**Remainder as of 2026-08-26** — **the app is installed, receiving real order webhooks, and has now delivered a real notification email.** LAUNCH_PLAN §6 **R1, R2, R6 and R7 are all closed**, which means the product's core promise — detect a delay, tell the buyer — has been observed working in production for the first time.

⛔ **What actually blocks submission now:**

| Item | Owner | Why it blocks |
|---|---|---|
| **R17** — one send marks *every* alert on the order as delivered | `[AGENT]` | `notification.ts` completes `WHERE order_id = $1`. A repeatedly-delayed order notifies **once**; every later delay is suppressed and recorded as sent. Worst available failure mode for a delay-notification product |
| **R18** — three defects in the delivered email | `[AGENT]` | `Order ##DG1001`, an empty "New estimated delivery:", a missing tracking CTA. A reviewer sees this artifact |
| **R8** — no support mailbox | `[HUMAN]` | Listing requires a working support address. Domain is ours; it has **no MX**. ~10 min of Cloudflare Email Routing |
| **H3** — App Pricing plans | `[HUMAN]` | **Blocks all revenue** — every paid gate fails closed to `free` until the plans exist |
| **H7** — ShipStation Advanced | `[HUMAN]` | Tracking third-party parcels, the app's core data input |
| **Real webhook → Postgres** | `[HUMAN]` | Never observed. `orders` holds one synthetic row; one real test order closes it |
| **H8 → H-4 → H9** | `[HUMAN]` | Screencast, AI self-review, submit |

⚠️ **R9** also blocks agent-side verification: `shopify app env show` 403s and every Vercel secret is `Sensitive`, so no session can mint a session token — **every `/api/*` check is a browser action** until `shopify auth login` is redone. See [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §6 and §7.

---

## 📍 Current State at a Glance

### Status Summary

| Metric | Status | Details |
|--------|--------|---------|
| **Phase Completion** | ✅ Phase 1 + Audit Waves 1-7 (largely closed) | Phase 2.1.a–e shipped 2026-05-15 (v1.48–v1.52): ingestion + priority score + financial breakdown + shipping address + test-alert endpoint; Phase 2.1.f (customer-intelligence UI) pending |
| **Launch Readiness** | **Live, and the core loop is proven** | Production healthy at `https://delayguard-api.vercel.app`; a real delay email was delivered from the cron pipeline 2026-08-25. Submission now pends **R17 + R18** (code), **R8 + H3 + H7** (human dashboard), and H8→H-4→H9. See LAUNCH_PLAN.md §7 for the parallel critical path |
| **Test Success** | **100%** | 2,486 passing of 2,511, 25 skipped, 0 failing across 136 suites as of 2026-08-26 (+40 across R17/R19/R18/R11/R20/R21/R22/R23). **Remote CI is green on all three workflows** — it had been red on every push for days (§6 R21). ✅ §6 R5 is **CLOSED (v1.71)** — the flake was wall-clock assertions under machine load, and its named offenders no longer consult the wall clock. Still never run the suite in two sessions at once. **New:** `src/tests/helpers/pg-mem-schema.ts` runs the production `runMigrations()` against a real in-memory SQL engine — use it for any assertion about what a statement *did*, since `__mocks__/pg.js` reports `rowCount: 1` for every `UPDATE` |
| **Test Suites** | **All passing** | 126 of 128 suites pass; 2 skipped (require PostgreSQL). Five tautological stub-fixture suites (25 tests) removed 2026-07-29 — they covered no production code and caused order-dependent gate flakiness (LAUNCH_PLAN.md §6 R5) |
| **Code Quality** | **100%** | 0 errors, 0 warnings (production-ready) |
| **TypeScript** | ✅ **0 errors** | 100% type-safe |
| **Build Success** | ✅ **100%** | 0 errors, webpack bundle ~5.8 MiB |
| **Performance** | ✅ **35ms avg** | Excellent API response time |
| **Security** | ✅ **A- rating** | HMAC verification, CSRF protection |
| **CI/CD** | ✅ **Configured** | GitHub Actions with PostgreSQL service |
| **Pre-Launch Checklist** | ✅ **Created** | 32KB guide with 60+ actionable tasks |

### Tech Stack Overview

**Frontend:**
- React 18+ with TypeScript
- Redux Toolkit (state management)
- Custom UI components (no Polaris dependency)
- TDD with Jest + React Testing Library

**Backend:**
- Koa.js 2.14+ (async/await framework)
- Node.js 20+ LTS
- PostgreSQL (Neon/Supabase)
- BullMQ + Redis (Upstash) for queues

**APIs & Integrations:**
- Shopify Admin API (GraphQL 2026-07)
- ShipEngine API (50+ carriers)
- SendGrid (email notifications)
- Twilio (SMS notifications)

**Infrastructure:**
- Vercel deployment
- 14 environment variables configured ✅
- GDPR webhooks implemented
- Billing system (Free/Pro/Enterprise tiers)

---

## 🎉 Phase 1 Achievements (COMPLETE - Oct 28, 2025)

### Phase 1.1: Enhanced Alert Cards ✅
**Completion**: October 28, 2025
**Tests**: 57 passing

**Features Delivered:**
- ✅ Smart priority badges (CRITICAL/HIGH/MEDIUM/LOW)
- ✅ Order total display with currency formatting ($384.99, €299.50)
- ✅ Priority considers both delay days AND order value
- ✅ Enhanced contact information (email, phone with icons)
- ✅ Email engagement tracking UI (Opened ✓, Clicked 🔗)
- ✅ Color-coded card headers

**Files Modified:**
- `src/components/tabs/AlertsTab/AlertCard.tsx`
- `src/components/tabs/AlertsTab/AlertCard.module.css`
- `src/types/index.ts`
- `src/store/slices/alertsSlice.ts`

---

### Phase 1.2: Basic Product Information ✅
**Completion**: October 28, 2025
**Tests**: 67 passing (18 UI + 24 DB + 25 Shopify service)

**Features Delivered:**
- ✅ Shopify GraphQL integration (Admin API 2024-01)
- ✅ Product thumbnails with 📦 placeholder for missing images
- ✅ Product titles, variants, SKU, quantity, price
- ✅ Product type badges (Electronics, Accessories, etc.)
- ✅ Vendor names display
- ✅ Display limit (max 5 items with "+X more" indicator)
- ✅ Database schema: `order_line_items` table with indexes
- ✅ UPSERT logic (ON CONFLICT) for data integrity

**Files Created:**
- `src/services/shopify-service.ts` (324 lines)
- `src/tests/unit/services/shopify-service.test.ts` (701 lines)
- `src/tests/integration/database/order-line-items-schema.test.ts`

**Files Modified:**
- `src/database/connection.ts` (schema updates)
- `src/routes/webhooks.ts` (integrated into order webhooks)
- `src/config/app-config.ts` (added `read_products` permission)

**Shopify Permissions Added:**
- ✅ `read_products` - Product details, images, SKUs

---

### Phase 1.3: Communication Status Backend ✅
**Completion**: October 28, 2025
**Tests**: 10 passing (100% pass rate)

**Features Delivered:**
- ✅ SendGrid webhook integration with HMAC-SHA256 signature verification
- ✅ Email open/click tracking with replay attack prevention (10-minute window)
- ✅ Database schema: 5 new fields in delay_alerts table
  - `sendgrid_message_id`, `email_opened`, `email_opened_at`, `email_clicked`, `email_clicked_at`
- ✅ Communication Status Badge component (3 states: Sent 📧, Opened 📖, Clicked 🔗)
- ✅ Webhook route: POST /webhooks/sendgrid
- ✅ Production-ready security (timestamp validation, signature verification)

**Files Created:**
- `src/routes/sendgrid-webhook.ts` (282 lines)
- `src/tests/unit/routes/sendgrid-webhook.test.ts` (416 lines)
- `src/components/ui/CommunicationStatusBadge.tsx` (118 lines)
- `src/components/ui/CommunicationStatusBadge.module.css` (79 lines)

**Files Modified:**
- `src/database/connection.ts` (schema updates)
- `src/routes/webhooks.ts` (registered webhook route)
- `src/components/ui/index.ts` (badge export)

---

### Phase 1.4: Settings UI Refinement ✅
**Completion**: October 28, 2025
**Tests**: 47 passing

**Features Delivered:**
- ✅ Plain language rule names:
  - "Warehouse Delays" (was "Pre-Shipment Alerts") 📦
  - "Carrier Reported Delays" (was "In-Transit Detection") 🚨
  - "Stuck in Transit" (was "Extended Transit") ⏰
- ✅ Merchant benchmarks with contextual feedback
  - Average fulfillment time ("you're fast!", "good", "could be faster")
  - Average delivery time
  - Delays this month with trend indicators (↓ 25%, ↑ 15%)
- ✅ Improved help text with clear explanations and emoji icons
- ✅ Smart tips based on merchant performance
- ✅ Visual enhancements (rule cards, hover effects, mobile-responsive)

**Files Modified:**
- `src/components/tabs/DashboardTab/SettingsCard.tsx`
- `src/components/tabs/DashboardTab/SettingsCard.module.css`

---

### Phase 1.5: 3-Rule Delay Detection System ✅
**Completion**: November 9, 2025
**Tests**: 35 passing (16 warehouse + 19 transit, 100% pass rate)

**Features Delivered:**
- ✅ **Rule 1: Warehouse Delays** - Detects orders sitting unfulfilled for too long
  - Checks order `status` field (unfulfilled vs fulfilled/partial/archived/cancelled)
  - Calculates days since order `created_at`
  - Configurable threshold (default: 2 days)
  - Returns `WAREHOUSE_DELAY` reason when threshold exceeded
- ✅ **Rule 2: Carrier Reported Delays** - Detects carrier exceptions/delays (existing)
  - Already implemented via ShipEngine API integration
  - Configurable threshold (default: 1 day)
  - Returns `DELAYED_STATUS` or `EXCEPTION_STATUS` reasons
- ✅ **Rule 3: Stuck in Transit** - Detects packages in transit too long without delivery
  - Checks `tracking_status` field (IN_TRANSIT, PICKED_UP, ARRIVED_AT_FACILITY, etc.)
  - Calculates days since `last_tracking_update`
  - Configurable threshold (default: 7 days)
  - Returns `STUCK_IN_TRANSIT` reason when threshold exceeded

**Critical Bugs Discovered & Fixed:**
1. **Notification Logic Bug**: Warehouse delay notifications wouldn't be sent (logic inside wrong block)
   - Fix: Moved notification sending outside `if (trackingNumber)` block
2. **Missing Data Bug**: `last_tracking_update` field was never populated in webhooks
   - Fix: Calculate most recent tracking event timestamp from sorted events array
3. **Type Safety Bug**: AppSettings interface missing new threshold fields
   - Fix: Added `warehouseDelayDays`, `carrierDelayDays`, `transitDelayDays` optional fields

**Database Schema Changes:**
- ✅ `orders.last_tracking_update` (TIMESTAMP) - tracks most recent carrier event
- ✅ `app_settings.warehouse_delay_days` (INTEGER DEFAULT 2) - Rule 1 threshold
- ✅ `app_settings.carrier_delay_days` (INTEGER DEFAULT 1) - Rule 2 threshold
- ✅ `app_settings.transit_delay_days` (INTEGER DEFAULT 7) - Rule 3 threshold

**Files Created:**
- `tests/unit/warehouse-delay-detection.test.ts` (348 lines, 16 tests)
- `tests/unit/transit-delay-detection.test.ts` (365 lines, 19 tests)

**Files Modified:**
- `src/services/delay-detection-service.ts` (+128 lines, 2 new exported functions)
- `src/queue/processors/delay-check.ts` (completely rewritten, 172 lines)
- `src/routes/webhooks.ts` (+30 lines for last_tracking_update logic)
- `src/types/index.ts` (+2 delay reason types, +3 AppSettings fields)
- `src/database/connection.ts` (+27 lines for 2 new migrations)

**Key Achievement:**
- ✅ Honest review process discovered 3 critical bugs before production
- ✅ TDD approach: wrote 35 tests FIRST, then implemented
- ✅ Zero linting errors, production-ready code
- ✅ All 3 delay detection rules now fully operational

---

### Serverless Architecture Optimization ✅
**Completion**: November 1, 2025
**Priority**: 🚀 **CRITICAL** (Required for Vercel production deployment)

**Optimizations Delivered:**
- ✅ **Database connection pool optimized**: max: 20 → max: 1 for serverless
  - Prevents connection exhaustion (2,000 → 100 max connections)
  - 70% lower database costs
  - Faster cold starts
- ✅ **Migrations separated from startup**: Prevents race conditions
  - Created `npm run migrate:vercel` command
  - Removed auto-run from `setupDatabase()`
  - Safe for multi-instance deployments
- ✅ **Build process optimized**: Removed unused server build
  - 25% faster build times (saves 5-10 seconds per deployment)
  - Aligned with actual Vercel deployment model
- ✅ **Background jobs documented**: BullMQ workers don't run in serverless
  - Comprehensive documentation added to `src/queue/setup.ts`
  - Solutions provided: Vercel Cron, External Workers, or Serverless Queue

**Files Modified:**
- `src/database/connection.ts` (pool configuration)
- `src/database/migrate.ts` (explicit migration execution)
- `package.json` (build scripts, migrate:vercel command)
- `src/queue/setup.ts` (30-line warning documentation)

**Impact:**
- 95% reduction in database connections
- Safer deployments (no migration race conditions)
- Faster builds (~25% improvement)
- Production-ready for Vercel serverless

---

### Settings Auto-Save UX Enhancement ✅
**Completion**: November 1, 2025
**Tests**: 49 passing (added 5 new debounce tests)

**Improvements Delivered:**
- ✅ **Removed redundant Save Settings button**: Auto-save on every change
- ✅ **Added debouncing to delay threshold input**: 1-second delay prevents excessive API calls
- ✅ **Optimistic UI updates**: Input displays changes immediately, saves in background
- ✅ **Toast notifications verified**: Auto-save triggers success/error toasts
- ✅ **Comprehensive test coverage**: Timer-based tests with jest.useFakeTimers()

**Test Improvements:**
- ✅ 5 new debounce tests:
  1. UI updates immediately (optimistic update)
  2. Does NOT save immediately (debounced)
  3. Saves after 1 second delay
  4. Only saves once when typing multiple values quickly
  5. Handles extended transit auto-calculation
- ✅ Removed Save button tests (no longer applicable)
- ✅ Updated accessibility tests for new button structure

**Files Modified:**
- `src/components/tabs/DashboardTab/SettingsCard.tsx`
- `src/tests/unit/components/SettingsCard.test.tsx`

**Impact:**
- Clearer UX (no button confusion)
- Better performance (fewer API calls)
- Instant user feedback
- Modern auto-save pattern

---

### UI/UX Visual Polish (v1.18) ✅
**Completion**: November 5, 2025
**Tests**: 97 passing (28 AppHeader + 12 DashboardTab + 22 RefactoredApp + 35 TabNavigation)

**Improvements Delivered:**
- ✅ **Header visual refinements**: Darker gradient (#0f172a → #1e293b), domain truncation, color-coded metrics
  - Total Alerts: Amber accent
  - Active: Blue accent
  - Resolved: Green accent
  - Varied spacing (2rem 2.75rem padding, 2.5rem gap)
- ✅ **Dashboard metrics removal**: Eliminated redundancy (metrics only in header, not dashboard)
  - Dashboard now focuses solely on Settings configuration
  - Cleaner layout with centered single column (900px max-width)
- ✅ **Tab rename**: "Dashboard" → "Settings" for accurate labeling
  - Updated label, icon (📊 → ⚙️), loading message ("Loading Settings...")
  - Reduced cognitive dissonance (tab contains only settings, no dashboard content)
- ✅ **Color-coded metrics test coverage**: 6 new tests for CSS class application

**Files Modified:**
- `src/components/layout/AppHeader/index.tsx` (domain truncation, color classes)
- `src/components/layout/AppHeader/AppHeader.module.css` (spacing, color accents)
- `src/components/tabs/DashboardTab/index.tsx` (removed StatsCard, centered layout)
- `src/types/ui.ts` (removed stats prop from DashboardTabProps)
- `src/components/RefactoredApp.optimized.tsx` (removed stats prop, changed testid)
- `src/components/layout/TabNavigation/index.tsx` (renamed "Dashboard" to "Settings")
- `src/components/tabs/LazyTabs.tsx` (updated loading message)
- `src/tests/unit/components/AppHeader.test.tsx` (+6 color-coded metrics tests)
- `tests/unit/components/DashboardTab.test.tsx` (removed stats)
- `tests/unit/components/RefactoredApp.test.tsx` (updated mocks)
- `src/tests/unit/components/TabNavigation.test.tsx` (updated Dashboard → Settings)

**Code Quality:**
- ✅ 0 ESLint errors (fixed unused imports: createMockStats, waitFor)
- ✅ 100% test pass rate (97/97 tests)
- ✅ TypeScript compilation successful

**UX Impact:**
- More elegant, professional header design
- Reduced redundancy (clearer information architecture)
- More accurate tab labeling (Settings instead of Dashboard)

---

## 🚀 Shopify App Store Submission Readiness

**Rewritten 2026-08-26.** The previous version of this section said *"Estimated Time to Submission: 1-2 days — only screenshot capture + asset resizing remaining."* It had said that since before the app was deployed, through five weeks in which seven blockers were found and closed. **It was not a status; it was a hope.** This version lists only things that have been observed.

### ✅ Observed working in production

| Capability | How it was proven |
|---|---|
| Deployed and healthy | `/health` green from Koa — Postgres 3ms, Redis 2ms |
| Real merchant install | OAuth round-trip on `delayguard-dev.myshopify.com`, `upsertShop` wrote the row |
| Webhook subscriptions | All three functional topics confirmed **by querying Shopify**, after PCD Level 2 was granted |
| Signed webhook → Postgres | A signed `orders/updated` reached the DB (⚠️ synthetic, not Shopify-delivered — see below) |
| Embedded dashboard | Loads inside Shopify admin on real data, with per-shop `frame-ancestors` |
| GDPR + legal endpoints | All 401 unsigned; legal pages 200 |
| **Delay email delivered** | **2026-08-25** — SendGrid `Delivered` / `250 2.0.0 OK`, primary inbox, from the **real cron pipeline** |

### ⛔ Not yet true

- **R17 / R18** — code defects found by reading the first delivered email and the rows behind it. R17 suppresses every notification after the first on a given order.
- **R8** — no working support mailbox. The listing cannot claim one until a message has actually arrived at it.
- **H3 / H7** — App Pricing plans (blocks all revenue) and ShipStation Advanced.
- **A Shopify-delivered webhook** — every ingest proven so far was self-signed. `orders` holds exactly one synthetic row.
- **H8 → H-4 → H9** — screencast, AI self-review, submit.
- **R9** — the agent cannot authenticate to Shopify or read Vercel secrets, so authenticated verification is a human browser action.

### ⚠️ Known and accepted at launch

- **Non-atomic notification dedupe** — `delay_alerts` has no unique constraint backing its `ON CONFLICT DO NOTHING`, so `email_sent` is not yet a hard dedupe. Tracked in `CLAUDE.md`; **R17 is strictly worse and must be fixed first.**
- **Test-suite flake (§6 R5)** — wall-clock threshold assertions fail under machine load. Never run `npm test` in two sessions at once.
- **Expiring offline tokens** — mandatory 2027-01-01, post-launch fast-follow (C5).

**Estimated time to submission:** a half-day of human dashboard work and a few hours of agent work, **run in parallel** — see [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §7 for the two-column critical path. **Approval is a separate clock and it is Shopify's**, historically days to weeks. Plan for *submitted today, approved later*.

---

## 📋 Phase 2: Customer Intelligence & Priority Scoring

**Status**: ⏳ **Not Started**
**Priority**: **HIGH** - Launch as premium tier differentiator
**Estimated Effort**: 14-16 days
**Dependencies**: Shopify permissions (`read_customers`)

### Overview

Phase 2 transforms DelayGuard from "delay alerts" to "customer retention intelligence" by adding context about WHO is affected and WHY it matters.

### 2.1 Customer Value Scoring (5-6 days)

**Goal**: Show merchant the customer's value and segment

**Features:**
- Customer lifetime value (LTV) calculation
- Order count and average order value
- Customer tenure (customer since date)
- Segmentation: VIP, Repeat, New, At-Risk
- Last order date tracking
- Marketing acceptance status

**Database Schema:**
```prisma
model CustomerIntelligence {
  id                String   @id @default(cuid())
  shopifyCustomerId String
  ordersCount       Int
  totalSpent        Float
  customerSince     DateTime
  segment           String   // VIP, Repeat, New, At-Risk
  @@unique([shopId, shopifyCustomerId])
}
```

**UI Display:**
```
🌟 HIGH VALUE CUSTOMER
├─ Total Orders: 8
├─ Lifetime Spend: $2,384.50
├─ Avg Order Value: $298.06
├─ Customer Since: Jan 2024 (11 months)
└─ Last Order: 23 days ago
```

**Shopify Permissions Required:**
- ✅ `read_customers` - Customer LTV, order count, tags

---

### 2.2 Priority Score Algorithm (4-5 days)

**Goal**: Intelligent alert prioritization based on business impact

**Scoring Factors:**
- **Order Value** (0-30 points): Higher $ = higher priority
- **Customer Value** (0-40 points): VIPs and new customers = highest priority
- **Churn Risk** (0-20 points): Previous delays increase risk
- **Urgency** (0-10 points): More delay days = higher urgency

**Score Calculation:**
```typescript
// VIP customer with $500 order delayed 5 days:
orderValueScore = 30      // $500+ order
customerValueScore = 40   // VIP segment
churnRiskScore = 5        // No previous delays
urgencyScore = 8          // 5 day delay

totalScore = 83/100 → CRITICAL priority
```

**Priority Levels:**
- **Critical**: 80-100 points (Act immediately!)
- **High**: 60-79 points (Address today)
- **Medium**: 40-59 points (Address within 24h)
- **Low**: 0-39 points (Monitor)

**UI Display:**
```
🎯 PRIORITY SCORE: 83/100 (CRITICAL - ACT NOW!)
├─ Order Value: $499.99 (30 pts)
├─ Customer: VIP (40 pts)
├─ Churn Risk: No previous delays (5 pts)
└─ Urgency: 5 days delayed (8 pts)
```

**Auto-Sorting:**
Alerts automatically sorted by priority score (descending), not just delay days.

---

### 2.3 Enhanced Financial Breakdown (2 days)

**Goal**: Show full order financial context for better compensation decisions

**Features:**
- Subtotal breakdown
- Shipping cost display
- Tax amount
- Discount codes used
- Total paid

**UI Display:**
```
💰 ORDER BREAKDOWN
Subtotal:         $299.97
Shipping:         $12.00  (USPS Priority)
Tax:              $26.40
Discount:         -$15.00  (Code: WELCOME15)
─────────────────────────
Total Paid:       $323.37
```

**Business Value:**
- Helps merchants decide appropriate compensation
- Shows if customer already used a discount (affects new discount offers)
- High shipping cost = higher customer expectations

---

### 2.4 Shipping Address Context (3 days)

**Goal**: Geographic and delivery insights

**Features:**
- Full shipping address display
- Rural/International/PO Box flags
- Customer delivery notes parsing
- Urgency detection ("birthday gift", "event")

**UI Display:**
```
📍 SHIPPING TO:
Sarah Johnson
123 Mountain View Road
Bozeman, MT 59715
Phone: (406) 555-0123

⚠️ RURAL AREA (known delay zone)

💬 Customer Note:
"Please deliver before Dec 20 - it's a gift!"
⚠️ URGENCY DETECTED: Time-sensitive delivery
```

**Business Value:**
- Explains why delays happen (rural area, international)
- Customer notes often contain urgency signals
- Helps merchants set proactive expectations

---

### 2.5 Test Alert Implementation (renumbered Phase 2.1.e — shipped 2026-05-15 v1.52)

**Goal**: Allow merchants to test their notification system end-to-end

**Current Status**:
- ✅ UI button exists with help text (since v1.20.3)
- ✅ Backend implementation **SHIPPED** (Phase 2.1.e, v1.52 — see [CHANGELOG.md v1.52](CHANGELOG.md))
- ⏳ Frontend wiring deferred to Phase 2.1.f (UI surfacing slice — same slice that renders priority badge + financial breakdown + shipping address + customer segment on alert cards)

**What Shipped (Backend)**:

**POST `/api/test-alert`** ([api.ts](delayguard-app/src/routes/api.ts)) — `requireAuth`-gated dashboard-only endpoint:
- Body: `{ delayType: 'warehouse'|'carrier'|'transit', channels?: ('email'|'sms')[], recipientEmail?: string|null, recipientPhone?: string|null }`.
- Synthesizes fake `OrderInfo` (`TEST-001` / `Sample Customer`) + per-`delayType` `DelayDetails`.
- Reads `shops.merchant_email` / `merchant_phone` + `app_settings.email_enabled` / `sms_enabled` in a single LEFT JOIN.
- Dispatches via `EmailService.sendDelayEmail` / `SMSService.sendDelaySMS` directly through new `TestAlertService` ([test-alert-service.ts](delayguard-app/src/services/test-alert-service.ts)) — NotificationService bypassed to avoid stuffing the merchant's email into a field literally named `customerEmail`.
- **Dry-run** with respect to the alert pipeline: no `delay_alerts` row inserted, no BullMQ enqueue, no `is_test` column added (intentional rejection of the original spec's "Flag alert as 'TEST' in database" line — UI-state belongs with the UI slice).
- Per-channel flag honoring is **stricter** than production `delay-check.ts` dispatch (which only gates on `(email_enabled || sms_enabled)` then routes by contact-presence) — surfaces misconfig the production path silently masks.
- Per-request `channels` picker + `recipientEmail` / `recipientPhone` overrides are reserved for future "Test only email" / "Send to a different address" UI expanders.
- Returns `{ success: true, data: { channelsAttempted, recipientEmail, recipientPhone } }`.

**Frontend Updates Pending (Phase 2.1.f)**:
- Wire [`useSettingsActions.ts`](delayguard-app/src/components/EnhancedDashboard/hooks/) to POST `/api/test-alert` with `{ delayType: 'warehouse' }` (or whichever picker §2.1.f surfaces).
- Replace demo toast logic with data-driven copy: e.g. "Test alert sent via {channelsAttempted.join(' + ') || 'no channels — check your notification flags'}".
- Optional expander: "Send to a different address (troubleshooting)" → posts `recipientEmail` / `recipientPhone` overrides.
- Optional expander: per-channel test picker → posts `channels: ['email']` or `['sms']`.

**Testing (already in place)**:
- 21 sibling tests (15 service + 6 route) — see [v1.52 CHANGELOG entry](CHANGELOG.md#v152-2026-05-15-phase-21e--test-alert-endpoint-fifth-slice).
- 100% coverage on the new service.
- Production-mode SendGrid sandbox / Twilio test credentials still recommended for QA before Shopify App Store submission.

**Business Value:**
- Merchants can verify notifications work before going live
- See exactly what customers will receive
- Test email/SMS templates with real data
- Debug SendGrid/Twilio integration issues early

**Effort**: 1-2 days (straightforward backend + frontend integration)

**Priority**: Medium (nice-to-have for launch, can be added post-submission)

---

### Phase 2 Completion Criteria

**Testing Requirements:**
- ✅ 100% test coverage on customer intelligence sync
- ✅ Priority score algorithm tested with all segments
- ✅ Financial breakdown handles multiple currencies
- ✅ Address parsing tested with international formats

**Performance Requirements:**
- ✅ Customer intelligence sync < 2 seconds
- ✅ Priority score calculation < 100ms
- ✅ No impact on existing alert loading times

**Total Effort**: 14-16 days
**Target Launch**: Post-Shopify approval (Phase 3 feature tier)

---

## 🔮 Phase 3-5: Future Roadmap (Post-Launch)

### Phase 3: Retention Workflows (4-6 weeks)
**Status**: Future - Launch as Premium/Enterprise features

**Key Features:**
- Automated discount code generation (one-click "Apologize with 15% off")
- Pre-built retention workflows (IF VIP + delay >3 days → Auto-send 20% code)
- Communication history timeline (email open/click, SMS delivery, customer replies)
- Sentiment analysis (positive/neutral/negative)
- Support ticket integration (Gorgias, Zendesk)

**Shopify Permissions Required:**
- ✅ `write_discounts` - Generate apology discount codes

**Monetization:**
- Pro tier feature ($7/month)
- Enterprise tier ($25/month with advanced workflows)

---

### Phase 4: Intelligence & Analytics (6-8 weeks)
**Status**: Future - Competitive moat features

**Key Features:**
- Carrier performance dashboard (on-time rates, problem zones)
- Geographic delay patterns
- Cost vs. reliability analysis
- Batch actions for peak seasons
- Advanced analytics (delay trends, revenue impact, churn correlation)

**Business Value:**
- Help merchants optimize carrier selection
- Identify systemic issues (3 orders to Montana delayed this week)
- ROI reporting for retention efforts

---

### Phase 5: Predictive (3-6 months)
**Status**: Future - ML-powered differentiation

**Key Features:**
- Predictive delay detection (ML model: weather + carrier + seasonality)
- Proactive merchant alerts ("Ship today to avoid delay")
- Customer portal (white-label tracking pages)
- Self-service delay updates (reduce WISMO tickets by 60%)

**Technical Requirements:**
- ML infrastructure (TensorFlow.js or cloud ML service)
- Weather API integration
- Carrier performance data aggregation
- Separate customer-facing app

---

## 📊 Key Metrics to Track

### Technical Metrics
- **p95 latency**: Target < 100ms
- **Error rate**: Target < 0.5%
- **Uptime**: Target 99.9%
- **Queue lag**: Target < 1 second
- **Test coverage**: Target > 95%

### Product Metrics
- **Installs**: Monthly app installations
- **Activation rate**: % of installs that configure settings
- **Feature adoption**: % using product info, communication tracking, etc.
- **Time to first alert**: Days from install to first delay detected

### Business Metrics
- **Free to Paid conversion**: Target 10-15%
- **Churn rate**: Target < 5% monthly
- **MRR growth**: Monthly recurring revenue
- **Support ticket volume**: Target < 5% of users
- **Merchant NPS**: Target > 50

---

## 🔗 Reference Documentation

### Core Documents
- **[DEEP_DIVE_UX_UI_RESEARCH.md](DEEP_DIVE_UX_UI_RESEARCH.md)** - Product strategy, UX research, 5-phase roadmap
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Technical implementation details, code examples
- **[CLAUDE.md](claude.md)** - AI agent onboarding guide, TDD workflow
- **[README.md](README.md)** - Main project overview, quick start

### Status & Readiness
- **[LAUNCH_PLAN.md](LAUNCH_PLAN.md)** - Live launch execution plan + production wiring status (the accurate readiness source)

### Technical Guides
- **[AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md)** - Shopify embedded app auth
- **[DATA_FLOW_AND_TESTING_GUIDE.md](DATA_FLOW_AND_TESTING_GUIDE.md)** - Testing strategies
- **[DATA_AVAILABILITY_ANALYSIS.md](DATA_AVAILABILITY_ANALYSIS.md)** - Complete inventory of all 84 data points (v1.34)
- **[DEVELOPMENT_STORE_TESTING_GUIDE.md](DEVELOPMENT_STORE_TESTING_GUIDE.md)** - Step-by-step Shopify dev store testing (v1.34)
- **[DEVELOPER_HANDBOOK.md](DEVELOPER_HANDBOOK.md)** - Developer reference
- **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** - Environment configuration

### Business & Marketing
- **[BUSINESS_AND_MARKETING_STRATEGY.md](BUSINESS_AND_MARKETING_STRATEGY.md)** - Business model, pricing
- **[SHOPIFY_APP_STORE_LISTING.md](SHOPIFY_APP_STORE_LISTING.md)** - Marketing copy
- **[SHOPIFY_RELEASE_GUIDE.md](SHOPIFY_RELEASE_GUIDE.md)** - Submission process

### UX Research
- **[UX_ANALYSIS_COMPREHENSIVE.md](UX_ANALYSIS_COMPREHENSIVE.md)** - Detailed UX analysis (936 lines)
- **[UX_ACTIONABLE_TASKS.md](UX_ACTIONABLE_TASKS.md)** - Actionable UX improvements

---

## 🎯 Quick Summary

**Where We Are:**
- ✅ Phase 1 Complete (Oct 28, 2025)
- ✅ Code-complete for launch (13 production blockers resolved on `launch/integration` — see Production wiring status)
- ✅ Phase 2.1.a–e shipped (2026-05-15, v1.48–v1.52): ingestion + priority score + financial breakdown + shipping address + test-alert endpoint
- ✅ 2,400 passing tests, production-ready code (see CHANGELOG.md v1.53)
- ⚠️ Submission pending the human dashboard gate (H1–H9) + Wave-3 deploy — see LAUNCH_PLAN.md §2

**Where We're Going:**
- 📋 Phase 2: Customer intelligence & priority scoring (14-16 days)
- 💰 Phase 3: Retention workflows & discount generation (premium tier)
- 📊 Phase 4: Carrier intelligence & analytics
- 🔮 Phase 5: Predictive ML & customer portal

**Key Differentiators:**
- From "delay alerts" → "customer retention intelligence"
- From "what's delayed" → "why it matters + what to do"
- From reactive firefighting → proactive delay prevention

---

*Document created: October 29, 2025*
*Next update: After Phase 2 completion*
*For questions, see [CLAUDE.md](claude.md) or [DEVELOPER_HANDBOOK.md](DEVELOPER_HANDBOOK.md)*
