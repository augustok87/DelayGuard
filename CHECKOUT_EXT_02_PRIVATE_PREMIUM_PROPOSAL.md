> ### Purpose of this document
>
> **This is interview preparation material, not part of the DelayGuard project roadmap.**
>
> - **Why it exists**: prep for a technical interview about Shopify Checkout Extensibility for a potential engagement at a different company.
> - **Role of DelayGuard here**: used as a concrete reference point — the author's own Shopify app, currently pre-launch — to illustrate architecture and capability. DelayGuard itself is not being proposed to the interviewer.
> - **Author**: Joong Kwun — augustok87@gmail.com
>
> **Companion files (all interview-prep only):**
> - `CHECKOUT_EXT_01_PUBLIC_APP_PROPOSAL.md` — public SaaS distribution path
> - `CHECKOUT_EXT_02_PRIVATE_PREMIUM_PROPOSAL.md` — *this file* — single-merchant bespoke path
> - `CHECKOUT_EXT_03_ARCHITECTURE_DESIGN.md` — technical architecture reference

---

# DelayGuard as a Private Premium Checkout Extensibility Engagement

**A bespoke, single-merchant implementation of DelayGuard's delay-intelligence capabilities — distributed via Shopify's custom-distribution model, deployed on a single Shopify Plus store, leveraging the full surface area of Checkout Extensibility.**

Prepared by: Joong Kwun
Date: April 2026
Audience: Interview technical deep-dive — premium client scenario

---

## TL;DR

The previous proposal surfaced DelayGuard (a public SaaS app in pre-launch) through extensions. **This proposal is different.**

The model here is: a premium Shopify Plus client wants delay-intelligence capabilities **integrated natively** into their checkout, customer account, and operations — built as a **custom-distributed app** (formerly "private app"), deeply branded, integrated with their ERP/WMS/CRM/3PL stack, and owned entirely by them.

DelayGuard's existing backend (Koa + Postgres + BullMQ + 3-rule delay engine + ShipEngine/SendGrid/Twilio integrations + session-token JWT middleware) becomes a **reusable framework**. Each bespoke engagement layers client-specific extensions, enterprise integrations, and branding on top.

**What's different vs. a public SaaS model:**

| Dimension | Public SaaS (previous proposal) | Private Premium Engagement (this proposal) |
|---|---|---|
| Distribution | Shopify App Store | Custom distribution (single-merchant install link) |
| Shopify review | Required | Not required |
| Tenancy | Multi-tenant | Single-tenant |
| Billing | Shopify Billing API | Off-platform (retainer + project fee — Billing API not available for custom apps) |
| Branding | App-owned | Merchant-owned, fully white-labeled |
| Integrations | ShipEngine / SendGrid / Twilio (generic) | Merchant's ERP, WMS, 3PL, CRM, support stack |
| Plan reach | Every merchant who installs | One Plus merchant, guaranteed full surface access |
| Checkout UI extension access | Plus-only features gated for that tier | All Plus surfaces available out-of-box |
| App Bridge embedded admin | Available | **Not available** — admin surface handled via Admin UI extensions + external dashboard |
| Time to ship | App Store review adds 2–4 weeks | Can ship continuously |
| Business model | Monthly per-shop subscription | Project fee + monthly retainer |

---

## 1. Distribution Model — Shopify Custom Distribution

Legacy "private apps" were deprecated January 2022 and auto-migrated to **custom distribution** by January 2023. Current 2026 model:

- Developer creates app in Partner Dashboard, selects **custom distribution**.
- Merchant receives a **direct install link** — no App Store, no review.
- App installs with OAuth scope approval by the merchant.
- Can be installed on one Plus store, or on multiple stores within the same **Plus Organization**.

**Available to the custom app:**
- Full OAuth + Admin GraphQL API
- All webhook topics (with HMAC verification)
- Checkout UI extensions (Plus-gated surfaces unlocked because merchant is Plus)
- Customer Account UI extensions
- Admin UI extensions (block + action targets on order/product/customer pages)
- Shopify Functions (Delivery Customization, Discount, Payment Customization, etc.)
- Theme App Extensions (App Blocks for the storefront)
- ScriptTag / Web Pixel (if needed)

**Not available to the custom app:**
- Shopify Billing API — merchant pays the agency/consultancy directly
- App Bridge for full embedded admin UI — the "big admin dashboard" has to be hosted externally; in-admin context goes through Admin UI extension blocks instead
- App Store listing / discovery

Source verification: Shopify's custom-distribution constraints re: Billing API and App Bridge come directly from the distribution reference docs. The surface availability for UI extensions is based on plan tier (Plus), not distribution model — confirmed by cross-referencing the Checkout UI extensions docs, which apply the same design requirements "to custom apps as well as public apps."

---

## 2. Feature Map — Maximum Capability Set for the Engagement

Because the client is a Plus merchant and distribution is custom, we're not gating anything. The full extension surface is in scope. Features below are ordered by commercial impact (conversion / retention / ops) rather than by implementation difficulty.

### 2.1 Pre-purchase — Checkout UI Extension (Plus-only, unlocked here)

**Target**: `purchase.checkout.delivery-address.render-before`

**What it does**: After the customer enters shipping address, render a branded "shipping confidence" block sourced from the client's own historical tracking data plus aggregate carrier reliability:

> "Orders to your ZIP code shipped via FedEx Ground arrive on time 94% of the time (based on 1,247 recent orders). Estimated delivery: April 26–28."

**Business impact**: Conversion lift on cart abandonment caused by delivery uncertainty. Pre-empts "when will this arrive?" hesitation.

**Why this needs to be bespoke**: The trust signal pulls from the client's own tracking history and carrier mix, branded with their tone of voice. A generic SaaS app can't deliver this because it doesn't know which carriers or zones matter to this specific merchant.

### 2.2 In-checkout — Shopify Function (Delivery Customization)

**What it does**: At checkout, dynamically hide, rename, or reorder shipping methods whose rolling 30-day delay rate exceeds merchant-configured thresholds.

**Language**: Rust or JavaScript (we'd likely go Rust for lower cold-start and cost).

**Configuration surface**: Merchant configures thresholds and rules in the external admin dashboard (e.g., "hide FedEx 2Day in zone C if 30-day on-time rate drops below 80%").

**Constraints**: Max 25 delivery customizations per store; the cheapest option must always render first.

**Business impact**: Reduces customer-facing delay incidents at the source, before the order is even placed. Directly prevents the support ticket DelayGuard was originally designed to handle post-purchase.

### 2.3 Thank-you page — Checkout UI Extension

**Target**: `purchase.thank-you.block.render`

**What it does**: Immediately after purchase, render branded tracking confidence block with estimated delivery window, carrier, and the merchant's preferred support CTA (e.g., "Track your order in the Shop app" or "Get SMS updates").

**Business impact**: Reduces "where is my order" inbound support volume, which is typically the #1 ticket category for DTC brands.

### 2.4 Customer Account Order Status — UI Extension (broad-reach)

**Target**: `customer-account.order-status.block.render`

**What it does**: Branded, real-time delay status and tracking timeline on the Order Status page. Uses the 3-rule delay detection engine — warehouse delay, carrier delay, transit delay — each with distinct messaging and merchant-configured remediation CTAs.

### 2.5 Customer Account Order Page — Full-page UI Extension

**Target**: `customer-account.order.page.render`

**What it does**: Replace or supplement the default order detail page with a bespoke experience:
- Full tracking timeline
- Delay alert history
- Self-service workflow ("Request discount code for delay" / "Request reshipment" / "Reroute to pickup location")
- CTA routing into merchant's support stack (Zendesk, Gorgias, Kustomer — whatever they use)

**Business impact**: Self-service deflects support tickets. A properly wired "delay discount" flow can turn a retention risk into a loyalty moment with zero agent time.

### 2.6 Customer Account Order Index — UI Extension

**Target**: `customer-account.order-index.block.render`

**What it does**: On the customer's order list, show per-order delay status badges (on-track / at-risk / delayed) so the customer sees status at a glance across their order history.

### 2.7 Admin — UI Extensions (in-context merchant surface)

**Targets**:
- `admin.order-details.block.render` — inline DelayGuard context on order detail pages
- `admin.order-details.action.render` — action menu items ("Generate delay discount code", "Create support ticket with delay context", "Escalate to ops team")
- `admin.customer-details.block.render` — delay history per customer for service teams

**Business impact**: Merchant support / ops team gets rich delay context exactly where they already work. No context-switching into a separate app.

### 2.8 External Admin Dashboard (operations + configuration)

Because custom apps can't use App Bridge for a full embedded dashboard, the "full operations view" lives at a separate URL — either agency-hosted (`client-delayguard.agency-domain.com`) or hosted in the client's cloud. Contains:
- Bulk delay monitoring
- Rule and threshold configuration
- Analytics (carrier performance, zone analysis, delay cost quantification)
- Enterprise integration management

**This is a feature, not a limitation**: a dedicated ops portal is usually what merchant operations teams prefer anyway — bigger screen real estate, not constrained to Shopify's admin layout.

### 2.9 Theme App Extension (storefront — optional)

**What it does**: PDP trust widget — "Orders from this warehouse ship within 24h, arrive in 3–5 days on average." Liquid block merchants drop into their theme via the theme editor.

**Business impact**: Pre-cart conversion signal. Extends DelayGuard's data upstream in the funnel.

### 2.10 Enterprise Integrations (the real premium value)

This is where a bespoke engagement meaningfully differentiates from a public SaaS app:

| Integration | Purpose | Example systems |
|---|---|---|
| ERP | Source of truth for inventory, fulfillment SLA, vendor data | NetSuite, SAP, Acumatica |
| WMS | Warehouse delay signals (packed-but-not-shipped, inventory pick delays) | Manhattan, HighJump, Körber |
| 3PL | Direct shipment status from third-party logistics providers | ShipBob, ShipHero, 3PL Central, Deposco |
| CRM / Support | Auto-create tickets for severe delays, context for agents | Zendesk, Gorgias, Kustomer, Intercom |
| Customer Data Platform | Feed delay events into lifecycle automation | Klaviyo, Segment, Attentive |
| ESP / SMS | Branded delay notifications through merchant's existing stack | Klaviyo, Postscript, Attentive |
| BI / Data warehouse | Delay event stream for analytics | Snowflake, BigQuery |

The core delay-detection engine from DelayGuard stays the same; the **integration adapters** are what each engagement delivers as custom work.

---

## 3. Reference Architecture — Single-Tenant, Deeply Integrated

```
┌───────────────────────────────────────────────────────────────────┐
│ Client Shopify Plus Store                                         │
│                                                                   │
│  Pre-purchase checkout block  (purchase.checkout.delivery-addr…)  │
│  In-checkout Delivery Function (hide/reorder carriers)            │
│  Thank-you block                                                  │
│  Customer Account: order-status, order-page, order-index          │
│  Admin UI: order-details block, action menu items                 │
│  Theme App Extension (optional PDP trust widget)                  │
└───────────────────────────────────────────────────────────────────┘
                             │
                             │ Preact extensions (64 KB cap each)
                             │ @shopify/ui-extensions/preact
                             │ Session token JWT (5-min TTL)
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Bespoke DelayGuard Instance (single-tenant)                       │
│                                                                   │
│  [Public API surface]                                             │
│    /api/public/orders/:id/delay-status                            │
│    /api/public/shipping-confidence?zone=…&carriers=…              │
│    /api/public/self-service/{discount, reshipment, reroute}       │
│                                                                   │
│  [Admin surface — external dashboard]                             │
│    /admin/rules, /admin/analytics, /admin/integrations            │
│    (hosted at client-delayguard.<domain>)                         │
│                                                                   │
│  [Core engine — reused from DelayGuard framework]                 │
│    3-rule delay detection (warehouse, carrier, transit)           │
│    BullMQ job queues, HMAC webhook verification                   │
│    Session-token JWT middleware                                   │
│                                                                   │
│  [Integration adapters — bespoke per engagement]                  │
│    ERP adapter · WMS adapter · 3PL adapter                        │
│    CRM/support adapter · CDP event emitter                        │
└───────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Client-owned data plane                                           │
│   Postgres (single-tenant)                                        │
│   Redis (single-tenant)                                           │
│   S3 / object storage for event archives                          │
│                                                                   │
│ Hosted either in agency cloud or client cloud (AWS/GCP/Azure)     │
└───────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Client enterprise systems (bespoke integrations)                  │
│   NetSuite · SAP · ShipBob · Zendesk · Klaviyo · Snowflake · …    │
└───────────────────────────────────────────────────────────────────┘
```

**Key architecture points:**

- **Single-tenant**: no `shops` table multi-tenancy logic; one access token, one set of credentials.
- **Deployment option A (agency-hosted)**: faster to ship, we control the stack, client pays hosting through retainer.
- **Deployment option B (client-cloud hosted)**: common for enterprise — we deploy into the client's AWS/GCP/Azure account. Data never leaves their boundary. Usually required for clients with strict compliance postures (e.g., EU merchants under GDPR, healthcare-adjacent brands).
- **All Shopify extension → backend traffic uses session-token JWT auth** — exact same middleware we already have in DelayGuard. Verified against the app secret, 5-minute TTL.

---

## 4. Phased Delivery Plan

**Total estimated engagement: 10–14 weeks to full production.**

The sequencing below ships user-visible value in waves rather than holding everything until the end. Each phase ends in a deployable increment.

| Phase | Weeks | Deliverables |
|---|---|---|
| **0. Discovery** | 1 | Tech audit of client's Shopify config, carrier mix, enterprise systems, branding assets. Integration inventory. Success metrics defined (e.g., -30% WISMO tickets, +1.5% conversion from shipping confidence). |
| **1. Core platform** | 2 | Single-tenant DelayGuard instance provisioned. OAuth install flow. Webhook ingestion. Postgres schema deployed. 3-rule engine live. Admin UI (external dashboard) scaffolded. |
| **2. Customer Account extensions** | 2 | Order Status block + Order Page full-page + Order Index block. Branded styling. Self-service CTAs wired (basic). |
| **3. Thank-you + Admin extensions** | 1 | Thank-you block. Admin order-details block + action menu. |
| **4. Pre-purchase + Functions** | 2 | `purchase.checkout.delivery-address.render-before` shipping confidence. Delivery Customization Function. Threshold configuration UI in external admin. |
| **5. Enterprise integrations** | 2–3 | ERP/WMS/3PL/CRM adapters per integration inventory from Phase 0. Typically 2–4 integrations per engagement. |
| **6. Analytics + self-service workflows** | 1–2 | Merchant-facing analytics in external dashboard. Self-service flows for discount generation, reshipment requests, reroute — wired through to merchant's ops tools. |
| **7. Hardening + launch** | 1 | Load testing, observability, runbook, training for client ops team, go-live. |

**Accelerators vs. public SaaS build:**
- No App Store review (−2 to −4 weeks)
- No multi-tenant edge cases to harden (−1 to −2 weeks)
- No generic merchant configurability — we ship what this client needs, not 100 settings toggles (−1 week on admin dashboard alone)

**Net: 4–6 weeks faster to production vs. a comparable public app build.**

---

## 5. Reusing DelayGuard's Core — The IP Play

The commercial thesis of this model: **the DelayGuard open-source/internal framework becomes reusable IP across engagements.**

What gets reused (framework):
- Koa + TypeScript backend skeleton
- 3-rule delay detection engine (warehouse/carrier/transit)
- HMAC webhook verification middleware
- Session-token JWT middleware
- BullMQ queue scaffolding + processors
- Postgres schema migrations
- ShipEngine adapter (as default; can be swapped)
- Shopify Admin GraphQL client
- Test harness (1,348 tests already written)

What gets built bespoke per engagement (deliverable):
- Preact extension bundles styled to client brand
- Enterprise integration adapters
- Custom self-service workflows
- External admin dashboard (customized per client)
- Shopify Function logic (thresholds, rules)
- Deployment into client's chosen cloud

**Strategic consequence**: the first engagement funds the framework investment. Subsequent engagements ship 30–50% faster because the core is already battle-tested. This is exactly the economic model that Shopify Plus partner agencies (Arctic Leaf, Swanky, independent consultancies) operate on.

---

## 6. Commercial Model

Because the Shopify Billing API is not available to custom apps, billing is off-platform. Typical shape:

**Project fee** — covers Phases 0–7 implementation:
- Typical range for a 10–14 week engagement of this scope: **$80k–$180k**
- Scope-dependent on integration count and branding complexity

**Monthly retainer** — covers ongoing:
- Hosting and infrastructure (if agency-hosted)
- Monitoring, SLA response, bug fixes
- Quarterly API-version upgrades (Shopify's 12-month deprecation cycle)
- Minor feature work in scope
- **Typical range: $6k–$15k / month**

**Out-of-scope change orders** — major new integrations, significant extension redesigns, additional surfaces — billed separately.

**IP / code ownership** — two common models:
- Code delivered to client (client owns bespoke layer; agency retains framework rights)
- Joint ownership with non-compete clauses

---

## 7. Constraints & Gotchas (honest list)

| Constraint | Impact | Mitigation |
|---|---|---|
| **No App Bridge for custom apps** | Can't embed a full admin UI in Shopify admin iframe | External admin dashboard at dedicated URL; use Admin UI extensions for in-context merchant surface |
| **No Billing API** | Can't charge through Shopify | Direct invoicing via standard agency billing — not a blocker |
| **64 KB compiled bundle per extension** | Hard limit | Preact + server-rendered data payloads; don't ship logic in the bundle |
| **Sandbox** | No DOM, no CSS overrides, no arbitrary HTML | Build with Shopify's `s-*` component vocabulary |
| **API version lifecycle** | 12-month deprecation cycle | Quarterly version audits in retainer scope |
| **Single-tenant data** | All eggs in one basket | Strong backups, DR plan, client data export on request |
| **No App Store discovery** | Client self-installs via direct link | Not a concern — this is a single-client engagement |
| **Shopify review not required** | Faster shipping, but no external gate on quality | Strict internal QA; automated regression suite |
| **Plus-only for pre-purchase / Functions** | Not a blocker because client is Plus | Confirm Plus status in Phase 0 |
| **Extension → backend is cross-origin** | CORS | Whitelist `shop.app` and client's checkout domain; session-token scope-check on every request |
| **Delivery Function max 25/store** | We need 1 | Audit at install; fail gracefully |

---

## 8. Honest Context

I have not personally shipped a Checkout UI, Customer Account, or Admin UI extension to production. My Shopify production footprint is:
- Theme architecture on live merchant stores (bluatlas.com, supply.co — live, merchant-serving traffic)
- A custom Shopify app backend with OAuth, Admin GraphQL, HMAC webhooks, BullMQ queues, and embedded admin UI (DelayGuard — pre-launch, not yet on the App Store, zero merchants)

What carries over cleanly:
- Session-token JWT verification — identical pattern between embedded admin and extension → backend auth
- HMAC webhook processing — already shipped and tested
- OAuth install flow — already shipped (would be simplified for custom distribution)
- BullMQ queue architecture — reusable as-is
- 3-rule delay detection engine — reusable as-is

What I'd be ramping on in Week 1:
- Preact UI extension component vocabulary (`s-banner`, `s-stack`, `s-text`, etc.)
- `shopify.extension.toml` configuration surface
- Shopify CLI extension deploy workflow
- Shopify Function Rust / JavaScript runtime specifics

The ramp is **days, not weeks**. The reason I'm confident: I've been using Claude Code as a development agent to ship Shopify Admin GraphQL automation at pace (documented in the DelayGuard repo and in my theme migrations at Foundry Brands). Learning the extension model is a superset application of Shopify fundamentals I already operate in daily.

---

## 9. Questions for the CTO

Answers to these shape the Phase 0 scope:

1. **Plan tier** — Is the target merchant on Shopify Plus? If not, Phases 4 (pre-purchase checkout) and Delivery Customization Function are out of scope and the plan collapses to customer-account + admin + thank-you.
2. **Enterprise stack** — Which ERP / WMS / 3PL / CRM / CDP systems does the merchant use? This drives Phase 5 scope and effort.
3. **Hosting posture** — Agency-hosted or client-cloud-hosted? Client-hosted usually adds 1–2 weeks for deployment automation and credential isolation.
4. **Brand assets readiness** — Do we have a design system / Figma library / brand guide to pull from for extension styling? Or do we design in parallel?
5. **Success metrics** — What are the measurable targets? Typical commitments: -30% WISMO ticket volume, -X% delay-related chargebacks, +Y% shipping-related conversion. Defining these up-front makes scope decisions downstream easier.
6. **Code ownership model** — Who owns the bespoke layer? The framework? Any non-compete clauses on adjacent merchants?
7. **Post-launch cadence** — Retainer-driven continuous improvement, or hand-off and client-maintained?

---

## 10. Sources (verified against Shopify developer docs, April 2026)

- Shopify app distribution overview — `shopify.dev/docs/apps/launch/distribution`
- Checkout UI extensions — `shopify.dev/docs/api/checkout-ui-extensions`
- Checkout UI extension targets — `shopify.dev/docs/api/checkout-ui-extensions/latest/targets`
- Customer Account UI extensions — `shopify.dev/docs/api/customer-account-ui-extensions`
- Customer Account extension targets — `shopify.dev/docs/api/customer-account-ui-extensions/latest/targets`
- Admin UI extension targets — `shopify.dev/docs/api/admin-extensions/latest/extension-targets`
- Session token API — `shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/session-token`
- Delivery Customization Function — `shopify.dev/docs/api/functions/reference/delivery-customization`
- Apps in checkout — `shopify.dev/docs/apps/build/checkout`
- App extensions overview — `shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions`
