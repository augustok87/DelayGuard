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

### R1 — SendGrid account cannot send email `[HUMAN]` — **top blocker, 2 of 4 sub-problems now closed**

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
1. ⛔ **Resolve the account plan** in SendGrid — the trial expired 2025-11-26 (paid-plan decision, the COGS line alongside ShipStation). **Expect this to be the gate that actually fails a send:** sender verification is an account setting and succeeds regardless, so a 401/403 on the first real send is the *plan*, not the identity. Do not go re-debugging the sender.
2. ✅ ~~Settle the sender identity.~~ **Done 2026-08-17** — see above.
3. ✅ ~~**Create the template.**~~ **Done 2026-08-25** — `d-5755ad471bd64f15bf2bd61f8b848ad0`, set in Vercel and deployed; temporary key deleted. Evidence table below.
4. ⛔ **Verify end-to-end** by firing `/api/test-alert` from the dashboard (E1's actual acceptance criterion). **Still not done** — blocked agent-side by R9 (no session token) and blocked in the browser by R10 until v1.61 deploys. No delay email has ever been successfully sent.

### R8 — No working support mailbox, and the listing claims one `[HUMAN]` — **submission-blocking**

*Opened 2026-08-17, found by the same sweep that produced v1.60.*

`SHOPIFY_APP_STORE_LISTING.md` advertised **`support@delayguard.app`** (twice) and **`sales@delayguard.app`** as the app's contact addresses. Shopify's listing requirements include a working support contact, and **`delayguard.app` is not ours** (§6 R1 records the four checks) — the domain has **no MX records at all**, so those addresses cannot receive mail even in principle. Submitting with them means either a review rejection or, worse, an approval that leaves paying merchants with a support address that silently discards everything they send.

Both listing entries are now marked as unset rather than left looking plausible, because **the failure mode here is a value that reads as correct**. Nothing in the repo validates a support address; the only thing that would have caught it is someone trying to send mail to it.

**This is the same purchase as R1's sending domain — one domain resolves both.** Buy it, then: point `SENDGRID_FROM_EMAIL` at `noreply@<domain>`, create `support@` and `sales@` forwarding to a real inbox, and fill the two placeholders in `SHOPIFY_APP_STORE_LISTING.md`. **Accept:** send a message to `support@<domain>` from an unrelated account and confirm it arrives — the check that was never run on the old address.

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

### R11 — The boot-time env validator does not check the variables that broke email `[AGENT]` — **new 2026-08-25**

`config/environment.ts`'s optional-variable list is exactly `SENTRY_DSN`, `CSRF_SECRET`, `JWT_SECRET`. It does **not** check `SENDGRID_DELAY_TEMPLATE_ID` or `SENDGRID_FROM_EMAIL` — the two variables whose absence silently broke every production delay email for three weeks (R1).

This was found by trying to use the startup log as evidence that the deploy had picked up the new values: the log showed no warning about them, which looked like confirmation. **It was not — the validator never looks at them, so its silence is not evidence.** A check that cannot fail proves nothing (global rule #11).

`resolveDelayTemplateId()` and `resolveFromAddress()` do throw in production, but only on the send path, and nothing ever sent. Adding both to the validator would have surfaced R1 at the first cold start. Small, TDD-able, not yet done.

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

### R7 — Protected Customer Data approval blocks ALL order webhooks `[HUMAN]` — **new, now the top blocker**

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

### R3 — Human dashboard gate: H3, H4, H7 `[HUMAN]`

H3 (App Pricing plans) blocks all revenue. H4 (Protected Customer Data) has approval latency — submit it first, today. H7 (ShipStation Advanced plan) gates tracking third-party parcels, the app's core data input.

### R4 — Listing submission: H8 → H-4 → H9 `[HUMAN]`

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

*Rewritten 2026-08-25. **R1 is down to one purchase.** The template exists, the sender is set, both are deployed — but **no email has ever actually been delivered**, and two new blockers (R9, R10) landed on the way to proving it.*

**State at handoff:**

| | Status |
|---|---|
| **R1 — SendGrid** | ⛔ `[HUMAN]`, **3 of 4 sub-problems closed.** Template `d-5755ad471bd64f15bf2bd61f8b848ad0` created, verified server-side, set in Vercel, deployed. Sender `augustok87@gmail.com` now live. **Remaining: the expired trial** — a sandbox send still returns `Maximum credits exceeded` |
| **A delivered email** | ⛔ **never observed.** This is the real acceptance test and it has not been run. Everything else in R1 is infrastructure |
| **R9 — agent can't authenticate** | ⛔ `[HUMAN]`, new. `shopify app env show` → 403; every Vercel secret is `Sensitive`, so `env pull` masks it. **No session can mint a session token**, so `/api/*` and `/api/cron/*` are human-only until `shopify auth login` is redone |
| **R10 — dashboard unusable** | ✅ fixed in **v1.61**, ⚠️ **not deployed**. Typing any character unmounted the form. Workaround until deployed: paste, don't type |
| **R11 — env validator gap** | ⛔ `[AGENT]`, new, small. The boot validator never checks the two SendGrid vars — the ones that broke email for three weeks |
| **R8 — support mailbox** | ⛔ `[HUMAN]`, submission-blocking. Closed by the same domain purchase as R1's sending domain |
| H3 / H7 `[HUMAN]` | ⛔ App Pricing plans (blocks all revenue) and ShipStation Advanced |
| **Real webhook ingest** | ⛔ still unproven. `orders` holds exactly **1** row, the synthetic `9900112233`. All 3 subscriptions are live and correct — **any new row is the proof** |
| R2 / R6 / R7 | ✅ closed, evidence in §6 |
| **R5 — test flake** | ⚠️ open, but **re-diagnosed**: dominated by wall-clock assertions failing under load, not order-dependent state leakage. Reproduced on demand by running two `--coverage` suites at once |

**Paste this as the opening prompt:**

> You are executing DelayGuard's launch plan. Read `LAUNCH_PLAN.md` **§6** and **§7** first — the app is live at `https://delayguard-api.vercel.app` and installed on a real dev store, so §§1–4 are history and Appendix A is ground truth you must not re-audit. Follow `CLAUDE.md` and `.claude/rules/*.md`: TDD, and the local CI gate (`npm test && npm run lint && npm run type-check && npm run build` from `delayguard-app/`). Never `--no-verify`.
>
> **Operational facts — two of which this plan got wrong, so check before relying on them:** deploys are **not** git-triggered; ship with `npx vercel --prod --yes` from `delayguard-app/`. Migrations do **not** run at startup; schema changes need `npm run migrate:vercel`. ⚠️ **`shopify app env show` currently returns 403 and every Vercel secret is typed `Sensitive`, so you cannot mint a session token or read `CRON_SECRET` (§6 R9)** — authenticated verification is a human browser action until that is fixed. Production Postgres *is* still reachable, because `DATABASE_URL` is typed Non-sensitive. **Never run `npm test` while another session is running it** — that reliably manufactures R5's flake.
>
> **R2, R6, R7 and R1's sub-problems 2–4 are closed — do not re-verify them.** Do **not** try to domain-authenticate `delayguard.app`; it is not ours. Do not re-debug the sender or the template when a send 401s — that is the expired trial, and it is the only thing left in R1.
>
> **The single most valuable thing you can do: get one real email delivered, and one real webhook into Postgres.** Both are one human action away and neither has ever happened. In priority order: **(1)** after the trial is paid, fire `/api/test-alert` from the dashboard and confirm an email actually arrives — then, and only then, is R1 closable. **(2)** Have a real order placed on `delayguard-dev.myshopify.com` and prove a *Shopify-delivered* webhook lands in `orders` (baseline: exactly 1 synthetic row). **(3)** Deploy v1.61 — the dashboard is unusable without it. **(4)** R11, the env-validator gap (small, TDD-able). **(5)** B2's missing server-side OAuth query-HMAC check. **(6)** the non-atomic notification dedupe in `CLAUDE.md`. **(7)** debounce `NotificationPreferences` (§6 R10's open half).
>
> **Do not** re-audit Appendix A, re-verify Appendix B, or start C5 (post-launch).
>
> Document as you go: `LAUNCH_PLAN.md` (§6 status, Session Log, and rewrite §7), `PROJECT_OVERVIEW.md`, `CHANGELOG.md` — same commits as the work. New blockers go in §6 **with the evidence that proves them**.

**Why this order:** every remaining code item is small. What is not small is that **the product has still never delivered its core artifact** — an email to a merchant about a delayed order. Three weeks were spent on SendGrid account theory; the actual first failure turned out to be an unset env var, and even now the send has not been observed working. Prove the two live paths before writing another line of code.

**The lesson 2026-08-25 added.** Twice this session a *check that could not fail* was nearly reported as evidence. The startup log showed no warning about the SendGrid variables, which looked like proof the deploy had taken — until `environment.ts` turned out never to check them. And a green `monitoring-service` suite looked like proof the health checks worked — until a HEAD probe showed all three external APIs return non-2xx, and the suite passes only because a global `fetch` mock hides it. **Before believing a passing signal, confirm it is wired to the thing you think it measures.** The corollary, from R10: a 2,449-test suite missed a bug that made the dashboard unusable, because every test asserted reducer state and the reducer was correct — **the defect lived at the seam between two units, where no unit test looks.** And from R9: "the CLI is authenticated" was recorded as a verified operational fact, then silently stopped being true. **Facts about the world outside the repo decay; re-check them at the start of the session that depends on them.**

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
| 2026-08-25 (b) | Two dashboard defects the merchant found by using it | Frontend + settings API | **v1.61 made the field typable; v1.62 made it save.** The merchant reported typing was impossible — every keystroke threw focus out of the field. First diagnosis (form unmounting) was **wrong and was retracted before push**: `loading` is used only for `disabled=`, and the browser drops focus from a disabled element. Fixed by splitting `saving` from `loading`; six existing tests encoded the defect and were changed. Then, with the field finally typable, the next question — *did it persist?* — exposed **R12**: after ~12 success toasts, `shops.merchant_email` was still empty and `updated_at` had not moved in 26 days. `settingsToWire` drops the contact fields, `PUT /api/settings` never reads them, and the server's `UPDATE shops` is gated on their presence — so **200 was returned and no statement ran**. The working endpoint (`PUT /api/merchant-settings`) had no `apiClient` method. Also closed R10's second half (debounce: ~20 PUTs/toasts per email typed → 1). Every regression test was run against the **broken** code to confirm it fails there; one was deleted for passing in both states (`fireEvent.change` fires on a disabled input). TDD lessons written into `.claude/rules/tests.md` + `frontend.md`. Gate 2,436 passing / 2,461, 25 skipped, 0 failing, 127 suites; lint 0, type-check + build clean. Then **R13**, found by chasing *"why can't I click SMS?"*: the refusal is correct (live `activeSubscriptions` is `[]` → free plan → 403), but `saveSettings` showed the success toast regardless, because a `rejectWithValue` thunk resolves rather than throws. Fixed to surface the server's reason; 3 new tests, hook previously untested. **This had masked R12 all along.** Final gate 2,439 passing / 2,464, 128 suites. |
