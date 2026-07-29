# DelayGuard — Launch Execution Plan

*From verified reality to Shopify App Store submission, orchestrated across multiple Claude Code sessions.*

> **This file is the canonical, living copy.** It mirrors the gist "DelayGuard — Launch Execution Plan" (gist `e58151df3f01b4e4b0901b9d00162e06`; the original Release Reality Report lives in that gist's revision history). If this file and the gist ever disagree, this file wins.
>
> **How to maintain it:** when you complete a task, tick its checkbox and append `(done <commit-sha>)` to the task line. Log every working session in the Session Log at the bottom. If a verified fact in Appendix A drifts (Shopify changes policy, a file moves), update it in place with a dated note — never silently delete evidence.

**Verification provenance:** every fact herein was verified across three independent sessions (original audit → adversarial re-verification → second adversarial pass with live production probes and shopify.dev grounding, completed 2026-07-21). Repo evidence pinned to commit `55cb3e66`. **Sessions: treat Appendix A as ground truth — do NOT re-verify it.** Only spot-check a claim if the cited file changed since `55cb3e66` (`git log --oneline -- <file>`).

---

## 0. Mission and operating instructions

**Goal:** DelayGuard code-complete, deployed, functional, and **submitted to the Shopify App Store within one focused day**, using multiple Claude Code sessions working in parallel.

**Honest framing of "launch in a day":** everything code-side is achievable same-day. Three things are outside any session's control: Shopify's review (~2–4 weeks, third-party estimate), Protected Customer Data approval latency, and Twilio A2P registration (if SMS ships at launch — recommendation: it doesn't). "Launched" for the one-day goal means: **real backend live, webhooks flowing, billing configured, listing submitted.**

### Instructions for Claude Code sessions executing this plan

1. **Automate maximally.** Default to doing, not asking. Every task is tagged `[AGENT]` (fully automatable), `[AGENT+SECRET]` (automatable once a human has placed a credential in env/Vercel), or `[HUMAN]` (dashboard clicks, account ownership, or a business decision). If a task is tagged `[AGENT]`, complete it end-to-end including tests, lint, type-check, and doc updates — do not stop to ask permission for work already sanctioned by this plan.
2. **Follow the repo's own rules.** Read `CLAUDE.md` and the matching `.claude/rules/*.md` before touching an area. TDD is mandatory (failing test first). Local CI gate: `npm test && npm run lint && npm run type-check && npm run build` from `delayguard-app/`.
3. **Claim a workstream, not a file.** Workstreams (§3) are partitioned to minimize file overlap. Parallel sessions use separate git worktrees/branches (`launch/ws-<x>`) and merge through the integration session (§4, Wave 3). `delayguard-app/src/server.ts` is the highest-contention file — it belongs to WS-A; other workstreams request `server.ts` changes in their PR notes instead of editing it concurrently.
4. **When a task needs a §5 decision the human hasn't made, take the RECOMMENDED option** and record it in the commit/PR message — do not block. Only genuinely new scope questions go back to the human.
5. **Verify against production, not vibes.** After the deploy workstream lands, re-run the probe matrix in Appendix B and paste results into the PR. A task is done when its acceptance criterion passes, not when the code compiles.
6. **Update `PROJECT_OVERVIEW.md` and `CHANGELOG.md` in the same commit** as the change (repo rule; the doc-drift catalogued in Appendix A.8 is what made this audit necessary). Tick your checkboxes here in the same commit too.

---

## 1. Where the app actually stands (30-second read)

> **STATUS UPDATE 2026-07-29 — all 13 problems below are CLOSED in code and the app is LIVE in production.** The table is kept as the historical audit record; do not read it as current state. Verified this session by live probe: `GET /health` → `{"status":"healthy","database":{"responseTimeMs":3},"redis":{"responseTimeMs":2}}`, the full Appendix B matrix green, GitHub-Actions cron sweeps succeeding every ~10 min. **What remains is not code** — it is the §2 human dashboard gate, one third-party account problem (§6 R1), and end-to-end verification on a real dev store (§6 R2). Read **§6** for the live blocker list.

**Real and tested (keep, don't rebuild):** delay-detection engine (3 rules), ShipEngine/SendGrid/Twilio service wrappers, HMAC webhook verification, all three GDPR handlers, session-token middleware, SQL analytics, 2,091 passing tests, Phase 2.1 data layer (priority score, financial breakdown, shipping address, test-alert endpoint).

**Broken or missing (the work):**

| # | Problem | Severity |
|---|---|---|
| 1 | Koa backend never deployed — production serves an SPA shell + two stub JSON endpoints; every real route 404s (live-probed) | Fatal |
| 2 | No background-job runtime; declared cron points at a nonexistent function | Fatal |
| 3 | Webhooks never registered with Shopify (no `shopify.app.toml`, no registration code) | Fatal |
| 4 | Even if deployed, middleware kills the app: `frame-ancestors 'none'` blocks embedding; global CSRF + `verifyRequest()` reject Shopify's webhook POSTs; three double-prefixed routers (`/api/api/*`, `/billing/billing/*`, `/webhooks/gdpr/*`) | Fatal |
| 5 | OAuth broken twice: redirect built from per-deploy `VERCEL_URL`, no `state` nonce, and the callback reads session state nothing populates (would 500) | Fatal |
| 6 | Shopify API pinned to `2024-01` (retired Jan 2025); the customer query uses fields removed in **2022-04/2024-01** — it has never worked against real Shopify | Fatal for Phase 2.1 features |
| 7 | Prod DB schema never created: migration runner ignores `.sql` files; `subscriptions`, `alerts`, `alert_rules` are queried but created nowhere; the one `.sql` migration has an FK type mismatch | Fatal |
| 8 | Billing is a stub (`"test-charge-id"`); zero revenue capability — but Shopify App Pricing (May 2026) means we never need to write Billing API code | Blocking revenue |
| 9 | Notification details: placeholder SendGrid template ID, `tracking.example.com` links, merchant-vs-customer routing silently dropped | Blocking quality |
| 10 | Dashboard renders hardcoded mock data; `apiClient` (which correctly does session tokens) is never mounted | Blocking review |
| 11 | Listing assets violate current rules: testimonials (req 4.3.6/4.3.7), statistics (req 4.3.3 bans ALL stats), four-way pricing conflict, no feature media, legal docs not hosted (live-probed 404) | Blocking submission |
| 12 | `read_customers` scope missing from env template; Protected Customer Data (Level 2) never requested | Blocking Phase 2.1 in prod |
| 13 | Expiring offline access tokens mandatory for this app **Jan 1, 2027** — not launch-blocking, scheduled as fast-follow | Post-launch deadline |

---

## 2. Human-only gate (do this FIRST — it unblocks everything)

Estimated ~1–2 hours of dashboard work. Sessions cannot do these; everything else assumes they're done.

*Status refreshed 2026-07-29. H2/H5/H6 are ticked on live evidence, not self-report.*

- [x] **H1. Pick pricing** — §5 D1. Recommended taken: **Free + $7 Pro + $25 Enterprise** (matches code, most credible for a zero-review app; raiseable later — 8 public plans now allowed). Applied to all listing copy in `eb20d745`. *Decision made; the Partner-Dashboard configuration of these plans is H3 and is still open.*
- [x] **H2. Partner Dashboard:** app exists, App URL + OAuth redirect set to `https://delayguard-api.vercel.app`. **Evidence:** `shopify app deploy` released `delayguard-3` against `client_id = e9d96cad62c5e6db0a67e6752a23d0ea` (`shopify.app.toml`, commit `87f8aa4f`), and prod serves the app at that domain. ⚠️ *Still unconfirmed: whether the app was created before 2026-04-01, which sets the expiring-token deadline (see C5).*
- [ ] **H3. Configure Shopify App Pricing plans** (Partner Dashboard → Pricing): free + paid tiers per H1. No Billing API code needed — this replaces the stub entirely. **← OPEN. Blocks revenue: `/api/plan` and every SMS/paid gate fail closed to `free` until these plans exist.**
- [ ] **H4. Request Protected Customer Data access (Level 2)** — app reads customer name/email/phone. State per-field use reasons (delay notifications + customer-intelligence display), complete the questionnaire. *Without approval, PII fields return null in prod.* **← OPEN. Has approval latency — submit early.**
- [x] **H5. Secrets into Vercel env** — `DATABASE_URL`, `REDIS_URL`, `SHOPIFY_API_KEY/SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_APP_URL`, `CRON_SECRET` all confirmed working. **Evidence:** `/health` reports Postgres + Redis healthy; the `CRON_SECRET`-guarded endpoints 401 without a secret and 200 from the GitHub-Actions workflow. ⚠️ *Unverified from here: `SHIPENGINE_API_KEY`, `SENDGRID_API_KEY`, `TWILIO_*` — no probe exercises them without a merchant session. `SENDGRID_DELAY_TEMPLATE_ID` is definitely NOT set (§6 R1).*
- [x] **H6. Run `shopify auth login`** — done; `shopify app deploy` succeeded on 2026-07-28.
- [ ] **H7. ShipStation API plan:** confirm the Advanced plan is active (tracking-any-parcel requires it — verified: sold as 1,000/5,000/10,000 calls per endpoint/month). **← OPEN/unverified. Without Advanced, tracking third-party parcels — the app's core input — silently fails.**
- [ ] **H8. Record the demo screencast** (English, after WS-G lands) + prepare test credentials + emergency developer contact for the listing. *(Only item that must wait until late in the day.)*
- [ ] **H9. Final submit click** after AI self-review passes.

Deferred (not today): Twilio A2P 10DLC registration (launch email-only), custom domain if H2 chose the vercel.app domain.

---

## 3. Workstreams

Task format: **ID — name `[TAG]`** · files · what to do · acceptance criterion. Order within a workstream is execution order. All paths relative to repo root; run npm commands from `delayguard-app/`.

### WS-A · Deploy the real backend (owns `server.ts`, `api/`, `vercel.json`)

- [x] **A1 — Export Koa, add catch-all function `[AGENT]`** (done c6f2ae70) · `delayguard-app/src/server.ts`, new `delayguard-app/api/[[...path]].ts`, `delayguard-app/vercel.json` · Refactor `server.ts` to export the configured app (`export const app` / `app.callback()`), keep dev-only `listen`. Catch-all Vercel function adapts the Koa callback. Delete placeholder `api/index.ts`, `api/simple.ts`, `api/logger.ts`; fold `api/health.ts` into the Koa `/health` route (the current one fakes "healthy" with `response_time: 0` — make it actually ping Postgres/Redis or report honestly). Update `vercel.json` functions block. **Accept:** local build passes; after deploy, `/health` returns a Koa-served honest health JSON.
- [x] **A2 — Fix the middleware kill-chain `[AGENT]`** (done c6f2ae70) · `src/server.ts`, `src/middleware/csrf-protection.ts`, `src/middleware/security-headers.ts` · (a) Exempt `/webhooks*` and `/api/cron/*` from CSRF and from `verifyRequest()` — HMAC (webhooks) and `CRON_SECRET` (cron) are their auth. (b) Remove the global `verifyRequest()` blanket; embedded-app auth is the existing session-token middleware on `/api/*`. (c) CSP: `frame-ancestors https://admin.shopify.com https://*.myshopify.com`; delete `X-Frame-Options: DENY`. Remove the session-token dev bypass or gate it on `NODE_ENV !== 'production'` with a loud comment. **Accept:** tests prove a tokenless POST to `/webhooks/orders/updated` reaches the HMAC check (401/unauthorized, NOT 403-CSRF), and headers allow Shopify admin framing.
- [x] **A3 — Kill the double prefixes `[AGENT]`** (done c6f2ae70) · `src/routes/api.ts:18`, `src/routes/billing.ts:12`, `src/routes/gdpr.ts:18`, `src/server.ts:104-109` · Remove router-level prefixes (keep mount-point prefixes only). Canonical URLs: `/api/*`, `/billing/*`, GDPR at `/webhooks/customers/data_request`, `/webhooks/customers/redact`, `/webhooks/shop/redact` (must match C4's toml). **Accept:** route-listing test asserts the canonical paths; no `/x/x/` duplicates.
- [x] **A4 — Mount the cron route with auth `[AGENT]`** (done c6f2ae70) · `src/routes/tracking-refresh-cron.ts` (currently imported by nothing), `src/server.ts`, `env.example` · Mount at `/api/cron/tracking-refresh`, guard with `CRON_SECRET` bearer check, add `CRON_SECRET` + `SHOPIFY_APP_URL` to `env.example`. **Accept:** wrong/missing secret → 401; correct → 200.

### WS-B · Serverless job processing (owns `queue/`, cron functions)

- [x] **B1 — Cron-based processing replaces workers `[AGENT]`** (done 877c1881) · `src/queue/*`, `vercel.json` crons, routes from A4 · Per `.claude/rules/deploy.md`: workers never run on Vercel. Add cron endpoints for (1) tracking refresh (exists per A4), (2) delay-check sweep, (3) notification dispatch — each processes a bounded batch inside the 30s cap, invoking the existing processor logic directly (keep BullMQ producers only if Redis-backed queueing is retained; direct DB-driven sweeps are acceptable and simpler). Set `maxRetriesPerRequest: null` on any remaining BullMQ connection. **Accept:** no `new Worker(...)` in any serverless code path; `vercel.json` crons all target functions that exist; batch logic covered by tests.

### WS-C · Shopify platform correctness (owns `services/shopify-service.ts`, `routes/auth.ts`, toml)

- [x] **C1 — API version + Customer query fix `[AGENT]`** (done 0e034a0b) · `src/services/shopify-service.ts:23,99,333-416` and types/tests · Bump `SHOPIFY_API_VERSION` to **`2026-07`**. Rewrite the customer query: `ordersCount` → `numberOfOrders`, `totalSpent` → `amountSpent { amount currencyCode }`, `acceptsMarketing` → derive from `emailMarketingConsent { marketingState }` (`=== "SUBSCRIBED"`); note in-code that `emailMarketingConsent` is deprecated-but-present in 2026-07 (successor unnamed in docs as of 2026-07-21 — re-check at next version bump). **Accept:** updated unit tests assert the new query string and mapping; `grep -r "ordersCount\|totalSpent\|acceptsMarketing" src/` clean except DB column names.
- [x] **C2 — Scopes `[AGENT]`** (done 0e034a0b) · `env.example:21`, `src/routes/auth.ts` · Add `read_customers,read_products` to the env template; make the OAuth URL consume `config.shopify.scopes` (which already includes them as defaults at `src/config/app-config.ts:44-51`) instead of raw `process.env.SHOPIFY_SCOPES`. **Accept:** test asserts the generated authorize URL contains `read_customers` and never the literal `undefined`.
- [x] **C3 — OAuth done right `[AGENT+SECRET]`** (done 0e034a0b) · `src/routes/auth.ts` · Replace `VERCEL_URL` with `SHOPIFY_APP_URL` for the redirect URI. Add `state` nonce (generate, store in session/short-lived cookie, verify in callback). Implement the callback for real: exchange `code` for the access token (`POST /admin/oauth/access_token`), then `shopAuth.upsertShop` — the current callback reads `ctx.state.shopify.session` which nothing populates. **Accept:** integration test walks authorize→callback with mocked Shopify token endpoint; state mismatch → 403.
- [x] **C4 — `shopify.app.toml` + webhook registration `[AGENT+SECRET]`** (needs H6) (authored 0e034a0b; client_id set 87f8aa4f; **deployed 2026-07-28 — `shopify app deploy` → `delayguard-3` released**; architecture corrected 265627c9 + 812b772b + 0c9bf1d0) · `delayguard-app/shopify.app.toml`, new `src/services/webhook-registration-service.ts` · Declare: `application_url = SHOPIFY_APP_URL`, redirect URLs, scopes (match C2), `[webhooks]` API version `2026-07`, and the three compliance topics → the A3 GDPR URLs. **Correction found at deploy time:** `use_legacy_install_flow = true` (this app's custom authorization-code OAuth) **forbids app-specific webhook subscriptions in the toml**, so the three functional topics (`orders/updated`, `fulfillments/updated`, `orders/paid`) moved to **per-shop registration after OAuth** via `webhookSubscriptionCreate` (Admin GraphQL 2026-07) — idempotent ("already been taken" → success), 10s `AbortController` timeout, best-effort (never fails the install). Compliance topics stay in the toml (separate mechanism, deploys cleanly with the legacy flow). **Accept:** ✅ deploy succeeded; ⏳ *a test webhook from a real dev-store install has NOT yet been observed landing* — that verification is the outstanding piece (see §6 R2).
- [ ] **C5 — Expiring offline tokens `[AGENT]` — POST-LAUNCH (deadline 2027-01-01)** · Spec for the follow-up session: add `refresh_token`, `access_token_expires_at`, `refresh_token_expires_at` to `shops`; request tokens with `expiring=1`; proactive refresh before background work (`grant_type=refresh_token`; refresh tokens are 90-day and **rotate** — persist both tokens atomically, single-flight the refresh); one-time migration via token exchange (revokes the permanent token irreversibly — persist response before discarding). Existing permanent tokens keep working until the deadline. **Do not do this today; do not forget it either.**

### WS-D · Database schema in production (owns `database/`)

- [x] **D1 — One source of truth for schema `[AGENT]`** (done 3e56dd7c) · `src/database/connection.ts`, `src/database/migrations/`, `scripts/run-migrations.ts` · Keep the idempotent hardcoded DDL in `runMigrations()` as canonical (tested, additive). Delete dead+broken `003_create_subscriptions_table.sql` (UUID FK vs SERIAL `shops.id`; superseded by App Pricing — see F1). Add DDL for `alerts`/`alert_rules` **only if** D2's decision keeps monitoring; otherwise delete the querying code paths. Fix `.claude/rules/deploy.md:33` (`db:migrate:vercel` → `migrate:vercel`). **Accept:** every table name queried anywhere in `src/` (grep `FROM |INTO |UPDATE `) is created by `runMigrations()`; `npm run test:db:schema` passes.
- [x] **D2 — Monitoring tables decision `[AGENT]`** (done 3e56dd7c) · Recommended (per §5 D2): strip the internal `alerts`/`alert_rules` monitoring persistence from launch scope (routes behind a feature flag or removed); external monitoring is a post-launch concern. **Accept:** no orphan table references remain.
- [x] **D3 — Run migrations against prod `[AGENT+SECRET]`** (needs H5) (done 2026-07-28 alongside f84839b2) · Ran `npm run migrate:vercel` against the prod Neon `DATABASE_URL`. **Accept:** ✅ all 8 tables present on prod Neon; `GET /health` reports `database: healthy` (3ms, re-probed 2026-07-29).

### WS-E · Notification pipeline truth (owns `services/email-service.ts`, `queue/processors/`)

- [ ] **E1 — Real SendGrid dynamic template `[AGENT+SECRET]`** (needs H5) (code done a88eac24; **live creation BLOCKED on the SendGrid account — see §6 R1**) · Create the delay-notification dynamic template **via the SendGrid API** (automatable — clean HTML with order/tracking/delay-reason/ETA merge fields), store the returned `d-…` ID in env (`SENDGRID_DELAY_TEMPLATE_ID`), replace the placeholder at `src/services/email-service.ts:21`. **Accept:** a dry-run via the existing `/api/test-alert` endpoint (Phase 2.1.e) sends a real email to the merchant address.
  - Code side is complete and tested: `src/scripts/create-sendgrid-template.ts` builds + POSTs the dynamic template (navy/gold, all 8 merge fields, plain-text fallback), and `EmailService` **refuses to send in production** when `SENDGRID_DELAY_TEMPLATE_ID` is unset rather than sending with the placeholder.
  - Blocked 2026-07-29 by two account-level facts, both verified live against the SendGrid API (see §6 R1).
- [x] **E2 — Real tracking URLs `[AGENT]`** (done a88eac24) · `src/queue/processors/delay-check.ts:159,167` · Replace `tracking.example.com` with the fulfillment's stored `tracking_url` (DB column exists) and fall back to a carrier-pattern link built from `carrier_code` + tracking number. **Accept:** unit tests cover both paths; no `example.com` in `src/`.
- [x] **E3 — Restore merchant-vs-customer routing `[AGENT]`** (done a88eac24) · `src/queue/processors/notification.ts:8-18`, `delay-check.ts:172-177` · Extend the notification job payload with recipient type + merchant contact fields; dispatch warehouse-delay alerts to the merchant, carrier/transit to the customer. Per the v1.19 incident rule: positive AND negative dispatch tests per rule, and field-by-field persistence assertions. **Accept:** the routing matrix is fully tested; nothing silently defaults to `customer_email`.

### WS-F · Billing via Shopify App Pricing (owns `routes/billing.ts`, `services/billing-service.ts`)

- [x] **F1 — Delete the stub, gate on real subscription status `[AGENT]`** (pairs with H3) (done 3e56dd7c) · Remove the fake-charge flow (`"test-charge-id"`, local `subscriptions` writes). Replace with a thin plan-gate: read the shop's current subscription (per the App Pricing docs — consult the migration guide linked in Appendix A.6) and expose it at `/api/plan`; gate SMS + premium features on plan ≥ Pro. On query failure, **fail closed to free tier**. **Accept:** billing routes contain zero charge-creation code; plan-gate has tests for free/pro/enterprise/error.

### WS-G · Frontend: real data + App Bridge compliance (owns `src/store/`, `src/components/`, HTML template)

- [x] **G1 — Latest App Bridge script tag `[AGENT]`** (done fdc03f82) · HTML template · Add `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>` first in `<head>` with the api-key meta (req 2.2.3, mandatory since 2025-10-15). Keep or migrate `getSessionToken` accordingly (`src/utils/api-client.ts` already attaches Bearer tokens correctly — preserve that behavior, prefer the CDN global's `idToken()` if the npm util conflicts). **Accept:** served HTML has the tag first; session-token round-trip works in an embedded dev-store install.
- [x] **G2 — Replace mock thunks with the real API `[AGENT]`** (done fdc03f82) · `src/store/slices/alertsSlice.ts:167-179`, `ordersSlice.ts`, settings slice · Swap `setTimeout`/`Math.random` mocks for `apiClient` calls to `/api/alerts|orders|settings|analytics`; mount the existing `useApiClient`/`useDashboardData` path (currently dead code). Delete the fabricated "support ticket reduction" stat tile (also a listing-rules liability). This completes Phase 2.1.f — wire the customer-intelligence UI + test-alert button while in here. **Accept:** `grep -rn "setTimeout\|Math.random" src/store/slices/` clean; dashboard renders real (empty-state) data against a dev DB; empty states designed, not broken.

### WS-H · Legal, listing, submission (owns `legal/`, listing copy)

- [x] **H-1 — Host legal docs `[AGENT]`** (done 55044eed) · Serve `legal/` privacy policy + terms as public routes (`/legal/privacy-policy`, `/legal/terms-of-service`) — render the existing markdown to HTML at build time or via a tiny route. Fix `legal/README.md` (claims 13 docs; 6 exist). **Accept:** both URLs return 200 HTML in prod (they 404 today — probed).
- [x] **H-2 — Sanitize listing copy `[AGENT]`** (done eb20d745) · `SHOPIFY_APP_STORE_LISTING.md`, `app-store-assets/README.md` · Delete all testimonials (`SHOPIFY_APP_STORE_LISTING.md:215-219` — reqs 4.3.6 images / 4.3.7 listing text) and ALL statistics incl. the "40%" claim (req 4.3.3 bans verifiable AND unverifiable stats, plus "the first/best/only" superlatives; 4.4.1 bans stats in the app-card subtitle). Set pricing everywhere to the H1 decision (currently four-way conflict: $7/$25 vs $29/$79/$199 vs $49/$149). **Accept:** a grep for `%`, `$` outside the pricing section, and testimonial blocks comes back clean; copy is benefits-focused.
- [x] **H-3 — Feature media `[AGENT]` then `[HUMAN]`** (done eb20d745) · Produce the mandatory 1600×900 feature image (agent: design + render — dashboard-screenshot composite is fine, no fabricated data/stats in the image). Demo video/screencast is H8 (human). **Accept:** asset exists at spec size in `app-store-assets/`.
- [ ] **H-4 — AI self-review + submit `[HUMAN]`** (H9) · Run Shopify's AI self-review from the Partner Dashboard, fix whatever it flags (spawn a session for fixes), submit.

### WS-I · Docs truth pass `[AGENT]` (last, after merges)

- [x] **I1** (done integration — `launch/integration`, final squash/merge SHA pending) · Update `PROJECT_OVERVIEW.md` with a **"Production wiring status"** section mirroring §1's table; remove the 95/97 conflict + dead cross-references; reconcile test counts; `CHANGELOG.md` entry; `env.example` complete (14+ vars incl. `CRON_SECRET`, `SHOPIFY_APP_URL`, `SENDGRID_DELAY_TEMPLATE_ID`); update this file's checkboxes + Session Log. **Accept:** no doc references a nonexistent file or script.

---

## 4. Session orchestration (the one-day plan)

**Dependency spine:** H1–H7 → WS-A → (everything else) → integration → deploy → C4 webhooks → E1 live test → H8/H9 submit.

- **Wave 0 (human, hour 0):** §2 items H1–H7.
- **Wave 1 (1 session, ~1–2h):** WS-A entirely (it owns the contention files: `server.ts`, `api/`, `vercel.json`, middleware). Nothing else touches these files this wave.
- **Wave 2 (3–4 parallel sessions in separate worktrees, ~2–4h):**
  - Session α: WS-C (C1–C4) — `shopify-service.ts`, `auth.ts`, toml
  - Session β: WS-D + WS-F — `database/`, `billing*`
  - Session γ: WS-E — processors + SendGrid template
  - Session δ: WS-G + WS-H (H-1..H-3) — frontend + listing/legal
  - File overlap is near-zero by design; if a session needs a `server.ts` change (e.g., mounting a route), it writes the change as a note in its PR description for the integration session instead of editing it.
- **Wave 3 (1 integration session, ~1–2h):** merge all branches, resolve `server.ts` mount requests, full local CI, deploy to Vercel, run **D3** migrations, run **C4** `shopify app deploy`, execute the Appendix B probe matrix against prod (all previously-404 endpoints must now respond correctly), install on a dev store, fire `/api/test-alert` end-to-end (E1 accept), complete WS-I docs pass.
- **Wave 4 (human, hour ~8):** H8 screencast on the working app, H4 PCD submission if not done, H-4 AI self-review, H9 submit.

**Cross-workstream fixes applied during Wave 3 integration** (surfaced when the branches were merged together — not captured by any single workstream):
- Processors now read notification settings flags from `app_settings`, not `shops` (`e166516e`).
- `getAlerts` selects the Phase 2.1 intelligence columns (priority score / financial breakdown / shipping address / customer segment) so the frontend can render them (`ef0dc608`).
- Alert resolve/dismiss persists via `PUT /api/alerts/:id/status` (`7c22182d`).
- SMS dispatch is plan-gated in the notification processor (fails closed to free) (`f11fec29`).
- `secrets-manager` migrated to `createCipheriv` for Node 22 compatibility (`40f57f4d`).
- Swagger `supportTicketReduction` field removed (fabricated stat, also a listing-rules liability) (`ed0e4baa`).
- Legal routes mounted + docs made Vercel-bundleable (`708aa24d`).
- `quality-gates` required-files list fixed (`2587021d`).

**Kickoff prompt template for each Wave-2 session:**

> Read `LAUNCH_PLAN.md` at the repo root. You are Session <α/β/γ/δ> executing workstream <WS-X> at commit <sha>. Appendix A is verified ground truth — do not re-verify. Follow §0 operating instructions: TDD, full local CI, automate everything tagged [AGENT], take RECOMMENDED options for open decisions, put any `server.ts` changes in your PR notes instead of editing it. Work in a worktree/branch named `launch/ws-<x>`. Deliverable: all tasks in your workstream at their acceptance criteria, CI green, docs + LAUNCH_PLAN.md checkboxes updated.

---

## 5. Decisions (human may override; sessions take RECOMMENDED and move on)

| ID | Decision | RECOMMENDED | Why | Status |
|---|---|---|---|---|
| D1 | Pricing | Free + $7 Pro + $25 Enterprise | Matches code + assets; credible for zero-review app; raiseable (8 plans allowed) | OPEN |
| D2 | Internal monitoring `alerts`/`alert_rules` tables | Cut from launch | Unshipped internal tooling; smallest blast radius to schema truth | OPEN |
| D3 | SMS at launch | Off (email-only) | Avoids A2P 10DLC wait; SMS stays a paid-tier feature to enable later | OPEN |
| D4 | Queue architecture | Drop BullMQ workers; DB-driven cron sweeps | 30s function cap; `deploy.md` already mandates no workers; fewer moving parts | OPEN |
| D5 | Production domain | `https://delayguard-api.vercel.app` unless human supplies custom domain in H2 | Works today; custom domain cosmetic, swappable later | OPEN |

---

## 6. Remaining blockers (live list — start here)

*Established 2026-07-29. Code and deploy are done; §§1–4 are now history. This is the whole remaining path to submission.*

### R1 — SendGrid account cannot send email `[HUMAN]` — **most severe**

Email is the **only** notification channel at launch (§5 D3 ships SMS off), so an account that cannot send means the app's entire value proposition is inert in production. Two independent problems, both verified live against the SendGrid v3 API on 2026-07-29 using the key currently in Vercel:

1. **The account is over its sending limit.** A sandbox-mode `POST /v3/mail/send` (validates the request, delivers nothing) returns `HTTP 401 {"errors":[{"message":"Maximum credits exceeded"}]}`. **Every production delay email will fail until the plan is upgraded or the quota resets.** This is a paid-plan decision, not a code fix.
2. **The API key is Mail-Send-only, so E1 cannot run.** `GET /v3/scopes` returns exactly `mail.send`, `mail.batch.*`, `user.scheduled_sends.*`, `sender_verification_eligible`, `2fa_required` — no `templates.*`. `GET/POST /v3/templates` therefore returns `HTTP 403 access forbidden`, and `npm run sendgrid:create-template` cannot create the dynamic template.

3. **The From address cannot be a verified sender — confirmed by DNS.** `EmailService` sends from the hardcoded `noreply@delayguard.app` (`src/services/email-service.ts:58`), but SendGrid rejects any send whose From address is not a verified Sender Identity. DNS for `delayguard.app` (checked 2026-07-29) shows:
   - **No SendGrid domain-authentication records** — `em.delayguard.app` and `s1._domainkey.delayguard.app` both return NXDOMAIN, so the domain is definitively *not* authenticated with SendGrid.
   - **No MX records at all** — so `noreply@delayguard.app` cannot receive mail, which also makes **Single Sender Verification impossible** (SendGrid verifies by emailing a confirmation link to that address).
   - The domain does resolve (A records on Squarespace-range IPs, Google-Domains nameservers), i.e. it is registered by *someone* — but ownership by this project is unconfirmed.

   **Consequence:** even after the credits problem is fixed, every send will fail sender verification. **One of two things must happen:** either `delayguard.app` is owned by us and gets domain-authenticated in SendGrid (add the CNAMEs, then optionally an MX), **or the From address changes** to an address on a domain we do control and have verified. The latter is a small code change — but note the From address is currently hardcoded, not env-driven, so it is a code change either way unless we make it configurable.

**To unblock, in order:**
1. **Resolve the account credits/plan** in SendGrid (paid-plan decision — this is the COGS line alongside ShipStation).
2. **Settle the sender identity.** Decide whether we own `delayguard.app`. If yes → domain-authenticate it in SendGrid → Settings → Sender Authentication. If no → pick a From address on a domain we control, and let a session make it env-driven (`SENDGRID_FROM_EMAIL`) rather than hardcoded, with a test.
3. **Create the template.** Mint a **temporary Full Access key**, let a session run `npm run sendgrid:create-template`, put the printed `d-…` ID into Vercel as `SENDGRID_DELAY_TEMPLATE_ID`, redeploy, then **delete the temporary key** — the least-privilege `mail.send` key stays as the production `SENDGRID_API_KEY`.
4. **Verify end-to-end** by firing `/api/test-alert` from the dashboard (this is E1's actual acceptance criterion, and it depends on R2's dev-store install).

### R2 — No end-to-end verification on a real dev store `[HUMAN]` + `[AGENT]`

The app has never completed a real merchant install. Unproven in production, in dependency order: OAuth authorize → callback → `upsertShop`; per-shop webhook registration (C4's new `webhook-registration-service`, which is best-effort and only logs on failure — a silent failure here means **no alerts ever fire**); a real `orders/updated` payload passing HMAC and landing in Postgres; the embedded dashboard loading inside Shopify admin with a session token; `/api/test-alert` sending a real email (also gated on R1). **Install on a dev store and walk the flow** — this is where the remaining real bugs are, and it must precede H8's screencast anyway.

### R3 — Human dashboard gate: H3, H4, H7 `[HUMAN]`

H3 (App Pricing plans) blocks all revenue. H4 (Protected Customer Data) has approval latency — submit it first, today. H7 (ShipStation Advanced plan) gates tracking third-party parcels, the app's core data input.

### R4 — Listing submission: H8 → H-4 → H9 `[HUMAN]`

Screencast, AI self-review, submit. Gated on R2 (needs a working app to film) and R3.

### R5 — Known non-blockers (carry forward, do not let them stall launch)

- **C5 expiring offline tokens** — deadline 2027-01-01, spec already written above.
- **Two load-dependent test flakes** — `tests/unit/middleware/input-sanitization.test.ts:405` and `tests/unit/services/monitoring-service.test.ts:67`. Both assert timing budgets, both fail only under full-suite CPU contention, both pass in isolation (verified 2026-07-29). Not regressions.
- **Non-atomic notification dedupe** — the `email_sent`/`sms_sent` check-then-send race and the missing `UNIQUE(order_id, delay_reason)` constraint behind `ON CONFLICT DO NOTHING`, both documented in `CLAUDE.md` and CHANGELOG v1.53. Low real-world risk at zero install volume; fix before meaningful traffic.
- **Husky pre-commit** was rewired in v1.53 but `node_modules` was empty on a fresh clone this session — run `npm install` from `delayguard-app/` to re-establish the hook.

---

## Appendix A — Verified ground truth (do not re-verify; evidence @ `55cb3e66`, shopify.dev fetched 2026-07-21)

1. **Deployment:** `src/server.ts:261` dev-only listen; `api/` = 4 placeholder handlers, none import Koa; `vercel.json` has no rewrites; declared cron `/api/cron/tracking-refresh` targets nothing; `src/routes/tracking-refresh-cron.ts` imported by nothing.
2. **Middleware:** `src/middleware/security-headers.ts:19` `frame-ancestors 'none'`, `:45` `X-Frame-Options: DENY`; global CSRF (`server.ts:70`, exempts only GET/HEAD/OPTIONS + `/health`) 403s tokenless webhook POSTs before HMAC; global `verifyRequest()` at `server.ts:90`; double prefixes at `api.ts:18`, `billing.ts:12`, `gdpr.ts:18` vs mounts `server.ts:104-109`.
3. **OAuth:** `src/routes/auth.ts:27` `VERCEL_URL` redirect, no `state`; callback reads `ctx.state.shopify.session` which nothing populates (would 500).
4. **API version:** pinned `2024-01` (`shopify-service.ts:23`), retired 2025-01-01. Shopify **falls forward** to the oldest accessible stable version (verbatim: *"If your app targets an inaccessible version, Shopify falls forward and responds using the oldest accessible stable version"*) — 2025-10 as of July 2026; supported: 2025-10 → 2026-07. `Customer.ordersCount`/`totalSpent` removed **2022-04** (→ `numberOfOrders`, `amountSpent`), `acceptsMarketing` removed **2024-01** (→ `emailMarketingConsent`, itself deprecated-but-present in 2026-07, successor unnamed). The query at `shopify-service.ts:366-368` fails on every version including its own pin. Sources: shopify.dev/docs/api/usage/versioning; release-notes/previous-versions/2022-04 and /2024-01; objects/Customer.
5. **Schema:** `runMigrations()` (`src/database/connection.ts:63-466`) = hardcoded idempotent DDL, never reads `migrations/`; all three runners route to it; `003_create_subscriptions_table.sql` is dead and broken (`shop_id UUID` vs `shops.id SERIAL`); `subscriptions` (billing-service.ts:84+), `alerts` (monitoring-service.ts:521; utils/monitoring.ts:409), `alert_rules` (monitoring-service.ts:465) queried but created by nothing; `deploy.md:33` names a nonexistent script (`db:migrate:vercel`; real: `migrate:vercel`, invoked by nothing).
6. **Billing/policy:** no Billing API call exists; **Shopify App Pricing** (rebranded Managed Pricing, 2026-05-12) is the default — plans configured in Partner Dashboard, no billing code; public-plan limit 8 (2026-07-09). Revenue share verbatim: *"You keep 100% of your first $1,000,000 USD in gross app revenue earned from January 1, 2025, and 85% of earnings above that"* — table header literally "Lifetime gross app revenue"; +2.9% processing fee. Docs: shopify.dev/docs/apps/launch/billing/managed-pricing, /distribution/revenue-share.
7. **Listing rules (current numbering):** 4.3.3 bans ALL stats (*"This includes verifiable and unverifiable information"*) + superlatives ("the first/best/only"); testimonials banned by **4.3.6 (in images)** and **4.3.7 (in listing text)**; 4.4.1 bans stats in app-card subtitle. Testimonials exist at `SHOPIFY_APP_STORE_LISTING.md:215-219`. Pricing conflict: $7/$25 (code) vs $29/$79/$199 (listing doc) vs $49/$149 (PROJECT_OVERVIEW).
8. **Docs drift:** PROJECT_OVERVIEW claims 95 and 97/100 in the same file, cites a nonexistent readiness doc; `legal/README.md` claims 13 docs, 6 exist; `env.example` missing `CRON_SECRET`.
9. **Expiring offline tokens (changelogs verified):** new public apps from **2026-04-01**; ALL public apps from **2027-01-01** (*"apps still using non-expiring tokens will receive authentication errors"*); 1h access token, 90-day rotating refresh token, `expiring=1` opt-in, irreversible token-exchange migration. Repo has no refresh logic; `shops.access_token` is a permanent token. Not launch-blocking.
10. **Scopes/PCD:** `env.example:21` lacks `read_customers`; code-default scopes (`src/config/app-config.ts:44-51`) include it, but `auth.ts` builds the authorize URL from raw `SHOPIFY_SCOPES`. PCD Level 2 approval required and never requested.
11. **App Bridge / Redis:** npm `@shopify/app-bridge ^3.7.10` in use; req 2.2.3 + changelog mandate the latest CDN `app-bridge.js` script tag (all App Store apps in admin since 2025-10-15). `src/queue/setup.ts:56-57` shares one IORedis (`maxRetriesPerRequest: 3`) with Workers — BullMQ 4.18.3 warns (doesn't crash) but blocking ops degrade; must be `null`. `env.example:40` shows `redis://` (Upstash needs `rediss://`).
12. **ShipStation API (ex-ShipEngine) pricing (official pricing-page FAQ, verified):** Advanced plan sold at *"1000, 5000 or 10,000 API calls per month to each of the following endpoints: … track parcels …"*; "Track **any** parcel" (third-party carriers — our use case) is Advanced-only; free plan tracks only their own discounted-carrier shipments. This is the main COGS.
13. **What's genuinely real (don't rebuild):** delay-detection service + processors, carrier/email/SMS service wrappers (real SDKs), webhook HMAC verification (no bypass), GDPR handlers, session-token JWT middleware, SQL analytics, `src/utils/api-client.ts:56-91` correctly attaches App Bridge session tokens (dead code today — mount it, don't rewrite it), Phase 2.1.a–e data layer incl. `/api/test-alert` dry-run endpoint.

## Appendix B — Live production probe matrix (2026-07-21 baseline → **2026-07-29 re-probe: ALL GREEN**)

Re-run against `https://delayguard-api.vercel.app` on 2026-07-29. Every probe meets its required post-deploy result.

| Probe | Baseline (broken) | Required after deploy | 2026-07-29 actual |
|---|---|---|---|
| `GET /` | 200 SPA shell, mock data | 200, embedded app loads real data | ✅ 200 |
| `GET /health` | (Koa unreachable; `api/health.ts` fakes healthy, `response_time: 0`) | 200 honest health from Koa | ✅ 200 — `healthy`, Postgres 3ms, Redis 2ms |
| `POST /webhooks/orders/updated` (no HMAC) | 404 platform NOT_FOUND | 401 (HMAC rejection — proves route is live) | ✅ 401 |
| `GET /api/alerts` (no session token) | 404 | 401 (session-token rejection) | ✅ 401 |
| `GET /api/cron/tracking-refresh` (no secret) | 404 | 401; with `CRON_SECRET` → 200 | ✅ 401; with secret → 200 (GH-Actions runs succeed) |
| `GET /billing/plans` | 404 | 200 plan info (single prefix!) | ✅ 200 |
| `POST /webhooks/customers/redact` (no HMAC) | 404 | 401 | ✅ 401 |
| `POST /webhooks/customers/data_request` (no HMAC) | 404 | 401 | ✅ 401 |
| `POST /webhooks/shop/redact` (no HMAC) | 404 | 401 | ✅ 401 |
| `GET /legal/privacy-policy` | 404 | 200 HTML | ✅ 200 |
| `GET /legal/terms-of-service` | 404 | 200 HTML | ✅ 200 |
| `GET /api` | 200 placeholder JSON ("Configure environment variables…") | gone or real | ✅ placeholder gone |

**Not covered by this matrix** (needs a real merchant session / dev-store install, tracked as §6 R2): embedded load inside Shopify admin, OAuth round-trip, per-shop webhook registration actually firing, and a webhook payload landing in `delay_alerts`.

---

## Session Log

| Date | Session / wave | Workstream | Outcome (tasks done, commit shas, blockers) |
|---|---|---|---|
| 2026-07-21 | Audit + 2× adversarial verification | — | Produced Appendix A ground truth + probe baseline |
| 2026-07-22 | Planning session | — | This plan authored; mirrored to gist `e58151df3f01b4e4b0901b9d00162e06` |
| 2026-07-22 | Wave 1 | WS-A + WS-B | Backend deployed (catch-all `api/[[...path]].ts`, middleware kill-chain, double-prefix fix, cron mount) + serverless job processing. Commits `c6f2ae70` (WS-A), `877c1881` (WS-B). |
| 2026-07-22 | Wave 2 · Session α | WS-C | Shopify platform correctness: API `2026-07`, customer-query rewrite, scopes, OAuth+state, `shopify.app.toml` authored. Commit `0e034a0b`. C4 `shopify app deploy` deferred to Wave-3 deploy; C5 post-launch (2027-01-01). |
| 2026-07-22 | Wave 2 · Session β | WS-D + WS-F | Schema single-source-of-truth + monitoring-tables cut; billing stub replaced with App-Pricing plan-gate (fail-closed to free). Commit `3e56dd7c`. D3 prod migration deferred (deploy-time secrets). |
| 2026-07-22 | Wave 2 · Session γ | WS-E | Notification pipeline: SendGrid dynamic-template code + `create-sendgrid-template` script, real tracking URLs, merchant-vs-customer routing. Commit `a88eac24`. E1 live template + send pending `SENDGRID_API_KEY` at deploy. |
| 2026-07-22 | Wave 2 · Session δ1 | WS-G | Frontend: App Bridge CDN tag + real API thunks replacing mocks (Phase 2.1.f UI wiring). Commit `fdc03f82`. |
| 2026-07-22 | Wave 2 · Session δ2 | WS-H | Legal docs hosted, listing copy sanitized (testimonials + stats removed, pricing → Free/$7/$25), feature media. Commits `55044eed` (H-1), `eb20d745` (H-2/H-3). H-4 AI self-review + submit is human. |
| 2026-07-22/23 | Wave 3 | Integration + WS-I | Merged all branches (`d522b248`→`66748a50`) + cross-workstream fixes (`e166516e`..`2587021d`: settings-flag source, getAlerts intelligence columns, alert status PUT, SMS plan-gate, `createCipheriv` Node-22, swagger stat removal, legal-route mount, quality-gates file list) + docs truth pass (this file, PROJECT_OVERVIEW, deploy.md, tests.md, CHANGELOG, env.example). **Husky pre-commit rewire (fix h) deferred:** husky not installed and git-root≠npm-root makes it fragile; commits + CI gate manually; revisit post-launch. **Key blocker remaining:** human dashboard gate H1–H9 + deploy-time steps (C4 `shopify app deploy`, D3 prod migration, E1 live SendGrid template, H4 PCD approval, H-4 listing submission). |
| 2026-07-28 | Wave 4 · Deploy | WS-A follow-through + D3 + C4 | **The app actually shipped.** Real production issues that only deploying could surface: `api/[[...path]].ts` → `api/index.ts` (bracket optional-catch-all doesn't resolve the bare `/api` rewrite outside Next.js — every route 404'd); `environment.ts` PORT/HOST `process.exit(1)` crashed the serverless cold start; `parseRedisUrl` dropped the `rediss://` TLS scheme so Upstash closed the connection; the husky `prepare` script exited 128 on Vercel's git-less build and failed `npm install`. Commits `87f8aa4f`, `f84839b2`, `23c73260`. **D3 done** (all 8 tables migrated on prod Neon). **C4 deployed** (`shopify app deploy` → `delayguard-3` released). Appendix B matrix green. |
| 2026-07-28 | Wave 4 · Scheduling | CI/cron | Vercel Hobby caps native crons at once/day, so sweep scheduling moved to a GitHub Actions workflow (`.github/workflows/cron-sweeps.yml`) curling the `CRON_SECRET`-guarded `/api/cron/*` endpoints every ~10 min. Test matrix dropped EOL Node 18 → 20.x only. Commit `b70e969d`. |
| 2026-07-28 | Wave 4 · Webhooks | C4 correction | `use_legacy_install_flow = true` forbids app-specific webhook subscriptions in the toml, so the three functional topics moved to per-shop registration after OAuth via a new `webhook-registration-service` (Admin GraphQL `webhookSubscriptionCreate`, idempotent, 10s timeout, best-effort). Compliance topics stay in the toml. Commits `265627c9`, `812b772b`, `0c9bf1d0`. 2,410 tests passing. |
| 2026-07-29 | Truth pass + blocker triage | Doc reconciliation | Plan was stale by 7 commits (it still described an undeployed app). Re-probed production — **entire Appendix B matrix green**, `/health` healthy (Postgres 3ms, Redis 2ms), GH-Actions cron sweeps succeeding every ~10 min. Reconciled §1, §2, C4, D3, E1, Appendix B; added **§6 Remaining blockers** as the new entry point. **E1 un-ticked and re-opened:** verified live that the SendGrid account returns `Maximum credits exceeded` on a sandbox send *and* that the production key is Mail-Send-only (`GET /v3/scopes`), so `/v3/templates` 403s and the template cannot be created — plus an unverified sender-identity risk on the hardcoded `noreply@delayguard.app` From address (§6 R1). Local CI: 2,409 passing / 25 skipped / 1 load-flake (`monitoring-service.test.ts:67`, passes in isolation — documented as a second known flake alongside the input-sanitization one). |
