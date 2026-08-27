# DelayGuard — Launch Execution Plan

*From verified reality to Shopify App Store submission, orchestrated across multiple Claude Code sessions.*

> **This file is the canonical, living copy.** It mirrors the gist "DelayGuard — Launch Execution Plan" (gist `e58151df3f01b4e4b0901b9d00162e06`; the original Release Reality Report lives in that gist's revision history). If this file and the gist ever disagree, this file wins.
>
> **How to maintain it:** when you complete a task, tick its checkbox and append `(done <commit-sha>)` to the task line. Log every working session in the Session Log at the bottom. If a verified fact in Appendix A drifts (Shopify changes policy, a file moves), update it in place with a dated note — never silently delete evidence.
>
> **Three rules learned the hard way (2026-07-29), when this file was found seven commits behind reality — it still described an undeployed app while production was live and healthy:**
> 1. **Update the doc in the same commit as the work.** Three whole sessions went unlogged because their commits shipped without touching this file. A launch plan that lies is worse than no launch plan: the next session wastes its first hour re-deriving reality, or worse, acts on the lie.
> 2. **A task is done when its acceptance criterion passes against production — not when the code compiles.** E1 sat ticked for a week on green CI while its acceptance criterion had never once passed. When you tick a box, say what you *observed*, not what you wrote.
> 3. **Prove blockers, don't assert them.** Every claim in §6 is backed by a live API call, a DNS lookup, or a probe pasted into the entry. "Probably broken" costs the next session a day of re-investigation; "returns HTTP 401 `Maximum credits exceeded`, verified <date>" costs it nothing.
>
> **Rewrite §7 (next-session kickoff) at the end of every session** — it is the handoff, and a stale one sends the next session at the wrong target.

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
- [x] **H4. Request Protected Customer Data access (Level 2)** — ✅ **GRANTED 2026-08-05** (see §6 R7). — app reads customer name/email/phone. State per-field use reasons (delay notifications + customer-intelligence display), complete the questionnaire. *Without approval, PII fields return null in prod.* ~~**← OPEN.**~~ Closed: the form lives in the **Partner** dashboard, and approval required building the Level 2 access log (v1.58).
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

- [ ] **E1 — Real SendGrid dynamic template `[AGENT+SECRET]`** (needs H5) (code done a88eac24; **live creation BLOCKED on the SendGrid account — see §6 R1**) · Create the delay-notification dynamic template **via the SendGrid API** (automatable — clean HTML with order/tracking/delay-reason/ETA merge fields), store the returned `d-…` ID in env as `SENDGRID_DELAY_TEMPLATE_ID` (**never set in Vercel — verified 2026-08-17**; `resolveDelayTemplateId()` in `src/services/email-service.ts` therefore throws on every production send). **Accept:** a dry-run via the existing `/api/test-alert` endpoint (Phase 2.1.e) sends a real email to the merchant address.
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

### ~~R1 — SendGrid account cannot send email~~ `[HUMAN]` — ✅ **CLOSED 2026-08-25 — one real email delivered**

*Closure evidence is at the end of this section ("R1 — CLOSED"). Everything between here and there is the four-gate history, kept because each gate hid the next one. Read it only if you are debugging email again.*

> **STATUS 2026-08-17 — sub-problems 2 and 3 are resolved; the plan and the template remain.**
>
> | # | Sub-problem | Status |
> |---|---|---|
> | 1 | Account over sending limit / expired trial | ⛔ **Open** — banner still reads *"Your free 60 day trial ended on November 26th, 2025."* Purchase decision. |
> | 2 | Wrong login email, mistaken for a suspension | ✅ **Closed 2026-08-05** by API-key-ID fingerprinting (below). |
> | 3 | From address not a verifiable sender | ✅ **Closed 2026-08-17.** `SENDGRID_FROM_EMAIL` shipped (v1.59, `7fb23cf7`); `augustok87@gmail.com` Single-Sender-Verified; env var set in Vercel production. |
> | 4 | Dynamic template does not exist | ✅ **Closed 2026-08-25.** Created as `d-5755ad471bd64f15bf2bd61f8b848ad0` with a temporary Full Access key (since deleted); `SENDGRID_DELAY_TEMPLATE_ID` set in Vercel and deployed. |
>
> **⚠️ NEW FINDING 2026-08-17 — `SENDGRID_DELAY_TEMPLATE_ID` was never set in Vercel at all.** `vercel env ls production` returns exactly one SendGrid variable, `SENDGRID_API_KEY`. Since WS-E shipped the production guard in `resolveDelayTemplateId()`, **every production delay email has thrown before reaching SendGrid** — so the account problems above were never even the first failure. This is a second instance of the R2 lesson: *a guard that fails loudly still fails silently if nothing ever calls it.* No probe in Appendix B exercises a send, so nothing surfaced it for three weeks.
>
> **⚠️ Operational fact, learned the expensive way (2026-08-05). The SendGrid account is NOT under `augustok87@gmail.com`.**
> Signing in with that address returns *"You are not authorized to access this account. Please contact your administrator or support for help."* — which reads like a suspension but simply means **wrong username for that account**. A support ticket was raised and closed unresolved before the real cause was found, and a full account migration was nearly started on the strength of it.
>
> **How to identify the owning account without guessing.** A SendGrid key is `SG.<key-id>.<secret>`; the middle segment is the **API Key ID**, and the console lists it under Settings → API Keys. The production key's ID is **`JZWkSywLQJqMdYsSIs5zNg`** — if that ID appears in an account's API Keys table, that account owns our credential. Confirmed 2026-08-05.
>
> **Why the API could not answer this itself:** the production key is correctly restricted to Mail Send, so `/v3/user/*`, `/v3/api_keys` and `/v3/teammates` all 403. The key ID comparison is the only identification route that works from outside.
>
> **The general lesson (a second instance of the same failure mode as B5 and the stale-client-ID screenshot): an authorization error names a *relationship*, not a *state*.** "Not authorized" answered *who is asking*, not *whether the account is healthy* — and the account was healthy the whole time. Before treating an auth failure as an outage, check the identity on both sides of it.

Email is the **only** notification channel at launch (§5 D3 ships SMS off), so an account that cannot send means the app's entire value proposition is inert in production. Two independent problems, both verified live against the SendGrid v3 API on 2026-07-29 using the key currently in Vercel:

1. **The account is over its sending limit.** A sandbox-mode `POST /v3/mail/send` (validates the request, delivers nothing) returns `HTTP 401 {"errors":[{"message":"Maximum credits exceeded"}]}`. **Every production delay email will fail until the plan is upgraded or the quota resets.** This is a paid-plan decision, not a code fix.
2. **The API key is Mail-Send-only, so E1 cannot run.** `GET /v3/scopes` returns exactly `mail.send`, `mail.batch.*`, `user.scheduled_sends.*`, `sender_verification_eligible`, `2fa_required` — no `templates.*`. `GET/POST /v3/templates` therefore returns `HTTP 403 access forbidden`, and `npm run sendgrid:create-template` cannot create the dynamic template.

3. **The From address cannot be a verified sender — confirmed by DNS.** `EmailService` sends from the hardcoded `noreply@delayguard.app` (`src/services/email-service.ts:58`), but SendGrid rejects any send whose From address is not a verified Sender Identity. DNS for `delayguard.app` (checked 2026-07-29) shows:
   - **No SendGrid domain-authentication records** — `em.delayguard.app` and `s1._domainkey.delayguard.app` both return NXDOMAIN, so the domain is definitively *not* authenticated with SendGrid.
   - **No MX records at all** — so `noreply@delayguard.app` cannot receive mail, which also makes **Single Sender Verification impossible** (SendGrid verifies by emailing a confirmation link to that address).
   - **~~The domain registration is ACTIVE and almost certainly ours.~~ ❌ RETRACTED 2026-08-17 — `delayguard.app` is almost certainly NOT ours.** RDAP facts stand: **registered 2026-02-06, expires 2027-02-06**, registrar **Squarespace Domains II LLC**, registrant privacy-redacted. The *inference* drawn from them was wrong, and four independent checks now point the other way:
     1. **The date disproves the theory it was built on.** The project's first commit is **2025-09-25**, and `noreply@delayguard.app` is in that commit. The domain was registered **2026-02-06 — four months later.** The address was therefore aspirational from day one; it was never "the domain we bought for the project."
     2. **It is absent from the owner's Squarespace account** — the Domains page reads *"There are no domains."*
     3. **No purchase receipt exists** in the owner's mail across four separate searches.
     4. **It serves "Squarespace — Website Expired,"** consistent with a lapsed site belonging to someone else.
     **The failure mode, third instance this launch (after B5 and the stale client-ID screenshot): circumstantial evidence that *fits* a theory is not evidence that *tests* it.** A name match plus a plausible registrar felt like proof; the one cheap check that could have falsified it — does the registration date precede the code that references it? — was never run. **Ask what would prove the theory wrong, not what is consistent with it.**
   - **DNS is managed at Squarespace; it is NOT Cloudflare and NOT Vercel.** Confirmed three ways 2026-08-05: `vercel domains ls` returns **0 domains** (the app only uses the free `delayguard-api.vercel.app` subdomain Vercel hands out — a different domain entirely, sharing only the word "delayguard"); the nameservers are `ns-cloud-d1..d4.googledomains.com`, and Cloudflare's are always `*.ns.cloudflare.com`; and `www.delayguard.app` is a CNAME to `ext-sq.squarespace.com` with the root A records on Squarespace's IPs. Panel: `account.squarespace.com` → Domains → `delayguard.app` → DNS Settings.
   - **⚠️ The root domain already publishes `v=spf1 -all` — Squarespace's default "this domain sends no mail" hard-fail policy.** It does **not** block SendGrid: with no custom return path, the envelope sender is `em4802.delayguard.app`, a subdomain that gets its own SPF through the CNAME chain, and SPF is evaluated on the envelope domain. **But it makes DMARC policy choice consequential.** SendGrid's wizard proposes `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`; under `aspf=s` the envelope domain must *exactly* equal the header From domain, and `em4802.delayguard.app` ≠ `delayguard.app`, so **SPF alignment fails by design and DKIM becomes the only thing keeping the mail alive**. Under `p=reject` a DKIM hiccup then means every delay notification is discarded silently, with no bounce to diagnose from. **Start at `v=DMARC1; p=none;`**, confirm real messages authenticate, then tighten. Leave the `v=spf1 -all` record alone — it is protective against spoofing and does not block the sending path.
   - **What expired is the Squarespace *website*, not the domain.** `https://delayguard.app` serves Squarespace's "Website Expired" page (HTTP 404). The DNS zone is still live and under Squarespace nameservers, so **records can still be added** — the lapsed site does not block SendGrid domain authentication.

   **✅ RESOLVED 2026-08-17 via the fallback path, not the domain path.** Since the domain is not ours, the From address moved to `SENDGRID_FROM_EMAIL` (v1.59, `7fb23cf7`) — configurable, trimmed, and **throwing in production when unset** rather than sending from an address that will bounce, matching the shape of `resolveDelayTemplateId()`. The placeholder is now `noreply@delayguard.example`; `.example` is reserved by RFC 2606, so unlike `delayguard.app` it can never collide with a domain someone else owns. `augustok87@gmail.com` was then **Single-Sender-Verified** and set as the production value.

   **⚠️ This is a deliberate stopgap, not the launch answer.** `gmail.com` publishes `v=DMARC1; p=none; sp=quarantine`, so SendGrid mail bearing a Gmail From fails both SPF and DKIM alignment. `p=none` means it will not be rejected outright, but spam placement is likely — and a buyer reading *"Your order is delayed"* from a stranger's personal Gmail has every reason to treat it as phishing. **Buy a domain before submission** (~$10/yr; `delayguardapp.com`, `getdelayguard.com`, `usedelayguard.com`, `trydelayguard.com`, `delayguardhq.com` and `delayguard.dev` all had no NS records on 2026-08-17). Switching is now **one env var, no code change** — which is the entire point of the v1.59 refactor.

**To unblock, in order:**
1. ✅ ~~**Resolve the account plan** in SendGrid~~ **Done 2026-08-25 — Essentials 50K purchased.** Original note: — the trial expired 2025-11-26 (paid-plan decision, the COGS line alongside ShipStation). **Expect this to be the gate that actually fails a send:** sender verification is an account setting and succeeds regardless, so a 401/403 on the first real send is the *plan*, not the identity. Do not go re-debugging the sender.
2. ✅ ~~Settle the sender identity.~~ **Done 2026-08-17** — see above.
3. ✅ ~~**Create the template.**~~ **Done 2026-08-25** — `d-5755ad471bd64f15bf2bd61f8b848ad0`, set in Vercel and deployed; temporary key deleted. Evidence table below.
4. ✅ ~~**Verify end-to-end**~~ **Done 2026-08-25 — better than the stated criterion: the proof came from the real cron pipeline, not `/api/test-alert`.** Original note: (E1's actual acceptance criterion). **Still not done** — blocked agent-side by R9 (no session token) and blocked in the browser by R10 until v1.61 deploys. No delay email has ever been successfully sent.

**✅ SUB-PROBLEM 4 CLOSED 2026-08-25 — the template now exists, and the account was verified before it was used.**

Sequence, each step verified rather than assumed:

| Step | Evidence |
|---|---|
| Temp key shape | The pasted value carried a **doubled `SG.` prefix** (4 segments, not 3). Proven by testing both forms: as-pasted → `401`, de-duplicated → `200`. §6 B5's lesson applied — check the input before trusting the failure it produces. |
| Key identity/scopes | 69 bytes, no trailing newline, key id `IyZGiWJ6TU630ncnWgXPMA`, **206 scopes** incl. all `templates.*`; `GET /v3/templates` → `200` where the production key gets `403`. |
| Template did not already exist | `GET /v3/templates` for **both** generations returned **0** — the plan's "never existed" claim confirmed *directly* for the first time, not inferred from a 403. |
| Created | `d-5755ad471bd64f15bf2bd61f8b848ad0` |
| Verified server-side | dynamic generation, 1 version, `active = 1`, correct subject, 4,228 bytes of HTML — read back from SendGrid, not trusted from the script's stdout. |
| Merge fields match the sender | The template's 8 handlebars fields are an **exact set match** to `EmailService.dynamicTemplateData`. A mismatch here renders blank values in real mail and fails nothing loudly. |
| Shipped | `SENDGRID_DELAY_TEMPLATE_ID` set in Vercel Production; `npx vercel --prod --yes` deployed, which also activated `SENDGRID_FROM_EMAIL` (set 8 days earlier but never live). New deployment aliased, Koa serving, `/health` green. |
| Temp key destroyed | Deleted by the owner; confirmed dead — `/v3/scopes` returned `200` with it before, `401` after. The local copy was removed. |

⚠️ **The key was pasted in plaintext into a chat transcript**, so it was treated as compromised and deleted immediately rather than after verification. Future temp credentials should be written to a file by the owner, never pasted.

**Remaining for R1: the expired trial, and nothing else.** Re-verified live 2026-08-25: a sandbox `POST /v3/mail/send` still returns `401 {"errors":[{"message":"Maximum credits exceeded"}]}`. Sub-problems 2, 3 and 4 are closed, so **the next failure a send hits will be the plan** — do not go re-debugging the sender or the template when it 401s.

⚠️ **Not yet observed: a successful send.** The template resolves and the env is live, but no delay email has ever left the building. `/api/test-alert` could not be fired agent-side (see R9), and the dashboard route was blocked by R10 until it was fixed. **Nothing here is proven end-to-end until one email is actually received.**

### 🎉 R1 — **A send reached SendGrid for the first time, 2026-08-25**

After v1.64, the production error changed from our own process to SendGrid's account:

```
before  Error: sgMail.setApiKey is not a function                     (our code, never reached the network)
after   Failed to send email: Unauthorized (401) Maximum credits exceeded   (SendGrid, over quota)
```

**This is the proof that layers 1–3 are genuinely closed**: the template ID resolved, the From address resolved, the SDK bound, and an HTTPS request left the process carrying a real message. **R1 is now, at last, actually one purchase.** Buy the plan and re-fire `/api/test-alert`; a delivered email closes R1 and unblocks H8's screencast.

### 🎉 R1 — **CLOSED 2026-08-25. The first delivered notification in the project's history.**

Proven three ways, none of them a UI claim:

| Evidence | Value |
|---|---|
| SendGrid Email Logs | **Delivered**, response `250 2.0.0 OK` |
| Recipient | `augustok87@gmail.com` — **primary inbox, not spam**, on the domain's first-ever send |
| From | `noreply@delayguardapp.com` — authenticated domain, DKIM keys resolving |
| Postgres | `delay_alerts.notification_sent_at` stamped `2026-08-25 19:51:05` |

**It came from the real cron pipeline, not the test button.** The delivered mail matched `delay_alerts` row 4 exactly (`delay_days = 23`, `WAREHOUSE_DELAY`, order `#DG1001`) — an alert that had been failing since 2026-08-22. The test-alert samples are `TEST-001` / `Sample Customer` / 3 days, and did not match. So what R1 finally proved is the **production notification path**, which is strictly better than proving the demo path.

Purchases made: SendGrid **Essentials 50K** ($19.95/mo) and **`delayguardapp.com`** ($10.46/yr, Cloudflare). Domain authenticated with 5 CNAMEs + DMARC `p=none`; both `_domainkey` CNAMEs verified by `dig` to resolve to real RSA public keys before the plan was confirmed.

**Sub-problem tally, final:** the account plan was the **fourth** gate, not the first. In order of discovery: unset `SENDGRID_DELAY_TEMPLATE_ID` → unowned sender domain → **SDK binding lost to CommonJS interop (R14)** → expired trial. Every one was invisible until the one in front of it was cleared.

### R8 — No working support mailbox, and the listing claims one `[HUMAN]` — **submission-blocking**

⚠️ **Correction to this plan's own warning, from `dig` on 2026-08-26.** §7 said Cloudflare Email Routing *"rewrites the zone's SPF"*. **`delayguardapp.com` has no SPF record at all** — no apex `TXT` whatsoever — so Cloudflare will *add* one (`v=spf1 include:_spf.mx.cloudflare.net ~all`) rather than rewrite one. The risk is therefore different from the one recorded: today SendGrid mail has SPF `none` and passes DMARC on **DKIM** alignment alone (`s1`/`s2._domainkey` both resolve into `sendgrid.net`, DMARC `p=none`); afterwards it could SPF-softfail. Whether the apex record even applies depends on SendGrid's Return-Path subdomain, which could not be determined from DNS this session. **Mitigation that is safe under either answer: after enabling routing, edit the TXT record to `v=spf1 include:_spf.mx.cloudflare.net include:sendgrid.net ~all`.** Confirmed still true today: **no MX on the domain**, so mail to `support@` is refused outright.

*Opened 2026-08-17, found by the same sweep that produced v1.60.*

`SHOPIFY_APP_STORE_LISTING.md` advertised **`support@delayguard.app`** (twice) and **`sales@delayguard.app`** as the app's contact addresses. Shopify's listing requirements include a working support contact, and **`delayguard.app` is not ours** (§6 R1 records the four checks) — the domain has **no MX records at all**, so those addresses cannot receive mail even in principle. Submitting with them means either a review rejection or, worse, an approval that leaves paying merchants with a support address that silently discards everything they send.

Both listing entries are now marked as unset rather than left looking plausible, because **the failure mode here is a value that reads as correct**. Nothing in the repo validates a support address; the only thing that would have caught it is someone trying to send mail to it.

**This is the same purchase as R1's sending domain — one domain resolves both.** Buy it, then: point `SENDGRID_FROM_EMAIL` at `noreply@<domain>`, create `support@` and `sales@` forwarding to a real inbox, and fill the two placeholders in `SHOPIFY_APP_STORE_LISTING.md`. **Accept:** send a message to `support@<domain>` from an unrelated account and confirm it arrives — the check that was never run on the old address.

**⚠️ UPDATE 2026-08-25 — half of this is now done, and the remaining half is ~10 minutes.** The domain purchase happened for R1: **`delayguardapp.com`** is ours, on Cloudflare DNS, and already authenticated for *sending* (5 SendGrid CNAMEs + DMARC `p=none`; `SENDGRID_FROM_EMAIL=noreply@delayguardapp.com` is live and has delivered mail).

**Sending is not receiving.** The domain has SendGrid CNAMEs, but **no MX records and no mailbox** — so `support@delayguardapp.com` today fails exactly the same way `support@delayguard.app` did. What is left, in order:

1. Cloudflare → `delayguardapp.com` → **Email → Email Routing** → enable. Cloudflare adds the MX + SPF records itself.
2. Add two custom addresses, `support@` and `sales@`, both forwarding to `augustok87@gmail.com`. Verify the destination address (Cloudflare emails it a confirmation link).
3. ⚠️ **Cloudflare's Email Routing setup replaces the zone's SPF record.** After enabling, re-check that SendGrid's `em*`/`s1._domainkey`/`s2._domainkey` CNAMEs are still intact and still DNS-only (grey cloud), and re-send a test alert. A broken sending domain would be a *worse* outcome than an unrouted mailbox.
4. **Accept (unchanged, and still the only check that matters):** send a message to `support@delayguardapp.com` **from an unrelated account** and confirm it arrives. Then, and only then, fill the two fields in `SHOPIFY_APP_STORE_LISTING.md` — they are currently marked UNSET on purpose.

*A stale `- [x] Support email ✓ support@delayguard.app` was also found and un-ticked in `app-store-assets/README.md` on 2026-08-25 — the checklist had been asserting the broken address was done.*

### ~~R12 — Merchant contact details reported "saved" and persisted nothing~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.62)**

Found immediately after v1.61 made the field typable, by asking the next question: *did the value actually land?* It had not. After ~12 "Settings saved successfully!" toasts, production showed `shops.merchant_email` empty and `shops.updated_at` **unchanged for 26 days** (still 2026-07-30). `data_access_log` held 82 rows, so the requests were real, authenticated and returning 200.

| Layer | Behaviour |
|---|---|
| `settingsToWire` | emits only the four `app_settings` columns — **drops** `merchantEmail`/`Phone`/`Name` |
| `PUT /api/settings` | reads only those four plus `custom_message` — never looks for contact fields |
| `updateMerchantSettings` | gates `UPDATE shops` on `hasContactUpdates`; nothing present → **no statement runs** |
| Response | `200 { success: true }` |

**Every layer was individually correct.** The contact fields have their own working endpoint — `PUT /api/merchant-settings`, camelCase body — that the frontend never called, because `apiClient` had no method for it. Fixed by adding `updateMerchantSettings` + `contactToWire`, with `saveSettings` persisting contact details separately and skipping the call when there is nothing to write.

**This is the second seam defect in two days** (after R10) that a 2,449-test suite could not see, for the same structural reason: every assertion sat on one side of a boundary, and the boundary was the bug. Recorded as a standing rule in [`.claude/rules/tests.md`](.claude/rules/tests.md) and [`frontend.md`](.claude/rules/frontend.md).

**The lesson: a silent success is the most expensive failure mode.** The UI confirmed success, the API returned 200, the logs showed traffic, and the data was discarded. Nothing short of querying Postgres would have caught it — which is exactly the "treat a silent success as suspicious" discipline this launch has now been bitten by three times (R2 step 3's synthetic payload, R1's never-set template, and this).

### ~~R13 — "Settings saved successfully!" fired even when the server refused~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.63)**

Found by chasing the merchant's question *"I can't click SMS notifications, why?"*

**The refusal is correct and must stay.** SMS is Pro-gated; the dev store's `currentAppInstallation.activeSubscriptions` is **`[]`** (queried live), so `getCurrentPlan()` returns `free` and `PUT /api/settings` answers `403 PLAN_UPGRADE_REQUIRED`. That is exactly the billing-leak protection `CLAUDE.md` mandates — **not a bug, and not to be "fixed"**.

**The defect was the feedback.** `useSettingsActions.saveSettings` did `await updateSettings(settings); showSaveSuccessToast();` — but `updateSettings` returns `dispatch(thunk(...))`, and a `createAsyncThunk` calling `rejectWithValue` **resolves** with a rejected action rather than throwing. The `catch` was unreachable, so the success toast was unconditional. It now inspects the action and shows the server's own reason.

**This masked R12 for its entire lifetime:** contact details were discarded for 26 days, and the merchant would have seen "saved successfully" even if the server had errored. **A success indicator that cannot report failure is decoration, not feedback** — the same defect class as a test that cannot fail (global rule #11), and the fourth silent success this launch.

**Open:** the SMS checkbox still looks freely clickable. A Pro badge / disabled state driven by the live plan beats click-then-revert, but it depends on **H3** (App Pricing plans), never configured.

### ~~R14 — Email never worked: `import * as` dropped the SendGrid SDK's methods~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.64)**

The merchant clicked **Send Test Alert** and got *"Delay detection test failed."* The production log named the cause, and it was **not** the SendGrid account:

```
ERROR: Failed to dispatch test alert   Error: sgMail.setApiKey is not a function
ERROR: Error processing notification   Error: sgMail.setApiKey is not a function
ERROR: Notification sweep failed for alert 4 {"alertId":4,"orderId":1}
```

`email-service.ts` used `import * as sgMail from "@sendgrid/mail"`. With `module: commonjs` + `esModuleInterop` that becomes `__importStar`, which copies only **own** enumerable properties. `@sendgrid/mail` exports an **instance of `MailService`**, whose `setApiKey`/`send` live on the prototype — both silently dropped. Proven directly, not inferred: `setApiKey own? false`, `on prototype? function`, `after __importStar: undefined`, `after __importDefault: function`. Fixed with a default import.

**⚠️ This rewrites R1's conclusion.** §6 had narrowed R1 to "one purchase — the expired trial". **That was never the first failure.** Every send has been throwing *inside our own process*, before any request reached SendGrid. Three distinct failures now sit in front of the account, each only discovered once the previous was made observable:

| Order found | Failure | Fixed |
|---|---|---|
| 1 | `SENDGRID_DELAY_TEMPLATE_ID` never set → `resolveDelayTemplateId()` threw | 2026-08-25 |
| 2 | From address was an unowned domain | v1.59 |
| 3 | **SDK binding lost to CommonJS interop** — nothing ever reached the network | v1.64 |

The expired trial is still real (`Maximum credits exceeded`, re-verified), but it is the **fourth** gate, not the first. **Do not treat "the account is the problem" as settled until a send is observed actually leaving the process.**

**Why 2,439 tests missed it.** `email-service.test.ts` does `jest.mock("@sendgrid/mail")` and asserts against a hand-written object carrying `setApiKey`/`send` as own properties — it tested the mock's shape, not the module's. **A mocked boundary cannot tell you the shape of the thing on the other side**, the same lesson R2 recorded for `query` and `registerWebhooks`, now paid for a third time. `tests/unit/services/email-service-sdk-binding.test.ts` is deliberately unmocked and fails against the old import with the exact production error.

**Also hit the real pipeline**, not just the test button: the cron sweep was failing identically on `delay_alerts` row 4 — a real alert from real order data that could never have been delivered.

### ~~R16 — The test alert could not report the provider's refusal~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.66)**

With R15 fixed the toast could carry a reason, but the reason was the route's generic fallback: *"Test alert failed: Failed to dispatch test alert"*, while the log held `Unauthorized (401) Maximum credits exceeded`.

`respondWithServiceError` returns only `fallbackMessage` for unrecognised errors — correct as a default. But this endpoint exists **so a merchant can diagnose their own notification setup**, so provider refusals are the one class that must be reported. `NotificationDispatchError` now wraps them and the route answers `502 NOTIFICATION_DISPATCH_FAILED` with its message.

Sanitised at the throw site: one line, trailing `null`s stripped, capped at 300 chars, and **`SG.*` / `SK…` key patterns replaced with `[redacted]`** — pinned by a test, so a provider that echoes a credential can never surface it in a merchant's browser.

### ~~R15 — The test alert's failure message could not vary~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.65)**

`showTestErrorToast()` took no arguments and always rendered *"Delay detection test failed. Please check your configuration."* Two very different production failures — an SDK binding error and SendGrid's quota — produced identical text, and both blamed a merchant configuration that was correct. It now shows the server's reason.

**Same class as R13**, on the adjacent path: a message that cannot vary carries no information. Every diagnosis this session required reading Vercel logs because the dashboard could not distinguish *"your code is broken"* from *"your account is out of credit"*. For a published app that gap is worse than cosmetic — a merchant seeing it has no next action.

### ~~R17 — One send marks EVERY alert on the order as delivered~~ `[AGENT]` — ✅ **FIXED 2026-08-26 (v1.67)**

Found by reading the database after R1's first delivery, not from any failure:

```
id | delay_days | email_sent |    notification_sent_at
 1 |          2 | t          | 2026-08-25 19:51:05.955614
 2 |          9 | t          | 2026-08-25 19:51:05.955614
 3 |         16 | t          | 2026-08-25 19:51:05.955614
 4 |         23 | t          | 2026-08-25 19:51:05.955614
```

**Four alerts, one email, one timestamp to the microsecond.** `queue/processors/notification.ts:167` marks completion with:

```sql
UPDATE delay_alerts SET email_sent = TRUE, notification_sent_at = COALESCE(...)
WHERE order_id = $1        -- not WHERE id = <the alert being sent>
```

The read at `:79` has the same granularity error — `SELECT email_sent … WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1` reads the *newest* alert for the order regardless of which one is being processed. The processor is order-scoped throughout; `notification-sweep.ts` selects **per alert**. The two disagree.

**Consequence in production: a merchant whose order slips repeatedly receives ONE email.** Every later delay on that order is suppressed and recorded as delivered. For a delay-notification product this is the worst failure mode available — customers stop being told, and the database reports success. It is also strictly worse than the known non-atomic dedupe already tracked in `CLAUDE.md`, because it discards notifications that were never attempted.

**Not caught by 2,446 tests** because the processor's tests mock `query` and assert the statement is *issued*, never that it touched one row. The guard that would catch it is an assertion on affected row count against a real schema.

**Fix (v1.67).** `NotificationJobData` now carries `alertId`, and both statements are keyed on it — the read selects `WHERE id = $1`, the write updates `WHERE id = $1`. The sweep already selected per alert (`da.id AS alert_id`) and now passes it; `delay-check.ts` threads the id out of `storeDelayAlert` so the enqueued job names the row that triggered it. A payload without `alertId` (a job enqueued before this field existed) resolves the newest pending alert once and is then treated identically — **every completion write is single-row in all cases.**

**The guard, and why it is a real one.** `__mocks__/pg.js` answers *every* `UPDATE` with `rowCount: 1` regardless of the statement, which is the mechanical reason 2,446 tests were blind: a statement that flips four rows is indistinguishable from one that flips the intended one. `src/tests/integration/notification-alert-scope.test.ts` therefore replaces `pg` with **pg-mem, a real SQL engine**, and builds the schema by running the production `runMigrations()` against it — so the tables are the deployed ones, not a transcription. Its five assertions are about database state after the fact, not statement text. **All five were run against the broken processor first and all five failed**, the first one reproducing production exactly: one send, alerts `1,2,3,4` flipped.

Schema fidelity was verified column-for-column against production `orders`, `delay_alerts` and `fulfillments`. Two narrow gaps are documented in the harness: pg-mem has no plpgsql, so `DO $$` blocks are shimmed by executing the `ALTER TABLE … ADD COLUMN` statements they guard; and one `UPDATE … FROM (subquery)` backfill is skipped (DML only — a failing *DDL* statement still throws).

**Three existing tests encoded the defect** — two asserted the UPDATE's parameter was `[101]`, the *order* id — and were changed, not worked around. Same pattern as R6's wildcard-CSP tests and R10's `loading` assertions.

**✅ PROVEN IN PRODUCTION 2026-08-26, in the real cron pipeline.** The fix was deployed, then the three synthetic alerts on order 1 were reset to unsent and the GitHub-Actions sweep triggered. The prediction was written down before observing: *fixed ⇒ three distinct `notification_sent_at`; still broken ⇒ one shared timestamp.*

```
id | delay_days | email_sent | notification_sent_at
 1 |          2 | t          | 2026-08-26 18:54:10.442473
 2 |          9 | t          | 2026-08-26 18:54:10.401908
 3 |         16 | t          | 2026-08-26 18:54:10.381144
 4 |         23 | t          | 2026-08-25 19:51:05.955614   ← untouched
```

**Three separate writes, ~20 ms and ~41 ms apart, in the sweep's `ORDER BY da.id DESC` order — and alert 4's original stamp preserved.** Compare the table at the top of this section: one timestamp across four rows. Because `email_sent` is only set inside `sendDelayEmail`'s `.then()`, three rows flipping is also proof that SendGrid accepted three separate messages.

⚠️ **A trap worth recording: the reset alone would have proven nothing.** The sweep filters `da.created_at > NOW() - INTERVAL '7 days'` and the three alerts were 11–25 days old, so all three were ineligible and the sweep would have sent zero mail — which reads identically to "the fix didn't work". Caught by running the sweep's own `SELECT` verbatim against production *before* waiting, rather than waiting and interpreting silence. Their `created_at` was moved inside the window for the test and **restored afterwards, verified byte-for-byte via `::text`** (a plain read renders the naive column in local time and looks 3 h off — the driver, not the data).

### R19 — The processor never selects the shop's domain, so SMS is dead on every plan `[AGENT]` — **new 2026-08-26, fixed same session (v1.67)**

Found while fixing R17, from the real-schema run's own output rather than from a failure: the email call showed `shopDomain: undefined`.

`orders` has **no `shop_domain` column** (verified against production). The processor's `SELECT o.*, …` named three columns from the `shops` join — `merchant_email`, `merchant_phone`, `merchant_name` — and not that one, so `order.shop_domain` was `undefined` on every notification. It is then passed to the SMS plan gate:

```ts
const plan = await billingService.getCurrentPlan(order.shop_domain);  // undefined
```

`getCurrentPlan` looks the shop up by domain, finds nothing, and **fails closed to `"free"`**, so `isSmsAllowed` is false for every shop on every tier. **SMS is therefore a paid feature that could never fire** — not a billing leak (the fail-closed contract held and did exactly its job), but a Pro/Enterprise entitlement that silently does nothing. It would have become merchant-visible the moment H3's pricing plans went live.

Fixed by selecting `s.shop_domain` explicitly. Two tests, both run against the broken code first: one asserts the plan gate receives the real domain, one asserts the domain reaches the email envelope. Both returned `undefined` before the fix.

**Why the existing tests could not see it:** they hand-build the order row that the mocked `query` returns, so the fixture supplied a `shop_domain` the real SELECT never fetches. **A mock that returns the row you wish the query returned cannot tell you the query is wrong** — only a real schema can.

### ~~R18 — The delivered email renders three merchant-visible defects~~ `[AGENT]` — ⚠️ **2 of 3 FIXED AND DEPLOYABLE 2026-08-26 (v1.68); defect 3 needs a SendGrid template push `[HUMAN]`**

From the actual delivered message, not a preview:

1. **`Order ##DG1001`** — the template emits `#{{orderNumber}}` while `orders.order_number` already stores `#DG1001`. Double hash on every real order.
2. **"New estimated delivery:" renders empty** — the real order has no estimated-delivery value and the template has no fallback, so the merchant reads a label with nothing after the colon.
3. **No tracking number and no "Track your package" button** — both are `{{#if}}`-guarded and the order carries neither value, so the email's primary CTA silently vanishes.

None of these were visible while the send path was broken. **The first real email is the first real test of the template** — every prior check was against sample data engineered to populate every field.

**The same three defects exist in the SMS body**, from the same cause — `sms-service.ts` interpolates `order #${orderNumber}`, `New ETA: ${estimatedDelivery}` and `Track: ${trackingUrl}` with no guards, so a real order renders `order ##DG1001 … New ETA: . Track: `. Never observed in production only because SMS has never fired (see R19).

**Fix (v1.68) — deliberately data-side, so it works against the template that is already live.** The production SendGrid API key is Restricted-Access with `mail.send` only (verified this session: `GET /v3/scopes` returns exactly `mail.send` + batch + scheduled-send; `/v3/templates` and `/v3/whitelabel/domains` both 403). **No session can push a template.**

| # | Defect | Fix | Live without a template push? |
|---|---|---|---|
| 1 | `Order ##DG1001` | `formatOrderNumber()` strips the prefix Shopify already stored; the renderer keeps its `#`. Applied to **both** channels | ✅ yes |
| 2 | Empty "New estimated delivery:" | `"Not yet available"` fallback in both channels — honest, not a fabricated date | ✅ yes |
| 3 | No tracking number and no CTA | Template gains an `{{else}}` branch: *"This order hasn't shipped yet — we'll send tracking details as soon as it does."* SMS drops the `Track:` clause entirely rather than dangling it | ❌ **email needs a push**; SMS half is live |

The contract chosen for defect 1 matters: **the renderer owns the `#`, the data carries the bare number.** That is what the deployed template already does (`#{{orderNumber}}`), so the template needed no change for this defect and the fix stays correct if the template is later re-pushed from source.

⚠️ **`src/scripts/create-sendgrid-template.ts` is now AHEAD of the template deployed in SendGrid** (it has the `{{else}}` branch; `d-5755ad471bd64f15bf2bd61f8b848ad0` does not). Closing defect 3 needs a temporary Full-Access SendGrid key, `npm run sendgrid:create-template`, then the new `d-…` id into `SENDGRID_DELAY_TEMPLATE_ID` and a redeploy — the same loop the 2026-08-25 session ran. **Note the script CREATES a new template rather than versioning the existing one**, so the id changes.

Eight tests; the six that pin defective behaviour were run against the broken renderers first and failed there. Two pass in both states by design and say so — they guard the over-correction (a real ETA must still pass through untouched; a real tracking URL must still appear).

### ~~R21 — Remote CI has been red on every push for days, so it is not a gate~~ `[AGENT]` — ✅ **FIXED 2026-08-26 (v1.71); closes R5**

Found by verifying the push rather than assuming it was fine. Both GitHub workflows fail on the pushed head — **and on every prior head going back at least to 2026-08-25**:

```
failure  1591d167  08-26T19:30  test: say why the two both-states tests are kept
failure  91385357  08-26T17:52  docs(launch): truth pass on the docs
failure  9b9a4025  08-25T20:02  docs(launch): R1 CLOSED
failure  974adc98  08-25T17:35  fix(test-alert): report the provider's refusal
…  (every push in the window is `failure`)
```

So this is **not** caused by the v1.67–v1.70 work; the local pre-commit gate passed 7/7 on every one of those commits. But a check that has failed continuously for days is worth exactly as much as one that has never failed — **nobody can see a real regression in it.** That is rule #11 in its mirror image, and it matters more than usual right now: the project is about to be submitted for external review with no working remote gate.

**Three independent causes, all pre-existing:**

| Job | Failure | Cause |
|---|---|---|
| `Database Schema Tests` | `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` | Connection-config problem in the schema-suite job. The workflow *does* set a valid `DATABASE_URL`, so something is overriding or bypassing it — not yet root-caused |
| `Unit & Integration Tests` | `input-sanitization` "large objects" + "exponential backoff for retries" | **§6 R5 exactly** — wall-clock assertions. GitHub's shared runners are slower and noisier than a dev laptop, so R5 fires there almost every run |
| `Unit & Integration Tests` | `monitoring-service` `performHealthChecks` / `getSystemStatus` | The already-known "a mock hides a real network call" problem recorded in `CLAUDE.md`: `checkExternalAPIs` reaches the public internet unless `jest.setup.ts` intercepts it, and on CI those calls behave differently |

**This is also the strongest evidence yet for R5's re-diagnosis.** Locally R5 is intermittent — three full runs on 2026-08-26 gave 1 failure, 1 *different* failure, then 0. On a consistently-loaded CI runner it is close to deterministic. That is what a wall-clock-under-load defect looks like, and it is not what order-dependent state leakage looks like.

**Fixed (v1.71). Each cause was root-caused, not silenced.**

**1. The schema job — a test file was overwriting CI's configuration.** Both suites carried a module-scope line:

```ts
process.env.DATABASE_URL = 'postgresql://localhost:5432/delayguard_dev';   // unconditional
```

CI's credentialed `postgresql://postgres:postgres@localhost:5432/delayguard_test` was discarded and pg reconnected **passwordless**, which the `postgres:15` service rejects with SCRAM — hence "client password must be a string". The workflow was correct the whole time.

**Proven before fixing, and the proof is the alarming part:** pointed at `postgresql://localhost:5432/definitely_not_a_real_db`, the suite **passed 11/11**. It could not fail, because the value under test was never the value used. Now `process.env.DATABASE_URL = process.env.DATABASE_URL || <dev fallback>`; the same probe correctly errors *"database does not exist"*, and both paths pass locally (51 tests: credentialed CI-shaped URL, and unset → dev fallback).

**2–4. The three timing/network tests now assert behaviour, not the machine.**

| Test | Was | Now |
|---|---|---|
| `monitoring-service` × 2 | Asserted health *status* while the checks grade themselves on real elapsed time (`responseTime < 100` for Redis) — so it asserted how fast the runner is | A stub clock (`freezeClock()`) makes every duration exact. Redis is pushed to 150 ms *by construction* for the degraded case, and a **new** test pins 99 ms → healthy |
| `input-sanitization` "large objects" | `expect(end - start).toBeLessThan(120)` | One `sanitizeString` call per key and per value — **exactly 2000 for 1000 properties**, measured, plus a correctness assertion |
| `optimized-database` backoff | Slept a **real 3 s** and asserted `duration > 3000`, against an implementation sleeping exactly 1000+2000 | Asserts the *requested* schedule: `[1000, 2000]`, plus a **new** test pinning the 5000 ms cap: `[1000, 2000, 4000, 5000]` |

**Every replacement was verified against a deliberately reintroduced regression:** a double-walking sanitizer is caught (4000 calls vs 2000 — the old timing check would likely have passed it on a fast machine); dropping `responseTime < 100` fails the degraded test; constant backoff fails both backoff tests; removing only the cap fails only the cap test. **The new checks are strictly stronger than the ones they replace**, and the suite got 8 s faster (35.5 s → 27.4 s) because two real sleeps are gone.

**R5 is closed by this.** Its remaining named offenders were exactly these; the mechanism was always wall-clock-under-load, and the tests no longer consult the wall clock.

⚠️ **It took two pushes, and the reason is worth recording.** The first attempt fixed three of four and CI stayed red — because **there are two `monitoring-service` test files**, `tests/unit/monitoring-service.test.ts` (423 lines) and `tests/unit/services/monitoring-service.test.ts` (215 lines), and only one was patched. The second file had *two* hidden dependencies rather than one: the same wall-clock problem, **and** it never stubbed `fetch`, so it passed only because `tests/setup/jest.setup.ts` installs a global one — the precise hazard `CLAUDE.md` already records for `checkExternalAPIs`. Both are now fixed and the second stubs `fetch` itself.

**The lesson: "I fixed the failing test" is a claim about a file, not about the suite.** Verifying against CI rather than declaring victory is what caught it — the same discipline that this plan keeps having to relearn. *(The duplicate-monitoring-test-file overlap is real and unaddressed; a future cleanup, not a launch item.)*

### R22 — The Application health check measured heap against the wrong denominator `[AGENT]` — **new 2026-08-26, fixed same session (v1.72)**

**Found by instrumenting a test instead of guessing at it a third time.** Two hypotheses for R21's last red test (the clock, then the unstubbed `fetch`) were each partly right and neither sufficient, and `expect(checks.every(c => c.status === 'healthy')).toBe(true)` reports *"expected true, received false"* — naming nothing. The assertion was rewritten to list the offending checks with name, status, duration and details. The next CI run answered immediately:

```
Application=unhealthy rt=0 err=- details={"uptime":45.7,"memoryPercentage":124,...}
```

**`memoryPercentage: 124`.** A share of total system memory cannot exceed 100, so the formula was wrong, not the machine:

```ts
const memoryPercentage = (memoryUsage.heapUsed / require("os").totalmem()) * 100;
```

It compares a **V8 heap** number against **system** memory — not the quantity the check is about, and not even an upper bound: on a cgroup-constrained host `totalmem()` can report *less* than the heap the process legitimately holds. Above 90 the check reports `unhealthy`.

**This is a production defect, not a test artefact.** `routes/monitoring.ts` calls `performHealthChecks()` and `getSystemStatus()` on four separate paths, so a Vercel function could report itself unhealthy on a meaningless ratio — in front of a Shopify reviewer or an uptime monitor.

Fixed to measure against `v8.getHeapStatistics().heap_size_limit` — what the process actually runs out of, and bounded by construction. Two tests, both run against the broken code first: the CI shape (2 GB heap, 1 GB reported total) must read **25 %** of an 8 GB limit and be healthy — it read **200 %** before — and a genuinely exhausted heap (3.8 GB of a 4 GB limit) must still report `unhealthy`, so the fix cannot make the check unfailable.

**The lesson, and it is the cheapest one here: a test that fails without saying why gets debugged by guessing.** Two blind CI round-trips bought nothing; one self-describing assertion found a real production bug on the next run.

### ~~R23 — `/monitoring/health` returns 503 in production, permanently and by construction~~ `[AGENT]` — ✅ **FIXED 2026-08-26 (v1.73)**

Found by probing the live endpoint after deploying R22, rather than assuming the deploy was enough. **The good news first: R22 is confirmed fixed in production** — `Application: healthy`, alongside Database and Redis. But:

```
GET https://delayguard-api.vercel.app/monitoring/health  →  HTTP 503
{"status":"degraded", "checks":[
  {"name":"Database","status":"healthy","responseTime":2},
  {"name":"Redis","status":"healthy","responseTime":2},
  {"name":"ShipEngine","status":"degraded","responseTime":11},
  {"name":"SendGrid","status":"degraded","responseTime":47},
  {"name":"Twilio","status":"degraded","responseTime":24},
  {"name":"Application","status":"healthy","responseTime":1}]}
```

`checkExternalAPIs` (`monitoring-service.ts:309`) issues an **unauthenticated `HEAD`** to `https://api.sendgrid.com/v3/mail/send`, `https://api.shipengine.com/v1/rates` and `https://api.twilio.com/2010-04-01/Accounts`, then grades `response.ok`. Those are authenticated POST/GET endpoints: a bare HEAD returns 401/403/405 and **can never be 2xx**. So all three are degraded on every call, forever, and the route maps degraded → 503.

**Two further problems in the same function:**
- **No timeout.** `CLAUDE.md`'s own money-path invariant requires an `AbortController` timeout on every third-party call. This one can hang against three vendors on a 30 s Vercel function.
- **It duplicates working code.** `EmailService.ping()` and `SMSService.ping()` already exist, already authenticate correctly, and already carry `PING_TIMEOUT_MS`. The health check reimplemented them wrongly instead of calling them.

**Severity: not submission-blocking** — the endpoint is not advertised in the listing and `/health` (the public one) is healthy and correct. But any uptime monitor pointed at it reads a permanent outage, and the monitoring feature is currently worthless.

**Fixed (v1.73) by deleting the hand-rolled probe entirely.** `checkExternalAPIs` now delegates to `CarrierService.ping()`, `EmailService.ping()` and `SMSService.ping()` — which authenticate correctly, already carry `PING_TIMEOUT_MS`, and never throw. `PingResult`'s three states map 1:1 onto `HealthCheck`'s, and preserving that mapping is the point: *"the vendor rejected our credentials"* (degraded) is a different fact from *"we could not reach the vendor"* (unhealthy), and the HEAD probe collapsed both into one permanent falsehood. The three probes now run concurrently rather than in series.

Four tests, all run against the broken probe first. Two pin the mechanism so a regression cannot slip back: one asserts a rejected credential grades **degraded, not unhealthy**, and one asserts the path **never touches `global.fetch`**. Verified by reintroducing each defect — collapsing degraded→unhealthy fails exactly the first, and re-adding a hand-rolled `fetch` fails exactly the second.

**One more layer underneath (v1.73b).** Deploying the delegation turned ShipEngine and Twilio healthy but left **SendGrid degraded — now for a true reason.** `EmailService.ping()` probed `/v3/user/profile`, which requires a scope the production key does not have: it is Restricted-Access `mail.send` only. Verified live with that key: **`/v3/user/profile` → 403, `/v3/scopes` → 200.** The check was reporting honestly; the *probe target* was wrong, testing a scope the app never needs instead of whether the credential is live. Repointed at `/v3/scopes`, which answers for any valid key.

⚠️ **The duplicate-test-file trap bit again and was caught locally this time.** `tests/unit/monitoring-service.test.ts` stubbed `global.fetch` in ten places to simulate vendor states; with `fetch` no longer on the path those stubs were inert and six tests failed. Both files now mock at the service level. **This is the third time in one session that two copies of the same test drifted apart — the overlap is real technical debt and should be collapsed post-launch.**

### R24 — Two of the three delay rules have never worked `[AGENT — code DONE, awaiting an EasyPost key]` — **resolved by migration, not by purchase (v1.75)**

**Status 2026-08-26 (g): the code no longer depends on ShipEngine.** The decision was *not* to buy the plan — see the cost note below — but to move carrier tracking to **EasyPost** (decision **D4**). Implementation is complete and the local gate is green (2,525 passing, 0 failing). **The only thing left is a key**, which is a human step: create a free EasyPost account, then paste the Test key (`EZTK…`) and later the Production key (`EZAK…`).

**Why not upgrade.** ShipStation Advanced is **$75/mo** against DelayGuard's own $7/mo Pro tier — about **11 paying merchants just to break even**, at zero. EasyPost charges **$0.01–0.03 per shipment**, so the dependency scales with revenue instead of ahead of it. Verified on the ShipStation billing page 2026-08-26: current plan is **Free, $0/mo**.

**The migration is a net capability gain, not a workaround.** EasyPost reports lateness in `status_detail` (`delayed`, `weather_delay`, `delivery_exception`, `transit_exception`, `lost`, `damaged`); **ShipEngine exposed no equivalent at all.** Those map onto the existing internal `DELAYED`/`EXCEPTION` vocabulary, so `delay-detection.ts` was not touched.

**A second bug the migration would have caused, caught before it shipped.** EasyPost returns only the *current* estimate, and both ETA writers copied a provider-supplied `original_estimated_delivery_date` straight into `original_eta`. Left alone, every refresh would have written NULL and **silently disabled the `DATE_DELAY` rule** — the exact failure mode R24 is about, reintroduced by its own fix. Both writers now `COALESCE(original_eta, $1)`, freezing the first estimate ever observed. Pinned by pg-mem tests against the production schema; the `pg` mock cannot make that assertion (see `.claude/rules/tests.md`).

**What is verified, and what is not.** Verified this session: the endpoints exist and Basic-auth-with-key-as-username is the right scheme (unauthenticated probes return 401; a bogus key returns **403 `APIKEY.INACTIVE`**, which is now mapped to "Invalid API key"). **Not verified:** the request/response wire shape against a real key. That is the first thing to check when the key arrives.

**⚠️ Do not deploy until `EASYPOST_API_KEY` is set in Vercel** — boot validation requires it and will fail fast by design.

<details><summary>Original evidence (ShipEngine refusal, kept for the record)</summary>

**PROVEN on 2026-08-26, twice.** Re-probed with `carrier_code=usps` as well, on the theory that UPS might simply not be connected — it is (`se-3610121`), and USPS returns the identical 401. It is a plan entitlement, not a carrier gap or a bad credential (`/v1/carriers` returns 200 with 4 carriers).
</details>

H7 has sat in §2 as *"confirm the Advanced plan is active — OPEN/unverified"* since day one. It was tested against the live API on 2026-08-26 and it is **refused**:

```
GET https://api.shipengine.com/v1/tracking?carrier_code=ups&tracking_number=1Z999AA10123456784
{"errors":[{"error_type":"security","error_code":"unauthorized",
  "message":"You must upgrade your billing plan or add required features to access this endpoint."}]}
```

Same for USPS. The key authenticates fine — `GET /v1/carriers` returns 4 connected carriers (usps, ups, fedex_walleted, globalpost) — so this is a **plan entitlement**, not a credential problem. *(An authorization error names a relationship, not a state: here the relationship is "this plan does not include this endpoint".)*

**What depends on it:** `CarrierService.getTrackingInfo()` (`carrier-service.ts:40`) calls exactly that endpoint, and `delay-check.ts:118` calls it to run **RULE 2 (carrier-reported delays)** and **RULE 3 (stuck in transit)**. Only **RULE 1 (warehouse delay)** needs no carrier data.

**The production database corroborates it exactly:**

| Evidence | Value |
|---|---|
| `delay_alerts` grouped by `delay_reason` | **`WAREHOUSE_DELAY` × 4 — nothing else, ever** |
| `tracking_events` rows | **0** |

**So two of the app's three detection rules have never once fired in production, and the only rule that works is the one that never asks a carrier anything.**

**Why this is submission-relevant, and worse than R20.** The listing sells carrier tracking as the headline capability, not a side channel: *"tracks carrier events"*, *"**Real-time monitoring** of orders across major carriers (UPS, FedEx, DHL, USPS, and more)"*, *"**Automatic tracking updates** on a regular refresh schedule"*, *"DelayGuard monitors carrier tracking data and alerts you the moment this threshold is crossed"*. R20 was fixable by deleting the copy, because SMS is a secondary channel. **This is not** — remove carrier tracking from a delay-detection app and there is no product left.

**Therefore the fix is the purchase, not the copy: H7 must be done before submission.** `[HUMAN]` — upgrade the ShipEngine plan to one that includes the tracking endpoint, then re-run the probe above and confirm a 200.

**Fourth instance of the same failure mode this project keeps paying for** — SendGrid trial → Twilio trial → SendGrid key scopes → ShipEngine plan. **The third-party account tier is invisible from inside the repo, and no amount of correct code substitutes for it.** Ask the vendor what it will let you do.

### R25 — A carrier failure discarded a delay that had already been detected without the carrier `[AGENT]` — **new 2026-08-26, fixed same session (v1.74)**

Found by asking what R24 will do to the *code*, not just to the feature — specifically, what happens the moment an order carries a tracking number.

`processDelayCheck` runs RULE 1 (warehouse) first, which needs **no carrier data at all**: it compares the order's own age against a threshold, and by the time RULES 2–3 begin, its `delay_alerts` row is already persisted. The carrier fetch then sat **unguarded** in the middle of the function:

```ts
trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);   // throws
…
if (delayDetected && …) { await addNotificationJob({…}); }                          // never reached
await query(`UPDATE orders SET updated_at = …`);                                    // never reached
```

`getTrackingInfo` converts a ShipEngine 401 into `throw new Error("Invalid API key")` (`carrier-service.ts:90`), and the processor's outer `catch` rethrows. **So an already-detected, already-persisted warehouse delay was thrown away, and `orders.updated_at` never moved.**

**This is live, not hypothetical.** R24 proves ShipEngine refuses `/v1/tracking` on the current plan, so **every order carrying a tracking number aborts its entire delay check — including the one rule that would still have worked.** It has been masked only because production contained a single *unfulfilled* synthetic order; it would have fired the moment order `#1001` was fulfilled with tracking.

**Fixed with a deliberately narrow boundary** around the carrier call only. A failure logs a warning, sets `trackingInfo = null`, and RULE 2 is skipped for that tick; **RULE 3 is unaffected** because it reads `orders.tracking_status` / `last_tracking_update` rather than the live fetch. Database and scoring failures still propagate so BullMQ's `attempts: 3` retries them. Carrier data is re-fetched next sweep, so skipping RULE 2 for one tick costs *latency in detection, never a lost detection*.

Three tests pin **both** sides of the contract, and each was verified against the matching mistake: removing the boundary fails the two R25 tests; widening it to swallow every error fails the third (a Postgres failure must still reach BullMQ). Notably `delay-check.test.ts` contained **zero** `mockRejected` cases before this — the entire carrier-failure path was untested.

### R20 — The listing sold SMS on both paid plans, and SMS cannot send at all `[AGENT]` — **new 2026-08-26, listing fixed same session (v1.70)**

Found by asking Twilio instead of assuming, in the same spirit as R1's SendGrid account. Every answer is disqualifying:

| Check (Twilio REST API, 2026-08-26) | Result |
|---|---|
| Account type | **Trial** |
| Phone numbers owned (`IncomingPhoneNumbers`) | **NONE** |
| `TWILIO_PHONE_NUMBER` in Vercel production | `+13188273941` — **not on this account** |
| Verified destinations (a trial can send ONLY to these) | one Argentine number |
| Messages ever sent (`Messages`) | **0** |

Because the configured From number does not belong to the account, every send fails with Twilio **21606** before the trial's verified-recipient restriction even applies. **R19 explains why this never surfaced:** SMS could not reach Twilio at all, so the broken credentials were never exercised. Two independent faults stacked in the same channel, and the outer one hid the inner one — the same shape as R1's four gates.

**Why it was submission-blocking:** `SHOPIFY_APP_STORE_LISTING.md` advertised SMS in five places, including the **Pro ($7)** and **Enterprise ($25)** feature lists, and `billing-service.ts` listed *"Email and SMS notifications"* on both paid tiers. A reviewer who subscribes to Pro and enables SMS gets silence. Rejection costs a full review cycle.

**Resolution: align the copy to the decision this plan already made.** §5 **D3** says *"SMS at launch → Off (email-only). Avoids A2P 10DLC wait; SMS stays a paid-tier feature to enable later."* The schema already agreed (`sms_enabled BOOLEAN DEFAULT FALSE`); only the merchant-facing copy never got the memo. SMS is removed from the listing, the plan feature lists, and the asset README — **but stays gated in code**, so re-enabling is a config change rather than a rewrite.

`src/tests/unit/services/billing-plan-claims.test.ts` pins the invariant and is explicitly marked for deletion once SMS is real. It failed on both paid tiers before the fix.

**Reopening SMS requires, in order:** upgrade the Twilio account off trial → buy an SMS-capable number → **A2P 10DLC brand + campaign registration** (carrier approval takes days to weeks) → restore the copy → prove one real delivery. Do not restore the copy before that last step.

### R9 — The agent can no longer authenticate to Shopify, or read any Vercel secret `[HUMAN]` — **new 2026-08-25**

Two operational facts this plan asserted as ground truth are **false as of today**, and together they block all agent-side verification of authenticated endpoints:

1. **`shopify app env show` returns `403 "You are not a member of the requested organization"`.** The CLI is logged into an account that cannot see the app's org. This is the same wall §6 R2 recorded on 2026-07-30 and considered resolved; it has regressed (or the session expired).
2. **Every credential in Vercel production is typed `Sensitive`**, so `vercel env pull` returns `[SENSITIVE]` for `SHOPIFY_API_SECRET`, `SHOPIFY_API_KEY`, `CRON_SECRET`, `SENDGRID_FROM_EMAIL` and `SENDGRID_DELAY_TEMPLATE_ID` alike.

**Consequence:** a session can no longer mint a valid App Bridge session token, so it cannot call `/api/*` (incl. `/api/test-alert`), and cannot call the `CRON_SECRET`-guarded `/api/cron/*` endpoints either. Every previous session that "forged a correctly-signed token" depended on `shopify app env show` working. **Any plan step that says a session can verify an authenticated endpoint without a human is now wrong.**

**To unblock:** `shopify auth login` as the account owning org `185109091`, then confirm `shopify app env show` prints the credentials. Until then, authenticated verification is a `[HUMAN]` browser action.

*Note: the older `SENDGRID_API_KEY`, `TWILIO_AUTH_TOKEN`, `DATABASE_URL` and `SHIPENGINE_API_KEY` are typed `Non-sensitive`, so their plaintext IS retrievable via `env pull` — which is how production Postgres is still reachable. That asymmetry is a security finding in its own right: tighten those to Sensitive before the listing goes live, but expect it to cut off DB access for future sessions.*

### ~~R10 — A save unmounted the form it was typed into~~ `[AGENT]` — ✅ **FIXED 2026-08-25 (v1.61), deploy pending**

Reported from the live dashboard: *"Everytime I enter a letter it autosaves and takes me back to Delay Detection Rules."* **This blocked R1's own acceptance test** — `/api/test-alert` sends to `shops.merchant_email`, which was empty, and the field could not be typed into.

Chain: every input in `NotificationPreferences` is `disabled={loading}`, and the component persists on every `onChange` with no debounce. So: keystroke → `saveSettings()` → `saveSettings.pending` sets `settings.loading = true` → `RefactoredApp.optimized` folds it into the one `loading` prop → **the input becomes disabled** → the browser drops focus from a disabled element → fulfilled → re-enabled, focus gone. One character per click-back-in.

**Root cause: a mutation flipped the flag meaning "the initial fetch is running".** `SettingsState` now separates `loading` (initial fetch, may gate interactivity) from `saving` (write in flight, never does). Six existing tests asserted `loading` on the mutation thunks — **they encoded the defect**, exactly like R6's wildcard-CSP tests — and were changed, not added. New coverage includes a **seam test** that reads `loading` from a real store during a real write and asserts the field stays enabled; it was run against the broken code first and fails there.

⚠️ **Correction — the first published diagnosis was wrong.** The initial commit claimed `loading` caused the form to *unmount and remount*. It does not: `loading` is used only for `disabled=`, never to swap the subtree. The trigger and the fix are identical either way, but the mechanism was asserted before `DashboardTab`'s actual use of the prop was read. **A mechanism that explains the symptom is not necessarily the one causing it — read the consumer before naming the cause.**

**Why a 2,449-test suite missed it:** every assertion lived on one side of the seam. Reducer state was correct; the component correctly disabled itself when told to. Only the *mapping* was wrong. **A unit test cannot see a defect that exists between two units.**

⚠️ **One of the three new tests was discarded during verification** — `fireEvent.change` fires on a disabled input in jsdom, so it passed in both the broken and fixed states. A test that cannot fail is not a check (global rule #11); it was deleted rather than kept for appearances.

**✅ Second half closed 2026-08-25 (v1.62)**, after the merchant reported it directly: *"It saves everytime I type, that's a horrible UX."* ~20 `PUT`s, ~20 `data_access_log` rows and ~20 stacked success toasts per email typed. `NotificationPreferences` now debounces at 1 s with local state for instant feedback, matching `SettingsCard`. Three pre-existing tests asserted the synchronous save — the defective behaviour — and were updated rather than worked around.

**Workaround while the fix is undeployed:** paste the value instead of typing it — a paste is a single change event.

### ~~R11 — The boot-time env validator does not check the variables that broke email~~ `[AGENT]` — ✅ **FIXED 2026-08-26 (v1.69)**

`config/environment.ts`'s optional-variable list is exactly `SENTRY_DSN`, `CSRF_SECRET`, `JWT_SECRET`. It does **not** check `SENDGRID_DELAY_TEMPLATE_ID` or `SENDGRID_FROM_EMAIL` — the two variables whose absence silently broke every production delay email for three weeks (R1).

This was found by trying to use the startup log as evidence that the deploy had picked up the new values: the log showed no warning about them, which looked like confirmation. **It was not — the validator never looks at them, so its silence is not evidence.** A check that cannot fail proves nothing (global rule #11).

`resolveDelayTemplateId()` and `resolveFromAddress()` do throw in production, but only on the send path, and nothing ever sent. Adding both to the validator would have surfaced R1 at the first cold start.

**Fix (v1.69), with one deliberate constraint.** `validateSendGridDelivery()` now checks both. But module load calls **`process.exit(1)`** on an invalid production environment (`config/environment.ts:314`) — so a false positive here is not a noisy log, it is a **total outage of every serverless function that imports the module**, including `/health`. The checks are therefore split:

| Condition | Production | Elsewhere | Why |
|---|---|---|---|
| Variable **absent** | ❌ error (fatal) | ⚠️ warning | Unambiguous, and a deployment that cannot deliver its only product should not report itself healthy |
| Template id is EmailService's dev placeholder | ⚠️ warning | ⚠️ warning | Known-bad value, but not worth an outage |
| From-address doesn't look like a bare email | ⚠️ warning | ⚠️ warning | See below |

**The format checks never kill production, on purpose.** The first draft rejected any template id not matching `^d-[0-9a-f]{32}$`. That regex was a *belief about SendGrid's id format that this session could not verify* — the production value is a `Sensitive` Vercel variable no session can read (R9). Same for the From address: SendGrid also accepts `Name <addr@host>`, which the pattern would reject. Either rule, if merely too narrow, would have taken down a perfectly working deployment. **Reject what is known-bad; never guess at what is known-good.**

The new fatal condition is safe to ship because it is strictly implied by an event that already happened: the send path *already* refuses to run in production without both variables, and a real email was delivered from production on 2026-08-25. Both are therefore present and non-empty.

Six tests, all run against the old validator first.

**✅ Deployed and verified 2026-08-26 — and the probe pays for itself immediately.** `/health` returns `200` with Postgres 3 ms / Redis 2 ms on the new deployment. `routes/health.ts` imports the validator, so a `200` means the module loaded **without** `process.exit(1)`, which means production validation passed, which means **both SendGrid variables really are present and non-empty in production.** That was previously only inferable from the fact that a send once succeeded; it is now directly observed, through variables no session is allowed to read.

### ~~R2 — End-to-end verification on a real dev store~~ `[HUMAN]` + `[AGENT]` — ✅ **ALL 4 STEPS PROVEN, 2026-08-05**

The app had never completed a real merchant install. **It has now** — dev store `delayguard-dev.myshopify.com`, 2026-07-30. Status of the four steps:

| # | Step | Status |
|---|---|---|
| 1 | OAuth authorize → callback → HMAC → `state` → token exchange → `upsertShop` | ✅ **Proven.** `shops` row id=1 with a 38-char token and `scope = {write_orders,write_fulfillments,read_products,read_customers}` (Shopify collapses `read_*` into the implying `write_*` — correct, not a missing scope), plus the seeded `app_settings` row. |
| 2 | Three webhook subscriptions registered per-shop | ✅ **Proven 2026-08-05**, the moment R7's PCD grant landed. Registered over the Admin API with the stored token — **no reinstall, no browser** — then confirmed by asking Shopify, not by trusting the create calls: `webhookSubscriptions` returns **3** — `ORDERS_UPDATED` → `/webhooks/orders/updated`, `FULFILLMENTS_UPDATE` → `/webhooks/fulfillments/updated`, `ORDERS_PAID` → `/webhooks/orders/paid`. |
| 3 | Real `orders/updated` → HMAC → Postgres | ✅ **Proven app-side.** A validly-signed payload returned `{"success":true}` and landed in `orders` with **every** column correct, incl. the Phase 2.1.b/c/d financial + shipping fields. Synthetic payload, because step 2 blocks Shopify from delivering real ones. |
| 4 | Embedded dashboard + session token + real data | ✅ **Proven.** Admin shows "Connected to delayguard-dev"; all five endpoints the dashboard calls return 200 with real rows (`/api/shop`, `/api/settings`, `/api/orders`, `/api/alerts`, `/api/analytics`). |

**Seven defects were found and fixed to get there. Four of them (B4, B5, B6, B12) were invisible to a fully green 2,385-test suite and to the entire Appendix B probe matrix** — the suite mocks `query` and mocks `registerWebhooks`, and the matrix never walked a merchant's entry point. **The general lesson: a mocked boundary cannot tell you the thing on the other side exists.** Every defect below was found by reading production logs, querying the production database, or asking Shopify directly — never by inference.

*Full detail for B1/B2 (found before the first click) is retained below; B4–B12 follow.*

**Session 2026-07-29 (b): two install-blocking defects found and fixed *before* the first click** (commit `560b86b0`), by reading the live install path instead of trusting it. Both were invisible to the 2,385-test suite and to the entire Appendix B probe matrix, because neither the suite nor the matrix ever walked the merchant's actual entry point.

- **B1 — the OAuth authorize URL carried a corrupted scope. ✅ FIXED AND VERIFIED LIVE.** Live `GET /auth?shop=…` 302'd to Shopify with `scope=…%2Cread_products%2Cread_customers%0A`. The `%0A` is a newline, so the final scope was literally `read_customers\n` — Shopify either rejects the grant outright or drops `read_customers`, the scope Phase 2.1.a customer intelligence depends on. `app-config.ts` split `SHOPIFY_SCOPES` on `,` without trimming. `parseScopes()` now trims every entry, drops empties, and falls back to the code defaults when nothing usable remains (5 new tests). **Verified after deploy:** the authorize URL now ends `…read_products,read_customers` with no `%0A`/`%0D`/`%20`.

  ⚠️ **Trap worth remembering — `vercel env pull` lies about trailing whitespace.** The pulled `SHOPIFY_SCOPES` value is byte-for-byte clean (checked with `od -c`), and `vercel env ls` shows it untouched for 283 days, which initially looked like the newline came from somewhere else. It doesn't: curling the *previous* deployment directly at its immutable URL — same env, but the old untrimmed code — still returns `…read_customers%0A`. So the runtime value genuinely ends in a newline and the CLI normalizes it away on export. **Don't verify an env var's whitespace with `env pull`; verify it through the running deployment.**
- **B2 — the app URL never started OAuth. ✅ Fixed in `vercel.json`.** shopify.dev (authorization-code grant, fetched 2026-07-29): *"When a user installs your app through the Shopify App Store or using an installation link, your app receives a `GET` request to the App URL path… The request includes the `shop`, `timestamp`, and `hmac` query parameters."* The app must then redirect into OAuth. Production served the static SPA shell there and stalled — no token, no shop row, no webhooks, no error anywhere. **The root cause is a routing fact, not a missing code path:** `outputDirectory: "public"` puts the built `index.html` at `/`, and Vercel rewrites lose to the static filesystem check, so `GET /` **never reaches Koa** (proof: `/` returns `x-vercel-cache: HIT` with no `x-powered-by: DelayGuard`, while `/auth` returns the full Koa header set). The `GET /` handler at `server.ts:199` is therefore dead code in production. The bootstrap is a `vercel.json` `redirects` entry instead, which is evaluated at the edge *before* the filesystem: `/` + a `shop` query + no `embedded`/`id_token` → `/auth` (307). Embedded loads (`embedded=1`) still get the SPA shell untouched. Deliberately **not** unit-tested — a test asserting `vercel.json` contains its own literal is exactly the tautology that cost us the flaky gate (R5); it is verified with curl against the deployment.
  **Verified after deploy:** `GET /?shop=…&hmac=abc&timestamp=1` → **307 `location: /auth?shop=…&hmac=abc&timestamp=1`** (Vercel forwards the original query string, so the rule needs no named captures), while `GET /?shop=…&embedded=1&host=…` still returns the 200 SPA shell. Those two curls are this rule's only test — re-run them after any change to `vercel.json` or the build output.
  - *Known deviation:* the edge redirect cannot verify the install request's `hmac` the way shopify.dev recommends. Accepted because the redirect target is our own `/auth`, which validates the shop-domain shape and then hands off to Shopify's authorize screen — an attacker can already reach `/auth` directly, so the hop grants nothing. Revisit if B3 moves HTML serving into Koa, which would make a server-side HMAC check free.

**Session 2026-07-30: the install itself, and the five further defects it exposed** (commits `26e4e34a`, `7e741bdf`, `0d3a1cbd`).

- **B4 — the install ran Shopify's *managed* flow, so our OAuth never executed. ✅ Fixed.** First install attempt looked flawless in the admin and wrote **nothing**: `shops` stayed empty. Vercel logs showed **zero `GET /auth/callback`** — only the two `/auth` hits from our own curl probes. Root cause was B5: `shopify.app.toml` (and its `use_legacy_install_flow = true`) had never been deployed to the app the store actually uses, so Shopify used managed install and skipped our callback entirely. Fixed by correcting the app identity and running `shopify app deploy` against the real app (released `delayguard-2-3`). **Verified:** the next install produced `GET /auth` → `GET /auth/callback` in the logs.
- **B5 — production was wired to a Shopify app that does not exist in the owning org. ✅ Fixed.** `shopify.app.toml` and Vercel's `SHOPIFY_API_KEY` declared `e9d96cad62c5e6db0a67e6752a23d0ea`. The **only** app in org `185109091` is `99187ae8a201f83e39407a1e79b725c1` (secret created 2025-10-24). One mismatch explained three symptoms: App Bridge session tokens were signed with the real app's secret and verified against the phantom app's (`invalid signature` on every `/api/*` call); the install used managed flow (B4); and the earlier `shopify app info` **403 "You are not a member of the requested organization"** — which had been read as a wrong-login problem — was actually the CLI resolving the phantom client_id to a *different org*. All three credentials repointed via CLI. **Verified:** deployed HTML `shopify-api-key` meta and the authorize URL both read `99187ae8…`, and the dashboard shows "Connected to delayguard-dev".
  - ⚠️ **`SHOPIFY_API_SECRET` was also wrong**, and cost two wasted cycles. Two diagnostic traps worth remembering: (1) a `read -rs SECRET` paste silently produced an **empty** variable, and signing with an empty secret yields a 401 that looks exactly like a wrong secret — an unverified input masquerading as evidence; (2) the real secret is **38 characters and not hex**, so the "32 hex" shape check being used to sanity-check it would have rejected the correct value. **The resolution: `shopify app env show` prints the app's real `SHOPIFY_API_KEY`/`SHOPIFY_API_SECRET` directly** once the CLI is logged into the owning org — no dashboard copying, no clipboard. Use it. **Verified by probe:** a webhook signed with the real secret returns `{"success":true}` / HTTP 200, while a deliberately wrong secret returns 401 (negative control — proving the endpoint verifies rather than accepts anything).
- **B6 — every authenticated request 500'd. ✅ Fixed.** The session middleware ran `SELECT id, access_token, scope, shop_name FROM shops`; there is no `shop_name` column. `merchant-api-service.getShop` was worse — four phantom columns. Proven live: a correctly-signed forged token returned `500 INTERNAL_ERROR` instead of the expected `SHOP_NOT_FOUND`, and the old SQL still errors against production Postgres while the corrected SQL runs clean.
- **B9 — `FULFILLMENTS_UPDATED` is not a Shopify enum value. ✅ Fixed.** Live registration returned *"Variable $topic of type WebhookSubscriptionTopic! was provided invalid value"* for that topic while `ORDERS_UPDATED`/`ORDERS_PAID` were accepted. Shopify uses the past tense for order topics but **not** fulfillment ones: the correct value is **`FULFILLMENTS_UPDATE`** (docs fetched 2026-07-30). The existing tests asserted our constant against a hardcoded copy of itself, so they passed with an invalid enum in place. **Verified against Shopify:** `FULFILLMENTS_UPDATE` is now accepted as valid and fails only on PCD, identically to the order topics.
- **B10 — `app_settings.custom_message` was read and written but never created. ✅ Fixed.** The first install failed every settings fetch with `column "custom_message" does not exist`. Added via the existing idempotent `DO` block. **Note migrations do NOT run at startup** (`setupDatabase()` deliberately skips them) — this needed `npm run migrate:vercel` against production, since a deploy alone would not have applied it. **Verified:** the column exists in production and `/api/settings` returns 200.
- **B11 — the GDPR handlers could never have worked. ✅ Fixed.** Three defects, all verified against the production schema: (a) `(SELECT id FROM shops WHERE shop_id = $N)` in **six** places — `shops` is keyed by `shop_domain` and has no `shop_id`, so `customers/redact` and `customers/data_request` threw (`handleShopRedact` already did this correctly, so it was an inconsistency, not a design choice); (b) `UPDATE delay_alerts SET customer_email, customer_name` — neither column exists, and `delay_alerts` holds no customer PII at all (identity lives on `orders`, which the preceding UPDATE anonymizes); (c) orders were filtered by `shopify_order_id = <customer id>`, so a data-export request returned the wrong rows — the column for that value is `shopify_customer_id`. **Verified:** all five corrected statements execute against production Postgres; both originals still fail there with "column does not exist".
- **B12 — three dashboard endpoints 500'd. ✅ Fixed.** With a valid session token, `/api/orders` and `/api/alerts` returned `column o.total_price does not exist` and `/api/analytics` returned `column reference "status" is ambiguous`. `orders` stores `total_amount`, and neither `financial_status` nor `fulfillment_status` exists on it. **Postgres reports only the first bad column**, so fixing them singly would have cost one deploy per column — the guard below was extended instead, to find them all at once. Contract preserved: `total_amount` aliased to `total_price`, `fulfillment_status` served from `status` (exactly what `order-upsert-service.ts:210` writes there), `financial_status` reported NULL since nothing persists it.

**The guard that now covers this whole bug class** — `src/tests/unit/database/sql-column-conformance.test.ts`. It derives every table's real columns from `runMigrations()` and validates SELECT lists, UPDATE targets, INSERT column lists and WHERE filters against them, resolving table aliases so qualified refs (`o.total_price`) are checked too. **It was too narrow twice before it was right**, which is itself the lesson: v1 covered only `shops`, so B10 slipped through minutes later; v2 skipped aliased queries, so all of B12 did. It attributes unqualified columns only where the target is unambiguous, and skips rather than guesses otherwise — a false alarm would train people to ignore it.

**Operational facts established this session (all verified, all previously unknown):**

- **Deploys are NOT git-triggered.** `git push origin main` changed nothing in production: the newest deployment was 1 day old and every deployment in the project's history was made by `augustok87` from the CLI. **Production ships with `npx vercel --prod --yes` from `delayguard-app/`.** Any plan step that says "push and it deploys" is wrong. (The Vercel project is named `delayguard`, not `delayguard-api`; `delayguard-api.vercel.app` is its production alias.)
- **The Vercel CLI is already authenticated on this machine** (`~/.vercel/auth.json`, account `augustok87`), so a session can pull env (`vercel env pull`), list/inspect deployments, read runtime logs, and deploy without any human step. `vercel link --yes --project delayguard` writes a `.env.local` holding an OIDC token — it is gitignored; delete it when done.
- **`shops` is empty (`SELECT count(*) FROM shops` → 0).** Direct proof that no merchant has ever installed, and the cleanest baseline we will ever have for the walk: any row that appears is from *this* install.
- **Production Postgres is reachable from a session** with the pulled `DATABASE_URL` (Neon, PostgreSQL 17.10). All 8 tables present (`shops`, `app_settings`, `orders`, `fulfillments`, `order_line_items`, `delay_alerts`, `tracking_events`, `customer_intelligence`), confirming D3.
- **⛔ Blocked here: no Shopify account on this machine can reach the app's organization.** `shopify app info` against the `client_id` in `shopify.app.toml` returns **403 "You are not a member of the requested organization"**, and `shopify organization list` shows only `Foundry - Forge` (129012989) plus two empty `SINGLETON_ORG_*` orgs — DelayGuard is in none of them. The browser hits the same wall (403 on `dev.shopify.com/dashboard/185109091`). `shopify app deploy` worked from this repo on 2026-07-28, so the owning account exists; the CLI/browser are simply logged into a different one. **`[HUMAN]` — log in as the account that owns DelayGuard, identify its org, and confirm (or create) a development store in that org.** The install cannot proceed until then: an unpublished app installs onto development stores in its own organization.

### ~~R7 — Protected Customer Data approval blocks ALL order webhooks~~ `[HUMAN]` — ✅ **GRANTED 2026-08-05** (history below; do not re-verify)

Proven live 2026-07-30. `webhookSubscriptionCreate` returns, verbatim, for **every** functional topic:

> *"This app is not approved to subscribe to webhook topics containing protected customer data. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details."*

Confirmed for `ORDERS_UPDATED`, `ORDERS_PAID` **and** `FULFILLMENTS_UPDATE` (the last re-tested directly against Shopify after B9's enum fix, to prove the enum was no longer the cause). Independently confirmed by querying the store: `webhookSubscriptions` → **`[]`**.

**Consequence: DelayGuard cannot receive a single order webhook, so the product is inert regardless of code quality.** No order data arrives, no delay is ever detected, no alert ever fires. Everything downstream of R2 step 2 — real end-to-end data flow, H8's screencast, any meaningful `/api/test-alert` demo — is gated on this.

This is §2's **H4**, which R3 below describes as merely having "approval latency". That framing badly understated it: it is not a nice-to-have that runs slowly, it is a **hard functional gate**. Appendix A.10 flagged that PCD Level 2 approval "is required and never requested" — that is now demonstrated, not predicted.

**Re-verified 2026-07-31** against the live store, using the stored access token straight from the production `shops` row rather than a reinstall: `webhookSubscriptions` still returns `[]`, and `webhookSubscriptionCreate(ORDERS_UPDATED)` still returns the same verbatim error. The token itself is healthy — the same GraphQL session answers queries normally and carries `{write_orders, write_fulfillments, read_products, read_customers}`. So the blocker is the PCD grant alone, not the scopes, not the token, not the enum.

**Correction to the earlier "approval latency" framing (shopify.dev, fetched 2026-07-31):** a dev-store install does **not** wait for review — *"If your app is for testing or installed only on a development store, you can access customer data in development after Step 5. You don't need to submit for review."* Completing the request form is therefore expected to unblock R2 step 2 the same day.

**⚠️ The request form is not reachable from the Dev Dashboard — verified 2026-07-31, and this is the live obstacle.** App `DelayGuard` (client `99187ae8a201f83e39407a1e79b725c1`, numeric id `290697445377`, org `185109091`) has a four-item sidebar — Monitoring / Logs / Versions / Settings — and the Settings page, read top to bottom, contains only Credentials, Contact information, Google Cloud Pub/Sub, Amazon EventBridge, Navigation bar, Storefront API, App automation token, App icon, Delete app. **No API access, no API access requests, no Distribution, no Protected customer data.** This matches a documented and still-open Shopify gap: [community.shopify.dev #16527](https://community.shopify.dev/t/bug-report-cannot-request-protected-customer-data-access-in-new-dev-dashboard/16527), where Shopify staff state *"Approval scopes including protected customer data continue to be requested in the partner dashboard"*, and report that dev-dashboard-created apps may have no Partner Dashboard record at all.

A second staff answer ([#35445](https://community.shopify.dev/t/enable-protected-customer-data-access-for-a-custom-app-created-in-the-dev-dashboard-no-ui-option-available/35445)) — *"Custom apps get Level 1 and Level 2 PCD automatically"* — **does not apply here** and should not be mistaken for a way out: it covers org-scoped custom apps installed via the dashboard's Install button. DelayGuard installs through its own OAuth grant and is headed for public distribution, and the live API refusal above is the proof.

A third ([#16141](https://community.shopify.dev/t/how-to-enable-protected-customer-data-access-in-dev-staging-environments-shopify-apps/16141)) gives the likely precondition: *"Once you distribute your app as a public app you can submit a request for protected customer data access."* That would explain the missing sidebar entry — distribution has never been set — but it is **unconfirmed for this app** and is recorded here as a hypothesis, not a finding.

**RESOLVED 2026-08-05 — the form was found, and filling it exposed a real compliance gap.** The Dev Dashboard's app **Overview → Distribution → "Manage Shopify App Store listing"** links out to the Partner Dashboard, where the app *does* have a record — under org **`4521112`**, not the Dev Dashboard's `185109091`. That ID mismatch is why every hand-built `partners.shopify.com` URL 404'd. Canonical path: `https://partners.shopify.com/4521112/apps/290697445377/customer_data`. **Never hand-build these URLs — navigate via that Distribution link.**

The request was completed (data use: Customer service + Store management + Other; fields: Name, Email, Phone, Address; 16/16 data-protection questions), and Shopify then **refused approval**:

> *"Sorry, your app isn't approved to access protected customer data at this time. To be approved, you need to confirm that you meet Shopify's requirements to access protected customer data in your data protection details."*

**The refusal was correct.** shopify.dev's **Level 2** requirements (fetched 2026-08-05) — which apply because the app requests Name/Address/Phone/Email — include verbatim: *"Keep an access log to protected customer data"*. DelayGuard had none. `services/audit-logger.ts` exists but is **dead code on this path**: `shopify-session.ts` only *mentions* it in a comment and never calls it, so no request-level access was recorded anywhere. Answering "Yes" would have been a false statement in a compliance filing.

**Fixed rather than mis-answered (v1.58):** `services/access-log.ts` + a `data_access_log` table, written from `requireAuth` in a `finally` so failed requests are recorded too. It stores shop, admin user id, path, method, status and timestamp — and **deliberately no customer values**; the query string is stripped before persisting, so the audit trail cannot become a second copy of the data it audits. Insert failures are swallowed and logged: a logging outage must degrade the audit trail, not 500 a merchant's dashboard. Table verified present on production Neon.

**✅ R7 CLOSED 2026-08-05.** The answer was flipped to Yes — truthfully, because the log now exists — and Shopify's refusal banner cleared. **Verified by consequence, not by the screen:** `webhookSubscriptionCreate(ORDERS_UPDATED)`, refused since 2026-07-30, returned `gid://shopify/WebhookSubscription/1521824628796`. All three topics then registered and were confirmed by querying `webhookSubscriptions`. That closes **R2 step 2 and R2 itself**.

**The access log was also verified end to end**, not just unit-tested: one embedded dashboard load produced 8 rows in `data_access_log` on production Neon — `/api/shop`, `/api/settings` ×2, `/api/orders` ×2, `/api/alerts` ×2, `/api/analytics`, all `GET`/`200`, all naming the shop, and **no customer values anywhere in the table**.

<details><summary>Superseded: the URL hunt that preceded the fix</summary>

**Action `[HUMAN]`, highest priority** — try, in order, and report which one loads:

1. `https://partners.shopify.com/185109091/apps/290697445377/customer_data` (the documented PCD path)
2. `https://partners.shopify.com/185109091/apps/290697445377/distribution`
3. `https://partners.shopify.com/185109091/apps/290697445377`

If the app has a Partner Dashboard record, request access there, declaring the fields the app actually uses — name, email, phone, shipping address (see [DATA_AVAILABILITY_ANALYSIS.md](DATA_AVAILABILITY_ANALYSIS.md)) — plus the data-protection commitments. If all three 404, the app has no Partner record and the next step is setting **public distribution** (a one-way, irreversible choice — but the one this launch needs anyway), then re-checking for the API access section.

*Outcome: all three 404'd because the org ID was wrong, and distribution turned out to be already set to public. See the resolution above.*

</details>

### ~~R6 — Embedded HTML document sends no per-shop `frame-ancestors`~~ `[AGENT]` — ✅ **RESOLVED 2026-07-31, verified live**

**Both gaps closed and proven against production**, not against the test suite:

| Probe (live, `delayguard-api.vercel.app`) | Result |
|---|---|
| `/?shop=delayguard-dev.myshopify.com&embedded=1` | `200`, `content-type: text/html`, **`x-powered-by: DelayGuard`** — Koa serves it now, not the CDN |
| its `frame-ancestors` | `https://delayguard-dev.myshopify.com https://admin.shopify.com` |
| wildcard present anywhere | **no** — `*.myshopify.com` is gone from the policy |
| `?shop=other-store.myshopify.com` | different directive — the *"must be different for every shop"* clause, demonstrated |
| `?shop=evil.com; frame-ancestors *` | `frame-ancestors 'none'`; the attacker string never reaches the header |
| document body | the real SPA, `shopify-api-key` = `99187ae8…`, both hashed bundles `200` |
| **regressions**: B2 install redirect / `/health` / legal pages / unsigned webhook | `307 → /auth` / `200` / `200` / `401` |

**How:** `HtmlWebpackPlugin` now emits `public/app.html` instead of `public/index.html`, so Vercel's static filesystem check no longer answers `/` and the existing `/(.*) → /api` rewrite carries it into Koa; `src/routes/app-document.ts` serves that file (read once, cached, with a loud non-blank fallback if the bundle is ever missing); `src/middleware/frame-ancestors.ts` derives the directive from `ctx.query.shop`, validated against `^[a-z0-9][a-z0-9-]*\.myshopify\.com$` so a value carrying a space, `;`, CR or LF can never be interpolated into a header; `security-headers.ts` appends it to every response. `vercel.json` `includeFiles` became `{legal/**,public/app.html}` so the function actually ships the document. The API-index JSON that used to answer `/` was dropped — `/docs` and `/api/swagger.json` already cover it.

**Two tests were changed rather than added**, because they encoded the defect: both `security-headers.test.ts` and `server-app.test.ts` asserted the policy *contained* `https://*.myshopify.com`. New coverage: `tests/unit/middleware/frame-ancestors.test.ts` (8 tests, incl. header-injection rejection) plus real-app assertions in `server-app.test.ts`.

**Note for whoever touches the build:** `webpack.optimized.config.js` still emits `index.html`. It is opt-in and unused by `npm run build`, but promoting it to the production build would silently hand `/` back to the CDN and drop the CSP. A comment marks it.

<details><summary>Original finding (2026-07-29 b) — retained as the record</summary>

Found 2026-07-29 (b) while verifying the embedded-load path. Shopify's iframe-protection requirement (shopify.dev, fetched this session) is that the CSP **must name the specific shop**: the required header is `Content-Security-Policy: frame-ancestors https://<shop>.myshopify.com https://admin.shopify.com;`, it must be present on *"any routes that render HTML content"*, and the directive *"must be different for every shop"* — so a wildcard does **not** satisfy it. Two gaps, both verified live:

1. **The app's HTML document sends no CSP at all.** `GET /` is served by Vercel's static CDN (see B2), so `security-headers.ts` never runs on the one response that actually gets framed. Confirmed: the full header dump for `/?shop=…&embedded=1` contains no `content-security-policy`.
2. **Where the middleware *does* run, the value is a wildcard.** `security-headers.ts:22` sets `frame-ancestors https://admin.shopify.com https://*.myshopify.com` — per the quote above, not compliant.

**Not a functional blocker:** absent CSP means framing is permitted by default, so the embedded app still loads today. It is a **review** blocker, and it cannot be fixed with a static `vercel.json` `headers` entry because the value is per-shop by definition. The fix is to serve the app document from Koa (emit the built HTML under a non-root filename so the static filesystem check stops intercepting `/`, add it to the function's `includeFiles`, and render it from a route that reads `shop` from the query). That same change would also let B2's bootstrap do the recommended HMAC check server-side. Sequenced *after* the live install walk, so it cannot destabilize the one deployment that currently works.

</details>

**Still open, deliberately not done here:** B2's install bootstrap does not yet verify the OAuth query HMAC server-side. Koa now owns `/`, so the hook exists — but the redirect happens at Vercel's edge before Koa runs, so adding it is its own change, not a free rider on this one.

### R3 — Human dashboard gate: H3, H7 `[HUMAN]` — **H4 closed 2026-08-05**

**H3 (App Pricing plans) blocks all revenue** — `/api/plan` and every SMS/paid gate fail closed to `free` until the plans exist in the Partner Dashboard, so the app cannot charge anyone. **H7 (ShipStation Advanced plan)** gates tracking third-party parcels, the app's core data input. ~~H4 (Protected Customer Data)~~ was **granted 2026-08-05** — see R7.

### R4 — Listing submission: H8 → H-4 → H9 `[HUMAN]`

**H-4 (AI self-review) was performed 2026-08-26 by an agent session.** Result: **the listing is compliant with the rule-based requirements, and the remaining risk is entirely factual accuracy.**

| Requirement | Finding |
|---|---|
| 4.3.3 — no statistics, verifiable or not | ✅ none present |
| 4.3.3 — no "first / best / only" superlatives | ✅ none present |
| 4.3.6 / 4.3.7 — no testimonials in images or text | ✅ none present (the `>` blocks are subtitles and editorial notes) |
| 4.4.1 — no statistics in the app-card subtitle | ✅ clean |
| Pricing consistency | ✅ Free $0 / Pro $7 / Enterprise $25 with 14-day trials, matching `billing-service.ts` and the asset README |
| **Capability accuracy** | ❌ **two blockers — see below** |

**The two accuracy blockers, both already tracked:**

1. **§6 R24 — the listing's headline capability needs a key, no longer a purchase.** It sells *"real-time monitoring across major carriers"* and *"monitors carrier tracking data"*. The ShipEngine plan wall is gone: tracking now runs on **EasyPost** (v1.75, decision **D4**). **Submit only after a real `EASYPOST_API_KEY` is set in Vercel and one live tracker returns a mapped status** — the wire shape has been verified against the docs and the live 401/403 behaviour, but not yet against a real key.
2. **§6 R8 — the support and sales addresses are unrouted.** The listing must not name a mailbox that discards mail. Fill the contact fields only after a test message has actually been received.

Everything else in the listing is submission-ready.



Screencast, AI self-review, submit. Gated on R2 (needs a working app to film) and R3.

### R5 — Known non-blockers (carry forward, do not let them stall launch)

- **C5 expiring offline tokens** — deadline 2027-01-01, spec already written above.
- **⚠️ Order-dependent flakiness is NOT gone — re-opened 2026-07-30.** The resolution below was overstated. Deleting the stub-fixture suites removed *those* symptoms, but not the mechanism: `jest.config.ts` still sets `maxWorkers: 1`, so all suites share one process and Jest orders files by cached prior durations, which makes cross-suite state leakage nondeterministic. **New instance, observed this session:** a pre-commit gate run failed `tests/unit/routes/legal.test.ts` → *"GET /legal/terms-of-service returns 200"* with **404**, while the sibling privacy-policy assertions passed. It passes 15/15 in isolation, and the gate's exact command (`npm test -- --coverage --watchAll=false --passWithNoTests`) then passed twice consecutively at 2,399/2,424 — so the failure is order-dependent, not a regression.
  **Candidate mechanism for whoever fixes it:** `resolveLegalDir()` ([legal.ts:155](delayguard-app/src/routes/legal.ts#L155)) consults `process.env.LEGAL_DOCS_DIR` first and, when that override is set, returns `null` rather than falling through to the real directory. `legal.test.ts` deliberately sets that variable to `/nonexistent/legal-docs-dir` in its final describe block and restores it in `afterEach` — but `process.env` is process-global, so any ordering or failure that leaves it set poisons other suites (and the module-level `pageCache` interacts with `jest.resetModules()`). Fixing the test to pin the override explicitly would make it deterministic, at the cost of no longer exercising the default resolution path that production actually uses — worth a deliberate decision, not a reflex.
  **Do not claim the gate is trustworthy again without three consecutive clean runs, and say which command was run.**

  **Third instance, 2026-08-05 — the first one caught in the act, and the most informative yet.** The pre-commit hook failed; the *identical* command (`npm test -- --coverage --watchAll=false --passWithNoTests`) then passed, failed, and passed on three consecutive manual runs. The failing run took down **six tests across four unrelated suites at once**:

  | Failing test | Area |
  |---|---|
  | `does not consult the plan for an email-only request` | notification / billing plan-gate |
  | `should process valid data request webhook` | GDPR |
  | `should process valid shop redaction webhook` | GDPR |
  | `should handle service errors gracefully` | GDPR |
  | `should block requests exceeding limit` | rate limiting |
  | `should handle Redis errors gracefully` | rate limiting |

  **Why this matters more than the earlier sightings:** a single flaky test suggests one bad suite; *six failures across four unrelated areas in one run, all green in the next*, is shared-process state leakage — consistent with `maxWorkers: 1` plus duration-ordered scheduling. None of these paths goes through `requireAuth`, so v1.58's access-log insert is not implicated, but that was **not** proven, only observed.

  **This is now a launch-quality risk, not a curiosity.** The gate is the only thing standing between a regression and production, and it currently fails roughly one run in three for reasons unrelated to the diff. Whoever picks this up: start by making the failing suites' shared state explicit (`process.env` overrides, the module-level caches, the `pg`/`ioredis` manual mocks in `__mocks__/`), or set `maxWorkers` above 1 and see whether isolation alone fixes it — a config change would beat auditing 128 suites.

  **⚠️ RE-DIAGNOSED 2026-08-25 — the stated mechanism above is wrong, and the flake was reproduced on demand for the first time.**

  R5 has always been described as order-dependent cross-suite state leakage caused by `maxWorkers: 1`. Evidence gathered this session says the dominant mechanism is different: **wall-clock threshold assertions failing under machine load.**

  | Experiment | Result |
  |---|---|
  | Full suite, fresh session | clean — 2,445 tests |
  | Full suite while **another session ran its own suite** | `monitoring-service.test.ts:67` failed |
  | `monitoring-service` alone | passes, 4 ms |
  | Same suite under **24 CPU spinners on 12 cores**, no coverage | still passes — *first hypothesis falsified* |
  | **Two full `--coverage` suites run concurrently** | one failed `input-sanitization.test.ts:405` — `expect(end - start).toBeLessThan(120)` — **a different test, again wall-clock** |

  So the failing test differs every time because whichever timing-bound assertion is executing when contention peaks is the one that loses. Known members of the class, tightest first: `App.test.tsx:70` (<100 ms), `input-sanitization.test.ts:405` (<120 ms), four in `tests/performance/load.test.ts`, plus two thresholds *inside* `monitoring-service` itself (`checkRedis` <100 ms, `checkDatabase` <1000 ms) which the suite asserts indirectly via `every(status === 'healthy')`.

  **`checkExternalAPIs` also makes real network calls** to `api.shipengine.com`, `api.sendgrid.com` and `api.twilio.com`. HEAD-probed live: **405, 405, 401** — all non-2xx, so `response.ok` is false and those checks should be `degraded` *always*. They pass only because `tests/setup/jest.setup.ts` installs a global `fetch` mock. A unit test that would hit the public internet if one setup line were removed is a latent outage-triggered failure, whatever else is true.

  **Practical rule established this session: never run `npm test` in two sessions at once.** Doing so reliably manufactures this flake — it is what corrupted one of this session's runs and very likely some historical sightings.

  **Not fully explained.** The 2026-08-05 instance took down GDPR and rate-limiting tests that are not obviously timing-bound, so the `LEGAL_DOCS_DIR` `process.env` leak may be a genuine second mechanism. **R5 stays open.** Three clean fresh-session runs are on record for 2026-08-25 (2,445, 2,428/2,453 and 2,430/2,455), but an instrumented run intended to capture the degraded check passed without firing — the flake did not reproduce on demand in the same session it had just failed in.

  **Also noted:** `monitoring-service.test.ts` exists **twice** — `tests/unit/monitoring-service.test.ts` and `tests/unit/services/monitoring-service.test.ts` — duplicated coverage that doubles the exposure to the above.

- ~~**Flaky test suites are destabilizing the pre-commit gate**~~ — ⚠️ **PARTIALLY resolved 2026-07-29 (see above — re-opened).** The five fixture-only suites and the `tests/setup/test-server.ts` stub were deleted; three consecutive full runs with coverage then produced **identical clean results: 2,385 passing / 2,410 total / 25 skipped / 0 failures / 120 suites**. The gate is trustworthy again. Diagnosis retained below as the record.

  Characterized 2026-07-29 across three consecutive full-suite runs, each of which failed a *different* test while passing 2,408–2,409 of 2,435:

  | Run | Failed |
  |---|---|
  | `npm test` | `tests/unit/services/monitoring-service.test.ts:67` |
  | `npm test --coverage` (commit gate) | `tests/integration/api.test.ts` — "should return alerts" (`404`, not the expected `200`) |
  | `npm test --coverage` (repeat) | `tests/integration/api.test.ts` — "CORS headers"; `tests/e2e/delay-detection-flow.test.ts` — "multiple concurrent delay detection requests" |

  Every one passes in isolation (`tests/integration/api.test.ts` → 10/10 on three consecutive isolated runs; `monitoring-service.test.ts` → 12/12). **Mechanism:** `jest.config.ts` sets `maxWorkers: 1`, so all 127 suites share one process, and Jest orders files by *cached prior durations* — so the execution order shifts between runs, changing which suite neighbours which. That makes leaked cross-suite state nondeterministic rather than reproducible.

  **The fix was deletion, not debugging.** Every flaking assertion lived in a suite importing `tests/setup/test-server.ts` — a hardcoded Koa **stub fixture** returning canned JSON, sharing no code with the real application. The five fixture-only consumers were deleted (`integration/api`, `integration/workflow`, `integration/analytics-integration`, `e2e/delay-detection-flow`, `e2e/analytics-dashboard-flow` — 25 tests), along with the fixture itself. They asserted only that the stub returned its own constants; several exercised a `/api/test-delay` endpoint **that does not exist in the real app**.

  `tests/integration/server-app.test.ts` was **kept** — despite matching a grep for the fixture name, it only mentions it in a comment. It boots the *actual* Koa app from `src/server.ts` and its 15 tests mirror the Appendix B probe matrix (webhook HMAC-not-CSRF, CSP framing, session-token guard, canonical single-prefix routes, honest `/health`, legal pages, cron auth). That is the real coverage the deleted suites only appeared to provide.
- **Non-atomic notification dedupe** — the `email_sent`/`sms_sent` check-then-send race and the missing `UNIQUE(order_id, delay_reason)` constraint behind `ON CONFLICT DO NOTHING`, both documented in `CLAUDE.md` and CHANGELOG v1.53. Low real-world risk at zero install volume; fix before meaningful traffic.
- **Husky pre-commit** was rewired in v1.53 but `node_modules` was empty on a fresh clone this session — run `npm install` from `delayguard-app/` to re-establish the hook.

---

## 7. Next-session kickoff (keep this current — rewrite it at the end of every session)

*Rewritten 2026-08-26 (end of session). **Every agent-side blocker on the critical path is closed, deployed and verified against production or live CI.** Nine closed today. What stands between here and submission is entirely Partner-Dashboard, DNS and browser work. The goal is still **submission** — see the honest read below on what "launch today" can and cannot mean.*

**State at handoff:**

| | Status |
|---|---|
| **R17 — one send marked every alert delivered** | ✅ **FIXED + PROVEN IN PRODUCTION (v1.67).** Three alerts → three sends → three `notification_sent_at` ~20 ms apart; alert 4 untouched. Guard is a real SQL engine (pg-mem) running the production `runMigrations()`; all five assertions failed against the broken code first |
| **R19 — SMS plan gate resolved an undefined shop** | ✅ **FIXED (v1.67).** The processor never selected `s.shop_domain`, so `getCurrentPlan` looked up a nonexistent shop and failed closed to `free`. ⚠️ **This did NOT make SMS work — see R20** |
| **R18 — three defects in the delivered email** | ⚠️ **2 of 3 FIXED + DEPLOYED (v1.68).** `#DG1001` and the empty delivery-date label are data-side and live. **Defect 3 (no CTA) is template-side and NOT live** — needs a Full-Access SendGrid key |
| **R20 — the listing sold SMS the app cannot send** | ✅ **LISTING FIXED (v1.70).** Twilio is a **trial account owning no phone numbers**; the configured `TWILIO_PHONE_NUMBER` is not on the account and **0 messages have ever been sent**, so every send would fail with Twilio 21606. Copy aligned to decision D3 (email-only); SMS stays gated in code |
| **R11 — env validator gap** | ✅ **FIXED + DEPLOYED (v1.69).** Repaid immediately: `/health` `200` on the new deployment *proves* both SendGrid vars are set in production — through values no session can read |
| **R21 — remote CI red on every push for days** | ✅ **FIXED (v1.71).** A test file was overwriting CI's `DATABASE_URL` (that suite passed against a database that does not exist); three timing tests graded the runner. **CI is green on all three workflows**, verified on the pushed head |
| **R5 — test flake** | ✅ **CLOSED (v1.71)** — its named offenders no longer consult the wall clock |
| **R22 — health check divided heap by system memory** | ✅ **FIXED + DEPLOYED (v1.72).** CI reported `memoryPercentage: 124`; production now reports `Application: healthy` |
| **R23 — `/monitoring/health` 503 forever** | ✅ **FIXED + DEPLOYED (v1.73).** Vendor checks delegate to the authenticated `ping()`s. **Live: HTTP 200, all six checks healthy** |
| **R8 — support mailbox** | ⛔ `[HUMAN]`, **submission-blocking, ~10 min.** Still no MX. ⚠️ **This plan's own SPF warning was wrong and is corrected in §6** — the zone has *no* SPF, so Cloudflare will **add** one rather than rewrite one; include `sendgrid.net` in it |
| **H3 — App Pricing plans** | ⛔ `[HUMAN]`, **blocks all revenue.** Free $0 / Pro $7 / Enterprise $25, 14-day trial on the paid tiers. **Pricing is already reconciled** across code, listing and assets — there is no decision left, only the dashboard work |
| **Real webhook ingest** | ⛔ **still never observed**, six weeks on. `orders` holds exactly **1** row, the synthetic `9900112233`. One real order closes it — and gives R18 its first test against an order that *has* tracking |
| **R24 / H7 — carrier tracking** | 🟡 **Code DONE (v1.75), awaiting a key.** Resolved by migrating to **EasyPost** rather than buying ShipStation Advanced at $75/mo against a $7/mo product (decision **D4**). Net capability *gain*: EasyPost exposes `delayed` / `weather_delay` / `delivery_exception`, which ShipEngine never did. Remaining human step is a free EasyPost signup + Test key. **Do not deploy until `EASYPOST_API_KEY` is set in Vercel** |
| **H8 → H-4 → H9** | ⛔ `[HUMAN]`. Screencast, AI self-review, submit |
| **R9 — agent can't authenticate** | ⛔ `[HUMAN]`, unchanged. `shopify app env show` 403s; every `/api/*` check is still a browser action |
| R1 / R2 / R4-H4 / R6 / R7 | ✅ closed, evidence in §6 |

**The honest read on "launch today."** *Submitting* today is achievable — everything left is a few hours of dashboard and DNS work. *Being live on the App Store* today is not: Shopify schedules its own review and it historically takes days to weeks. Plan for **submitted today, approved later**, and treat anything that would cause a rejection as more expensive than it looks.

**Critical path — the agent column only starts when a human step lands:**

| # | `[HUMAN]` — in this order | `[AGENT]` — the verification I owe you afterwards |
|---|---|---|
| 1 | **R8** — Cloudflare Email Routing, then edit the SPF TXT to `v=spf1 include:_spf.mx.cloudflare.net include:sendgrid.net ~all`, then **receive** a test message | `dig` the MX and SPF, and re-confirm the SendGrid `_domainkey` chains still resolve — that is the trap |
| 2 | **H3** — App Pricing plans (Free $0 / Pro $7 / Enterprise $25, 14-day trial on paid) | Confirm `getCurrentPlan` returns a paid tier against the live subscription |
| 3 | **Place one real order** on `delayguard-dev.myshopify.com` and fulfil it with tracking | Prove the webhook row landed in production Postgres, then **read the resulting email** — the first with a real tracking CTA |
| 4 | Mint a temporary **Full-Access SendGrid key** (60 seconds) | `npm run sendgrid:create-template`, set the new `d-…` id, redeploy, close **R18 defect 3** |
| 5 | **H7** — confirm ShipStation Advanced is active | — |
| 6 | **H8** screencast → **H-4** AI self-review → **H9** submit | Rewrite §7 |
| — | *(post-launch)* Twilio: upgrade off trial, buy an SMS-capable number, register **A2P 10DLC** | Only after one real SMS is delivered: restore the SMS copy and delete `billing-plan-claims.test.ts` |

**The two things easiest to get wrong next session.**

1. **`src/scripts/create-sendgrid-template.ts` is AHEAD of the template deployed in SendGrid.** It has the `{{else}}` no-tracking branch; `d-5755ad471bd64f15bf2bd61f8b848ad0` does not. The repo is not the source of truth for what merchants receive until that push happens — and **the script CREATES a new template rather than versioning the existing one**, so the id changes and `SENDGRID_DELAY_TEMPLATE_ID` must be updated with it.
2. **SMS is not "one paid plan away from working."** R19 fixed the plan gate, but R20 proved the Twilio account cannot send at all. Do not restore the SMS copy on the strength of H3 alone.

**Paste this as the opening prompt:**

> You are executing DelayGuard's launch plan, and the goal is **App Store submission**. Read `LAUNCH_PLAN.md` **§7** then **§6** — the app is live at `https://delayguard-api.vercel.app`, installed on `delayguard-dev.myshopify.com`, and as of 2026-08-26 the notification pipeline is correct per alert and proven so in production, CI is green, and `/monitoring/health` returns 200. §§1–4 are history. **Appendix A is ground truth: do not re-audit it.** Do not re-verify Appendix B, and do not re-verify R1/R2/R5/R6/R7/R17/R19/R21/R22/R23. Do not start C5.
>
> **Division of labor: I drive the browser, the dashboard and any purchase; you drive the diagnosis and the verification.** Tell me exactly what to click, then verify each step yourself against `dig`, Vercel logs, production Postgres and the vendor APIs rather than taking my word for it. **Treat a silent success as suspicious**, and **treat a deploy as unverified until you have probed the running thing.**
>
> **Everything on the critical path is mine, so tell me the full list early** so it runs in parallel: R8 (Cloudflare Email Routing — read §6's *corrected* SPF guidance first), H3 (App Pricing plans, blocks all revenue), one real test order on the dev store, a temporary Full-Access SendGrid key, H7, then H8 → H-4 → H9.
>
> **Your side, each gated on one of mine:** (a) after R8, `dig` the MX/SPF and confirm SendGrid's DKIM chains still resolve; (b) after H3, confirm `getCurrentPlan` returns a paid tier live; (c) after the test order, prove the webhook row reached Postgres and **read the resulting email**; (d) with the Full-Access key, push the template and close R18 defect 3. **`create-sendgrid-template.ts` is currently ahead of the deployed template, and it creates a NEW template rather than versioning the existing one.**
>
> **Follow `CLAUDE.md` and the matching `.claude/rules/*.md`. TDD is not optional:** write the test, run it against the *broken* code, watch it fail, then fix. A test that passes in both states gets deleted, or kept only with a comment saying which half of the contract it pins. Local CI gate before any commit. **Never `--no-verify`.** ⚠️ **Never run `npm test` in two sessions at once**, and don't run a polling loop while the gate runs — that alone stalled a commit for 12 minutes.
>
> **Operational facts (do not rediscover):** deploys are **not** git-triggered — `npx vercel --prod --yes` from `delayguard-app/`. Migrations: `npm run migrate:vercel`. **`vercel env pull` masks every `Sensitive` value** — verify env through the running deployment. `shopify app env show` 403s (§6 R9), so any `/api/*` check is a browser action. `DATABASE_URL` *is* readable — production Postgres is your best evidence source. The production **SendGrid key is Restricted-Access `mail.send` only**: `/v3/templates` and `/v3/whitelabel/domains` 403, and `/v3/user/profile` 403 while `/v3/scopes` 200. **Twilio is a trial account owning no phone numbers.** Sending domain is **`delayguardapp.com`**; `delayguard.app` is **not ours**.
>
> **Two test-infrastructure facts that hid real bugs:** `__mocks__/pg.js` answers **every `UPDATE` with `rowCount: 1`**, so no test using it can tell a one-row write from a four-row one — use `src/tests/helpers/pg-mem-schema.ts` (runs the production `runMigrations()` against a real in-memory SQL engine) for any assertion about what a statement *did*. And there are **two overlapping `monitoring-service` test files**; they drifted apart three times in one session. Collapsing them is open post-launch debt.
>
> **Document as you go** — `LAUNCH_PLAN.md` (§6 status, Session Log, and rewrite §7), `PROJECT_OVERVIEW.md`, `CHANGELOG.md` — in the same commits as the work. New blockers go in §6 with the evidence that proves them, not the reasoning that suggests them.
>
> **Carried lesson, and it earned its keep four more times today: when you form a belief about the world outside the repo, write down what would falsify it and go observe that.** "Consistent with" is not "proven." An authorization error names a relationship, not a state. A check that has never failed is not a check — **and neither is one that always fails.** A single passing run is not evidence of determinism. **And a test that fails without saying why gets debugged by guessing:** two blind CI round-trips bought nothing, while one self-describing assertion found a production bug on the next run.

**Why this order.** The agent column is empty until a human step lands, because the merchant-harming and reviewer-visible defects are all closed: notifications are per-alert and proven in production, the listing no longer sells a channel that cannot send, CI is a real gate again, and the monitoring endpoint tells the truth. What is left is DNS, a pricing plan, a real purchase, a vendor key, and Shopify's own review queue.

**The lesson this session added, in one line.** Three of today's nine findings came from **verifying rather than assuming** — R19 from running the real SELECT against the real schema, R22 from making a test say *why* it failed, R23 from probing the live endpoint after a deploy that "succeeded". The 2026-08-25 lesson was *read the artifact the system produces*; today's is its sibling: **probe the running thing, and make your checks capable of naming what is wrong.**

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
| 2026-07-29 | Truth pass + blocker triage | Doc reconciliation | Plan was stale by 7 commits (it still described an undeployed app). Re-probed production — **entire Appendix B matrix green**, `/health` healthy (Postgres 3ms, Redis 2ms), GH-Actions cron sweeps succeeding every ~10 min. Reconciled §1, §2, C4, D3, E1, Appendix B; added **§6 Remaining blockers** as the new entry point. **E1 un-ticked and re-opened:** verified live that the SendGrid account returns `Maximum credits exceeded` on a sandbox send *and* that the production key is Mail-Send-only (`GET /v3/scopes`), so `/v3/templates` 403s and the template cannot be created — plus a **third** SendGrid problem confirmed by DNS: `noreply@delayguard.app` has no SendGrid domain-auth records and **no MX at all**, so it cannot be a verified sender and single-sender verification is impossible. **Domain ownership investigated** (Google Registry RDAP): `delayguard.app` registered 2026-02-06, expires 2027-02-06, registrar Squarespace Domains II LLC; registrant privacy-redacted so ownership is unproven from outside, but only the Squarespace *website* expired — the DNS zone is live and editable, so domain-authenticating it needs no code change. **Flaky pre-commit gate diagnosed and fixed:** three runs → three different failures, all in suites importing the `tests/setup/test-server.ts` stub fixture; deleted the fixture + its five tautological consumers (25 tests, several hitting a `/api/test-delay` endpoint that doesn't exist in the real app), kept `server-app.test.ts` (boots the real Koa app). Suite now **stable at 2,385 passing / 0 failing / 120 suites across three consecutive identical runs**. Commits `998a0d43`, `804883c9`, `5f51c4b9`, `b67d1e7d`. |
| 2026-07-29 (b) | R2 live-install session | Install path | **Two install-blocking defects found and fixed before the first browser click**, by reading the live install path rather than trusting it — neither was visible to the 2,390-test suite or the Appendix B matrix, because neither ever walked the merchant's entry point. **B1:** production's authorize URL carried `scope=…,read_customers%0A` — a trailing newline in Vercel's `SHOPIFY_SCOPES` that `app-config.ts` never trimmed, so Shopify would reject the grant or silently drop `read_customers`; `parseScopes()` now trims/filters/falls back (5 tests). **B2:** Shopify's authorization-code install hits the **App URL** first and expects a redirect into OAuth, but `GET /` is answered by Vercel's static CDN (`x-vercel-cache: HIT`, no `x-powered-by`) because rewrites lose to the filesystem check — so Koa never saw the install request and the flow dead-ended silently; fixed with an edge `redirects` rule (`/` + `shop`, no `embedded`/`id_token` → `/auth`). Also **found R6** (new, submission-blocking): the framed HTML document sends no CSP at all, and where `security-headers.ts` does run it uses a wildcard `frame-ancestors`, which shopify.dev explicitly rejects (*"must be different for every shop"*). Commit `560b86b0`; gate 2,390 passing / 2,415 / 0 failing / 121 suites. |
| 2026-07-30 | R2 live install — **the app was installed on a real store for the first time** | Install path + API + GDPR | **3 of R2's 4 steps proven; 7 defects found and fixed.** The first install looked flawless and wrote **nothing** — zero `/auth/callback` in the logs, `shops` empty. Cause (**B5**): production was wired to Shopify app `e9d96cad…`, which **does not exist in the owning org**; the real app is `99187ae8…`. That one mismatch also explained the `invalid signature` on every `/api/*` call, the managed-install bypass (**B4**), and the earlier `shopify app info` 403 that had been misread as a wrong login. Repointed all three credentials + `shopify app deploy` → the next install ran our OAuth end to end (**step 1 proven**: `shops` + `app_settings` rows). Then, in order: **B6** phantom `shops.shop_name` (every authenticated request 500'd), **B9** `FULFILLMENTS_UPDATED` is not a Shopify enum (`FULFILLMENTS_UPDATE` is), **B10** `app_settings.custom_message` never created (needed a manual `migrate:vercel` — migrations don't run at startup), **B11** the GDPR handlers could never have worked (6× `shops.shop_id`, a PII UPDATE on columns `delay_alerts` doesn't have, and orders filtered by customer id against the *order* id column), **B12** three dashboard endpoints 500'ing on `o.total_price` and an ambiguous `status`. **Step 3 proven** (signed `orders/updated` → every column correct in Postgres) and **step 4 proven** (all five dashboard endpoints 200 with real data; admin shows "Connected"). **Step 2 is blocked by new blocker R7:** Shopify refuses *every* order webhook subscription pending **Protected Customer Data approval** — verified against the live API and by `webhookSubscriptions` returning `[]`. Commits `26e4e34a`, `7e741bdf`, `0d3a1cbd`. Gate 2,399 passing / 2,424 / 0 failing / 124 suites. |
| 2026-07-31 | R6 closed + R7 root-caused | Embedded CSP + PCD | **R6 resolved and verified live; R7 narrowed from "waiting on approval" to "the form is unreachable".** R6: the framed document now comes from Koa, not Vercel's CDN — `HtmlWebpackPlugin` emits `public/app.html` so the static filesystem check stops answering `/`, `routes/app-document.ts` serves it, and `middleware/frame-ancestors.ts` derives a validated per-shop directive that `security-headers.ts` appends to every response. Proven with 7 live probes + 4 regression probes: `frame-ancestors https://delayguard-dev.myshopify.com https://admin.shopify.com`, no wildcard, a different value for a different shop, `'none'` for an injected `evil.com; frame-ancestors *`, real SPA + both bundles `200`, and B2's install redirect / `/health` / legal / unsigned-webhook all unchanged. Two existing tests were **changed, not added** — they asserted the wildcard, i.e. they encoded the defect. R7: re-verified with the stored production token that `webhookSubscriptions` is still `[]` and `ORDERS_UPDATED` still refused, while the same session answers queries normally — isolating the PCD grant as the sole cause. Then **corrected the plan's own framing twice**: shopify.dev says dev-store PCD needs *no review* (so this was never an approval-latency problem), and the Dev Dashboard demonstrably has no API-access, distribution, or PCD UI — a documented, still-open Shopify gap. Recorded the three Partner Dashboard URLs to try, plus app numeric id `290697445377`. Also settled a stale-screenshot scare by reading `client_id` out of production's live `/auth` redirect rather than the dashboard. Gate: 2,409 passing / 2,434 / 25 skipped / 0 failing / 125 suites, lint 0 errors, type-check + build clean. |
| 2026-08-05 | R7 unblocked to its last human step | PCD + access log | **The PCD form was found, filed, and refused — correctly.** It lives in the *Partner* Dashboard under org **`4521112`** (not the Dev Dashboard's `185109091`, which is why every hand-built URL 404'd); reach it via the app's **Overview → Distribution → "Manage Shopify App Store listing"** link. Distribution was already public, so that hypothesis was wrong. Request filed (Customer service + Store management + Other; Name/Email/Phone/Address; 16/16 data-protection questions) and Shopify refused: *"you need to confirm that you meet Shopify's requirements"*. Root cause found by reading the **Level 2** requirement list — *"Keep an access log to protected customer data"* — and then the codebase: `audit-logger.ts` existed but was **dead code**, never called from `shopify-session.ts`. So the honest answer was No, and answering Yes would have been a false compliance statement. **Built the capability instead (v1.58):** `services/access-log.ts` + `data_access_log` table + wiring in `requireAuth`'s `finally` (failed requests recorded too), storing shop/user/path/method/status and **no customer values** — the query string is stripped so the audit trail can't become a second PII store, and insert failures are swallowed so logging can never 500 a dashboard. 6 tests; one existing exact-query-count assertion updated from 4 to 5. Deployed + `migrate:vercel` run against prod Neon; table verified with `\d`. Gate: 2,415 passing / 2,440 / 25 skipped / 0 failing / 126 suites, lint 0 errors, type-check + build clean. ⚠️ One earlier run in this session failed once then passed three times consecutively — R5's flake, not this change. **Remaining human step:** flip "Do you log access to personal data?" to **Yes** and re-check the banner. |
| 2026-08-05 (b) | **R7 granted → R2 closed** | PCD + webhooks | **The product stopped being inert.** Flipping "Do you log access to personal data?" to Yes — truthfully, once v1.58's access log existed — cleared Shopify's refusal banner and granted PCD. Verified **by consequence, not by the screen**: `webhookSubscriptionCreate(ORDERS_UPDATED)`, refused every time since 2026-07-30, returned `gid://…/1521824628796`. All three functional topics were then registered over the Admin API with the token already stored in `shops` — **no reinstall, no browser** — and confirmed by asking Shopify rather than trusting the create calls: `webhookSubscriptions` → 3 (`ORDERS_UPDATED`, `FULFILLMENTS_UPDATE`, `ORDERS_PAID`, each pointing at its canonical endpoint). **R2 step 2, R2 as a whole, and R7 are closed.** The access log was proven end to end in the same pass: one dashboard load wrote 8 rows to `data_access_log` on production Neon, all `GET`/`200`, with no customer values in the table. **Top blocker is now R1 (SendGrid)** — the app can detect a delay and still cannot tell anyone. **Caveat carried forward:** R2 step 3 was only ever proven with a *self-signed* payload, because no subscription existed until today; a real Shopify-delivered webhook has still never been observed landing in Postgres, and that is the next agent-side proof to get. |
| 2026-08-17 | R1 sender identity closed | SendGrid | **The From address was a domain we never owned, and the proof was a date.** `noreply@delayguard.app` was hardcoded in the project's **first commit (2025-09-25)**; the domain was not registered until **2026-02-06**, four months later — plus it is absent from the owner's registrar account, has no purchase receipt, and serves "Website Expired". The 2026-07-29 claim that it was "almost certainly ours" is **retracted**; a name match and a plausible registrar were treated as evidence when the one falsifying check (does the registration predate the code?) was never run. **Third instance of the same failure mode** after B5 and the stale client-ID screenshot. **v1.59 (`7fb23cf7`)** moved the sender to `SENDGRID_FROM_EMAIL` — trimmed, throwing in production when unset, placeholder on RFC-2606 `.example` so it can never collide with a real domain. The SendGrid account was re-confirmed ours by key-ID fingerprint (`JZWkSywLQJqMdYsSIs5zNg`, scopes exactly `mail.send`+batch+scheduled — `/v3/templates` 403s as designed); `augustok87@gmail.com` was **Single-Sender-Verified** and set in Vercel production via `printf` (no trailing newline). **New finding, worse than the bug being fixed: `SENDGRID_DELAY_TEMPLATE_ID` has never been set in Vercel** — production has exactly one SendGrid variable — so since WS-E every delay email has thrown *before* reaching SendGrid, and the account problems were never even the first failure. No Appendix B probe exercises a send, which is why three weeks passed without it surfacing. Gate 2,420 passing / 2,445 / 25 skipped / 0 failing / 127 suites. **Still open:** the trial expired 2025-11-26 (purchase), the template (needs a temporary Full Access key), and buying a real domain before submission — Gmail-From mail fails DKIM/SPF alignment and reads as phishing to a buyer. |
| 2026-08-17 (b) | Doc sweep found a live defect | Test alerts | **A stale-reference sweep is not a documentation task.** Grepping for `delayguard.app` across the repo turned up three live ones in `test-alert-service.ts`: every sample payload carried `trackingUrl: "https://delayguard.app/test-tracking"`, which is **not internal** — it renders as the "Track your package" button in a real email sent to a real merchant, so the dashboard's own test feature pointed them at a stranger's expired website. Fixed to RFC-2606 `https://example.com/track/<number>` (v1.60, +4 tests); production links are unaffected and still built by `utils/tracking-url.ts`. **Why v1.59 missed it:** that fix was driven by a *failing send*, and this value never failed anything — a syntactically valid link that no test asserted the destination of. **A wrong value that nothing validates produces no symptom.** Also refreshed the stale references the sweep was actually looking for: `DEVELOPMENT_STORE_TESTING_GUIDE` (its `SENDGRID_FROM_EMAIL` example named the dead domain), `IMPLEMENTATION_PLAN`'s hardcoded-sender code sample, §5 E1's stale line reference, and the project memory (which still listed R2 and PCD as open). Gate 2,424 / 2,449 / 25 skipped / 0 failing / 127 suites — a **fourth** consecutive clean full run. **Also opened R8:** the App Store listing advertised `support@delayguard.app` and `sales@delayguard.app` — same un-owned domain, and it has **no MX**, so a merchant emailing support would have been silently discarded. Submission-blocking, and closed by the same single domain purchase as R1's sending domain. **The through-line of both findings: one wrong value in the first commit propagated into the sender, the test alert, and the public support contact — and every copy looked plausible.** |
| 2026-08-25 | R1 template closed; a dashboard bug that blocked its own test | SendGrid + frontend | **The template exists at last — and the account was verified before it was trusted.** The pasted temp key carried a **doubled `SG.` prefix**; both forms were tested against `/v3/scopes` (as-pasted `401`, de-duplicated `200`) rather than assuming which was right. Key verified (69 bytes, id `IyZGiWJ6TU630ncnWgXPMA`, 206 scopes), account confirmed to hold **0 templates in both generations** — the "never existed" claim proven directly for the first time instead of inferred from a 403. Created `d-5755ad471bd64f15bf2bd61f8b848ad0`, **read it back from SendGrid** (dynamic, 1 active version, correct subject) and set-matched its 8 merge fields against `EmailService.dynamicTemplateData`. Set `SENDGRID_DELAY_TEMPLATE_ID` in Vercel, deployed (also activating `SENDGRID_FROM_EMAIL`, set 8 days earlier but never live); temp key deleted and confirmed dead. **R1 is now one purchase — the trial, still `Maximum credits exceeded`.** Then the acceptance test itself was blocked twice: **R9** (`shopify app env show` now 403s and every Vercel secret is `Sensitive`, so no session can mint a session token — two "verified operational facts" falsified) and **R10** (every keystroke in the dashboard unmounted the form: `saveSettings.pending` set the same `loading` flag that gates the initial render, so typing a merchant email was impossible). R10 fixed in **v1.61** by splitting `saving` from `loading`; **six existing tests encoded the defect** and were changed, not added. Also opened **R11** (the boot validator never checks the two SendGrid vars — its silence had briefly been mistaken for evidence the deploy worked) and **re-diagnosed R5**: the flake is dominated by **wall-clock assertions failing under load**, reproduced on demand by running two `--coverage` suites concurrently, not by order-dependent state leakage. Gate 2,430 passing / 2,455, 25 skipped, 0 failing, 127 suites; lint 0 errors, type-check + build clean. **Still unproven: a single successfully delivered email.** |
| 2026-08-25 (b) | Two dashboard defects the merchant found by using it | Frontend + settings API | **v1.61 made the field typable; v1.62 made it save.** The merchant reported typing was impossible — every keystroke threw focus out of the field. First diagnosis (form unmounting) was **wrong and was retracted before push**: `loading` is used only for `disabled=`, and the browser drops focus from a disabled element. Fixed by splitting `saving` from `loading`; six existing tests encoded the defect and were changed. Then, with the field finally typable, the next question — *did it persist?* — exposed **R12**: after ~12 success toasts, `shops.merchant_email` was still empty and `updated_at` had not moved in 26 days. `settingsToWire` drops the contact fields, `PUT /api/settings` never reads them, and the server's `UPDATE shops` is gated on their presence — so **200 was returned and no statement ran**. The working endpoint (`PUT /api/merchant-settings`) had no `apiClient` method. Also closed R10's second half (debounce: ~20 PUTs/toasts per email typed → 1). Every regression test was run against the **broken** code to confirm it fails there; one was deleted for passing in both states (`fireEvent.change` fires on a disabled input). TDD lessons written into `.claude/rules/tests.md` + `frontend.md`. Gate 2,436 passing / 2,461, 25 skipped, 0 failing, 127 suites; lint 0, type-check + build clean. Then **R13**, found by chasing *"why can't I click SMS?"*: the refusal is correct (live `activeSubscriptions` is `[]` → free plan → 403), but `saveSettings` showed the success toast regardless, because a `rejectWithValue` thunk resolves rather than throws. Fixed to surface the server's reason; 3 new tests, hook previously untested. **This had masked R12 all along.** Final gate 2,439 passing / 2,464, 128 suites. Then the test alert was fired and produced **R14**, the biggest finding of the day: `sgMail.setApiKey is not a function` — `import * as` had been dropping the SendGrid SDK's prototype methods all along, so **no send has ever left the process**, cron sweep included (real `delay_alerts` row 4 was failing identically). One-line fix; **R1's "only the trial remains" conclusion is retracted** — the account was the fourth gate, not the first. Gate 2,441 passing / 2,466, 129 suites. **Then the milestone: re-firing the test alert produced `401 Maximum credits exceeded` — SendGrid's own refusal, not ours. A DelayGuard email reached the SendGrid API for the first time in the project's history**, proving the template, sender and SDK all resolve. R1 is now genuinely one purchase. **R15** fixed alongside: the test-alert toast could not vary its message, so it had reported both the SDK crash and the quota refusal as "check your configuration". Final gate 2,443 passing / 2,468, 129 suites. |
| 2026-08-25 (c) | **R1 CLOSED — the first delivered notification** | SendGrid + email pipeline | **DelayGuard sent an email, and it was the fourth gate that finally fell.** Order of discovery, each invisible until the one ahead of it cleared: unset `SENDGRID_DELAY_TEMPLATE_ID` → a sender domain we never owned → **the SDK binding lost to CommonJS interop (v1.64)** → the expired trial. `import * as sgMail` compiles to `__importStar`, which copies only *own* enumerable properties; `@sendgrid/mail` exports a `MailService` **instance** with its methods on the prototype, so `setApiKey` and `send` were silently dropped and **no send had ever left the process**. Purchases: SendGrid Essentials 50K + `delayguardapp.com` (Cloudflare), authenticated with 5 CNAMEs + DMARC `p=none`; both `_domainkey` chains `dig`-verified to return real RSA keys before the plan was confirmed. Result: `Delivered` / `250 2.0.0 OK`, **primary inbox**, and it matched `delay_alerts` row 4 — so it came from the **real cron pipeline**, not the test button. Four further defects fixed en route (v1.63 false success toast, v1.65/v1.66 unreportable failures). Commits `2b4d873e`, `b80917d1`, `51b0cd70`, `974adc98`, `9b9a4025`. |
| 2026-08-25 (d) | Reading the delivered artifact opened two new blockers | Notification pipeline | **Nothing failed; two bugs surfaced anyway.** Reading the email itself gave R18 (`Order ##DG1001` from `#{{orderNumber}}` over an `order_number` that already carries the `#`, an empty "New estimated delivery:", a vanished tracking CTA). Querying Postgres afterwards gave **R17**: four alerts, one email, `notification_sent_at` identical **to the microsecond**, because `notification.ts` completes `WHERE order_id = $1` instead of the alert's own id — a repeatedly-delayed order would notify once and record success for every suppressed delay after it. 2,446 tests missed it because the processor's tests mock `query` and assert the statement is *issued*, never that it touched one row. **The first real send is the first real test of the template**, and the first real read of the database is the first real test of the writes. |
| 2026-08-26 | Documentation truth pass; §7 rewritten for submission | Docs | R1's four scattered blocks consolidated into one section (they had been appended across four sessions, one of them stranded *inside* R8). R7 and H4 un-staled — both closed 2026-08-05 but still labelled open. R8 rewritten: the domain purchase closed half of it, and the remaining half is Cloudflare Email Routing plus a trap — **enabling it rewrites the zone's SPF**, which could break the sending path R1 just earned. A stale `- [x] Support email ✓ support@delayguard.app` was un-ticked in `app-store-assets/README.md`; the listing's contact fields now name `delayguardapp.com` but stay **UNSET until a message is actually received**. `PROJECT_OVERVIEW.md` reconciled (its submission section still claimed "1–2 days, only screenshots remaining" and 14 env vars). §7 rewritten as a two-column parallel critical path to submission. |
| 2026-08-26 (b) | **R17 + R19 + R18(2/3) + R11 — fixed, deployed, and R17 proven in the real pipeline** | Notification pipeline + config | **The blindness was mechanical, and naming it found a second bug.** `__mocks__/pg.js` answers *every* `UPDATE` with `rowCount: 1` regardless of the statement — so no test could ever distinguish R17's four-row write from a one-row write. Replaced for this purpose by **pg-mem running the production `runMigrations()`** (`src/tests/helpers/pg-mem-schema.ts`), schema verified column-for-column against production. All five R17 assertions failed against the broken processor first, the first reproducing production exactly (one send → alerts 1,2,3,4 flipped). **R17 fixed** by keying both the read and the write on `alertId`, threaded from the sweep (which already selected per alert) and from `delay-check.ts`. **Proven in production**: reset three alerts, triggered the sweep, got **three `notification_sent_at` ~20 ms apart** where the broken code produced one shared stamp — prediction written down before observing. ⚠️ The reset alone would have proven nothing (the sweep's 7-day window excluded all three); caught by running the sweep's own `SELECT` verbatim *before* waiting, instead of waiting and reading silence. **R19 found by that harness**, not on any list: the processor never selected `s.shop_domain`, so the SMS plan gate resolved an undefined shop and fail-closed to `free` — **SMS could not fire on any plan**, a dead paid entitlement H3 would have exposed. **R18**: defects 1–2 fixed data-side so they work against the *already deployed* template (contract: the renderer owns the `#`, the data carries the bare number); the same three defects existed in the SMS body and were fixed with it; defect 3 needs a template push and the production SendGrid key is `mail.send` only, so `create-sendgrid-template.ts` is now **ahead of** the deployed template. **R11**: both SendGrid vars now checked at boot — but *absence* is fatal and every *format* check only warns, because `process.exit(1)` on a false positive is a total outage and the real values are unreadable (R9); the first draft's `^d-[0-9a-f]{32}$` was a guess and was removed. `/health` `200` on the new deployment then *proved* both vars are set — through variables no session can read. Three commits `462161b6`, `23837dce`, `b1a00aef`; gate 7/7 each. Final: **2,474 passing of 2,499, 25 skipped, 0 failing, 135 suites**, lint 0, type-check + build clean. **R5 datapoint:** three full runs → 1 failure, 1 *different* failure, 0 — each green in isolation; a single clean-tree pass was briefly misread mid-session as proof a change had caused one of them. |
| 2026-08-26 (c) | CI made real, and two production defects found behind it | Test infra + monitoring | **A permanently-red check is the same bug as one that never fails, and both were present.** Remote CI had failed on *every* push for days (**R21**) while the local gate passed 7/7 — so no regression could have been seen. Root causes, all pre-existing: (1) both schema suites carried an unconditional `process.env.DATABASE_URL = …delayguard_dev`, discarding CI's credentialed URL and reconnecting passwordless, which SCRAM rejects. **Proof before fixing: pointed at a database that does not exist, that suite passed 11/11** — the value under test was never the value used. (2–4) three tests graded the *machine*: `monitoring-service` asserted health status against a live clock, `input-sanitization` asserted `end - start < 120`, and the retry test slept a **real 3 s** to assert `duration > 3000` against an implementation sleeping exactly 1000+2000. All now assert behaviour — a stub clock, **exactly 2000 `sanitizeString` calls for 1000 properties** (measured), and the *requested* backoff schedule `[1000, 2000]` plus a new cap test `[1000, 2000, 4000, 5000]`. Every replacement was verified against a deliberately reintroduced regression and is **strictly stronger** than what it replaced (a double-walking sanitizer is now caught at 4000 vs 2000 calls; the old timing check would likely have passed it). Suite 8 s faster. **R5 closed.** ⚠️ **Two blind round-trips were wasted first:** there are *two* `monitoring-service` test files and only one was patched, and the second had a *second* hidden dependency (it never stubbed `fetch`, passing only because `jest.setup.ts` installs a global one). The fix was to stop guessing and make the assertion **name the failing check** — which found **R22** on the very next run: `memoryPercentage: 124`, because `checkApplication` divided V8 `heapUsed` by `os.totalmem()`. A percentage of system memory cannot exceed 100, and `routes/monitoring.ts` calls this in **production**, so a Vercel function could report itself unhealthy on a meaningless ratio. Fixed to `v8.getHeapStatistics().heap_size_limit`. **CI is green on all three workflows for the first time in days**, verified on the pushed head. Deployed; production confirms `Application: healthy` — and that probe immediately exposed **R23**: `/monitoring/health` 503s permanently because `checkExternalAPIs` sends an unauthenticated `HEAD` to three authenticated vendor endpoints that can never return 2xx (also missing the mandated timeout, and duplicating the working `ping()` methods). Commits `d4d223cf`, `93db67ef`, `f91f8963`, `b8d3f15c`. Gate 2,483 passing / 2,508, 0 failing, 136 suites. |
| 2026-08-26 (d) | R23 closed by probing the live endpoint, twice | Monitoring | **Deploying is not verifying, and each probe found the next layer.** After v1.72 shipped, `GET /monitoring/health` was probed rather than assumed: it returned **503**, with `Application: healthy` (confirming R22) and **ShipEngine / SendGrid / Twilio all degraded**. Cause (**R23**): `checkExternalAPIs` sent an unauthenticated `HEAD` to three *authenticated* vendor endpoints, which can never answer 2xx — so all three were degraded on every call, permanently, in production. It also had **no timeout** (violating `CLAUDE.md`'s own third-party invariant) and **hand-rolled probes that already existed**: `CarrierService`/`EmailService`/`SMSService` each expose an authenticated, `PING_TIMEOUT_MS`-bounded, non-throwing `ping()`. Delegated to those, concurrently, preserving `PingResult`'s degraded-vs-unhealthy distinction — *"the vendor rejected our credentials"* is a different fact from *"we could not reach the vendor"*, and the HEAD probe collapsed both. Four tests, all red first; two pin the mechanism (degraded ≠ unhealthy; never touch `global.fetch`), each verified by reintroducing exactly that defect. **Re-probing after deploy found one more layer:** ShipEngine and Twilio went healthy, SendGrid stayed degraded — *truthfully*, because `EmailService.ping()` probed `/v3/user/profile`, which needs a scope the production key lacks. Verified live with that key: **`/v3/user/profile` → 403, `/v3/scopes` → 200**. Repointed at `/v3/scopes`. **Final live state: `/monitoring/health` → HTTP 200, all six checks healthy.** ⚠️ The duplicate-monitoring-test-file trap bit a **third** time (ten inert `global.fetch` stubs); caught by the local gate this session, but collapsing those two files is real post-launch debt. Commits `94053691`, `7ad62be7`. Gate 2,486 passing / 2,511, 0 failing, 136 suites; **CI green on all three workflows**, verified on the pushed head. |
| 2026-08-26 (e) | **The six-week webhook proof is CLOSED** — and H7 turned out to be proven, not unverified | Admin API + ShipEngine | **A challenge to "only a human can do these" was mostly right, and partly wrong.** Tested rather than asserted. **Wrong about the test order:** `shops.access_token` is a live Admin token with `write_orders`, so `orderCreate` produced real order **`#1001`** (`gid://shopify/Order/6718611587132`) — and Shopify's own `ORDERS_UPDATED` webhook landed in production Postgres as `orders` row **id 2**, every column correct including the shipping address. **This had never once been observed in six weeks**; the table had held exactly one synthetic row since 2026-07-30. Ingest is now proven end to end with a real merchant-shaped payload. **Right about the rest, with evidence:** no Cloudflare credentials exist anywhere (R8 stays human); `POST /v3/api_keys` → **403**, so no session can mint the Full-Access SendGrid key R18 needs; `shopify app --help` exposes no pricing command and Managed Pricing is Partner-Dashboard-only (H3 stays human); no browser automation is installed, so H8's screencast is not possible. **Fulfilling the order with tracking also failed, for a scope reason worth recording:** `fulfillmentOrders` → `ACCESS_DENIED` (needs `read_merchant_managed_fulfillment_orders`, which the app does not request and does not need — it only *reads* fulfillment webhooks), and the legacy REST fulfillment path returns **406** in `2026-07`. **The largest find was H7 itself**, which had sat "OPEN/unverified" since day one: `/v1/tracking` returns *"You must upgrade your billing plan"* for both UPS and USPS while `/v1/carriers` happily returns 4 connected carriers — a plan entitlement, not a credential. Logged as **R24**: RULES 2 and 3 have therefore never fired, corroborated exactly by production holding **4 `WAREHOUSE_DELAY` alerts and 0 `tracking_events`**. Also completed **H-4** (AI self-review): the listing is clean on 4.3.3/4.3.6/4.3.7/4.4.1, and its only remaining risks are the R24 and R8 accuracy claims. |
| 2026-08-26 (f) | **Production outage, self-inflicted, ~4 minutes** — plus R25 | Deploy + delay-check | **A deploy reported success and shipped nothing.** `npx vercel --prod --yes` was run from the **repo root**, which has no `package.json` or `vercel.json`; Vercel built an empty output (`Build Completed [1s]` against a historical 45 s, *"no files were prepared"*), marked it **Ready**, and every route 404'd — `/health`, `/monitoring/health`, `/legal/*`. **Nothing errored; the CLI said success.** Caught because the deploy is always followed by a probe of the running thing. **Rolled back first (`vercel promote <last-good>` → 200 in ~2 s), diagnosed second.** The rule *"deploy from `delayguard-app/`"* was already in `deploy.md` and did not prevent it, because a shell `cd` had reset — so the guard is now **structural**: `npm run deploy` (which cannot run outside the package directory) instead of a bare `npx vercel`, and `package.json`'s `deploy` script now calls `npx vercel` since `vercel` is not global. Also shipped **R25**: `processDelayCheck`'s unguarded carrier fetch threw past the notification dispatch, discarding a warehouse delay that RULE 1 had **already detected and persisted** — live under R24, and it would have fired the moment `#1001` was fulfilled with tracking. Narrow boundary around the carrier call only; three tests pin both sides (removing the boundary fails two, widening it to swallow everything fails the third); that path had **zero** rejection coverage before. Commit `16eac5f3`. Gate 2,489 passing / 2,514, 0 failing, 136 suites. Final live state: `/health` 200, `/monitoring/health` 200 with all six checks healthy. |
| 2026-08-26 (g) | **R24 resolved by migration, not purchase** — carrier tracking moved to EasyPost (v1.75) | CarrierService + both ETA writers | **The cheap explanation was tested and killed first.** ShipEngine's 401 might have meant "UPS isn't connected" rather than "your plan is too small" — so it was re-probed with `carrier_code=usps`. UPS *is* connected (`se-3610121`) and USPS returns the identical refusal: a plan entitlement. **Then the expensive fix was questioned too.** ShipStation Advanced is **$75/mo** against a **$7/mo** product — ~11 merchants to break even, at zero — so the dependency moved to **EasyPost** at $0.01–0.03/shipment (**D4**), which bills in proportion to revenue. **The migration turned out to be a capability gain:** EasyPost reports lateness in `status_detail` (`delayed`, `weather_delay`, `delivery_exception`, `transit_exception`), which **ShipEngine never exposed at all**, and it maps onto the existing internal vocabulary so `delay-detection.ts` was untouched. **The fix nearly reintroduced the bug it was fixing:** EasyPost returns only the current ETA, and both writers copied a provider `original_estimated_delivery_date` into `original_eta` — so every refresh would have written NULL and silently killed `DATE_DELAY`. Both now `COALESCE(original_eta, $1)`, pinned by pg-mem tests against the real schema (the `pg` mock stores nothing and cannot see it). **A test that passed against broken code was deleted, not kept**: `new Date(null).getTime()` is 0, so "current > original" was vacuously true. Probing the live API unauthenticated confirmed the endpoints exist and the Basic-auth scheme, and surfaced that a dead key answers **403 `APIKEY.INACTIVE`**, not 401 — now mapped. `ping()` deliberately probes `/carrier_accounts`, never `/trackers`, so a health check cannot bill us; a test pins that. Gate 2,525 passing / 2,550, 0 failing, 137 suites. **Not deployed** — boot validation requires `EASYPOST_API_KEY`, which is the one remaining human step. |
