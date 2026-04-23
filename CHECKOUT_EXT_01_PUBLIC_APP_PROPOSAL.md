> ### Purpose of this document
>
> **This is interview preparation material, not part of the DelayGuard project roadmap.**
>
> - **Why it exists**: prep for a technical interview about Shopify Checkout Extensibility for a potential engagement at a different company.
> - **Role of DelayGuard here**: used as a concrete reference point — the author's own Shopify app, currently pre-launch — to illustrate architecture and capability. DelayGuard itself is not being proposed to the interviewer.
> - **Author**: Joong Kwun — augustok87@gmail.com
>
> **Companion files (all interview-prep only):**
> - `CHECKOUT_EXT_01_PUBLIC_APP_PROPOSAL.md` — *this file* — public SaaS distribution path
> - `CHECKOUT_EXT_02_PRIVATE_PREMIUM_PROPOSAL.md` — single-merchant bespoke path
> - `CHECKOUT_EXT_03_ARCHITECTURE_DESIGN.md` — technical architecture reference

---

# DelayGuard × Shopify Checkout Extensibility

**A staged plan to surface DelayGuard's tracking and delay-detection data across every Shopify extension surface — checkout, thank-you, order status, customer account, admin, and Shopify Functions.**

Prepared by: Joong Kwun
Date: April 2026
Audience: Interview technical deep-dive

---

## TL;DR

DelayGuard is a post-purchase shipping-delay alert app. Today it exists as a **Koa/Postgres/BullMQ backend + embedded admin UI**. All of its data — per-order tracking events, ETA deltas, carrier reliability, delay alerts — sits behind a single surface (the admin app) that neither customers nor merchants see in context.

Shopify's Checkout Extensibility model (which fully replaced `checkout.liquid` in 2025) lets us push that data exactly where it already has demand:

1. **Customer Account → Order Status** — real-time delay status and tracking timeline on the page customers already refresh looking for "where is my order"
2. **Customer Account → Order page** — full tracking and delay-alert history inside the native Shop account
3. **Thank-you page** — first-impression ETA confidence immediately after purchase
4. **Shopify Admin → Order details** — inline DelayGuard block so merchants stop context-switching between apps
5. **Pre-purchase checkout (Plus-gated)** — aggregate carrier reliability as a conversion trust signal
6. **Shopify Functions → Delivery Customization** — auto-hide shipping methods whose recent delay rate exceeds merchant threshold

The existing backend already has everything required to power all six. The work is extension bundles, one new public API endpoint, and session-token JWT verification — the last of which DelayGuard's embedded admin already does.

---

## 1. What DelayGuard Already Has

| Capability | Implementation | Re-usable for extensions? |
|---|---|---|
| Shopify OAuth install flow | `@shopify/shopify-api` v8, offline tokens per shop in Postgres | Yes — same install ships extensions |
| Shopify Admin GraphQL (2024-01) | Per-shop client, orders + fulfillments | Yes — extensions call our backend, backend calls Admin API |
| Session token JWT verification | Koa middleware for embedded admin | Yes — identical pattern for extension → backend auth |
| HMAC-verified webhooks | `orders/updated`, `fulfillments/updated` | Yes — already populates the data extensions will read |
| ShipEngine integration | Tracking events, ETAs, carrier status | Yes — core data source for every extension |
| SendGrid + Twilio | Delay notifications | Complements extensions — doesn't replace |
| Postgres schema | `orders`, `fulfillments`, `delay_alerts`, `tracking_events`, `order_line_items` | Yes — all queryable per-order for extension payloads |
| BullMQ + Redis | `delay-check`, `notifications` queues | Yes — extensions trigger nothing new here |
| Vercel Cron | Daily `/api/cron/tracking-refresh` | Yes — keeps ETA data fresh for extensions |

**Gap to fill**: one new public endpoint — `GET /api/public/orders/:orderId/delay-status` — that returns the shape extensions need. Auth by session token JWT (same middleware).

**Pre-launch honesty**: DelayGuard is feature-complete but not yet on the App Store. Extensions would ship as part of the first public version, not as a post-launch add-on.

---

## 2. Shopify Extensibility Surfaces — Verified Map

All target names and constraints below are verified against Shopify's current (2026-04) developer documentation.

### 2.1 Checkout UI extensions

Framework: **Preact** (default since the 2025 modernization). Package: `@shopify/ui-extensions/preact`. API version: `2026-01`. Bundle size: **64 KB compiled max**, enforced at deploy.

Confirmed targets relevant to DelayGuard:

| Target | Where it renders | Plan required |
|---|---|---|
| `purchase.checkout.block.render` | Anywhere merchant places it in the checkout editor | **Shopify Plus** |
| `purchase.checkout.delivery-address.render-before` | Between shipping address header and form | **Shopify Plus** |
| `purchase.checkout.cart-line-item.render-after` | Inside each line item's details block | **Shopify Plus** |
| `purchase.thank-you.block.render` | Thank-you page after payment | All plans except Starter |

### 2.2 Customer Account UI extensions

Framework: Preact. Package: `@shopify/ui-extensions/preact`. API version: `2026-04`.

Confirmed targets:

| Target | Where it renders | Plan required |
|---|---|---|
| `customer-account.order-status.block.render` | Order Status page | All plans except Starter |
| `customer-account.order.page.render` | New full page tied to an order | All plans except Starter |
| `customer-account.order-index.block.render` | Block on the order list | All plans except Starter |
| `customer-account.profile.block.render` | Customer profile page | All plans except Starter |

### 2.3 Admin UI extensions

Framework: Preact. API version: admin latest.

Confirmed targets:

| Target | Where it renders |
|---|---|
| `admin.order-details.block.render` | Order detail admin page |
| `admin.order-details.action.render` | Action menu on order detail |
| `admin.product-details.block.render` | Product detail admin page |

### 2.4 Shopify Functions

| Function | Capabilities | Language |
|---|---|---|
| **Delivery Customization** | Hide / rename / reorder shipping methods at checkout. Max 25 active per store. | Rust or JavaScript |

### 2.5 Theme App Extensions (App Blocks)

Liquid blocks merchants drop into their storefront themes. Useful for pre-cart trust widgets sourced from DelayGuard aggregate data (not covered in core proposal; listed for completeness).

---

## 3. Proposed Implementation — Five Phases

Sequenced by **plan reach × implementation risk × merchant value**. Phase 1 ships to every merchant on every plan except Starter; Phase 4 is Plus-gated.

### Phase 1 — Customer Account Order Status extension

**What it does**: Customer opens an order in their Shop account. A DelayGuard block renders current tracking status, last-known location, latest carrier event, current ETA vs. original ETA, and a color-coded status badge (on-track / at-risk / delayed).

**Target**: `customer-account.order-status.block.render`

**Why Phase 1**:
- Broadest plan reach (available to every plan except Starter)
- Lowest implementation risk — Customer Account extensions have a generous API surface and no payment-data restrictions
- Highest intent match — this is the page customers hit when they're anxious about their order
- Directly addresses DelayGuard's #1 merchant value prop: reducing "where is my order" support tickets

**Backend work**: one new endpoint, `GET /api/public/orders/:orderId/delay-status`. Uses existing session-token JWT middleware. Reads from `orders`, `tracking_events`, `delay_alerts`. Returns:

```ts
{
  status: 'on_track' | 'at_risk' | 'delayed',
  originalEta: string,  // ISO
  currentEta: string,
  delayDays: number,
  lastEvent: { timestamp, status, location, carrierStatus },
  events: Array<{...}>,  // recent 10
  alerts: Array<{ type: 'warehouse' | 'carrier' | 'transit', createdAt }>
}
```

**Estimated effort**: 3–5 engineering days.

### Phase 2 — Customer Account full-page Order Details

**What it does**: Full-page extension that shows complete delay history, tracking event timeline, and merchant-configured next-step guidance (e.g. "If your order is delayed by more than 5 days, you're eligible for a discount code").

**Target**: `customer-account.order.page.render`

**Why Phase 2**: Builds on Phase 1 data. No new backend endpoint needed. Unlocks discount/workflow logic that's on DelayGuard's Phase 2 internal roadmap anyway.

**Estimated effort**: 3 days (pure frontend on top of Phase 1 endpoint).

### Phase 3 — Admin UI extension on Order Details

**What it does**: Merchant viewing an order in Shopify admin sees an inline DelayGuard block: current delay status, recent tracking events, any triggered alerts, link to full DelayGuard dashboard.

**Target**: `admin.order-details.block.render`

**Why Phase 3**: Removes context-switching. Merchants today have to leave Shopify admin, open DelayGuard embedded app, search for the order. This collapses it into the flow they already use.

**Estimated effort**: 2–3 days. Reuses the Phase 1 endpoint (auth is session token JWT in both cases).

### Phase 4 — Pre-purchase shipping confidence (Plus only)

**What it does**: During checkout, between the shipping address fields, render: "Orders shipped to your area via FedEx arrive on time 94% of the time (based on 847 recent orders)." Aggregate carrier × destination reliability drawn from DelayGuard's historical `tracking_events` and `delay_alerts`.

**Target**: `purchase.checkout.delivery-address.render-before`

**Why Phase 4**: Turns DelayGuard from a retention/support tool into a **pre-purchase conversion tool**. Differentiates the app from competitors that only surface after-purchase.

**Constraints**:
- **Shopify Plus only**. Must be gated by merchant plan at install time.
- 64 KB bundle cap — aggregate data fetch must be server-rendered; extension only renders the payload.
- No payment data access (by design).

**New backend work**: `GET /api/public/shipping-confidence?destination=<zip>&carriers=<list>`. Cached at CDN edge, refreshed daily.

**Estimated effort**: 5–7 days including aggregation queries and cache layer.

### Phase 5 — Delivery Customization Function (Plus only, pairs with Phase 4)

**What it does**: Automatically hide or deprioritize shipping methods that DelayGuard data shows have an elevated delay rate over a rolling 30-day window. Merchant-configurable threshold.

**Type**: Shopify Function — Delivery Customization (Rust or JavaScript).

**Constraints**:
- Plus only (delivery customization is Plus-gated).
- Max 25 active delivery customizations per store — ours is one.
- The cheapest shipping option must always render first — we can reorder but not violate that rule.

**Estimated effort**: 4 days. Function runs server-side at checkout; reads merchant configuration from DelayGuard backend via Shopify's Function Run input.

### Phase not-recommended — Post-Purchase extension

Shopify's legacy post-purchase extension (a single-use page between checkout and thank-you) still exists as a distinct type and requires **Shopify review/approval**. Recommendation: skip it. The thank-you-page block extension (`purchase.thank-you.block.render`) covers the same surface with broader reach and no approval gate.

---

## 4. Reference Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Shopify surfaces                                               │
│   Checkout → Thank-You → Order Status → Customer Account       │
│   Shopify Admin Order Details                                  │
└────────────────────────────────────────────────────────────────┘
                      │
                      │ Preact extension (sandboxed, 64 KB max)
                      │ @shopify/ui-extensions/preact
                      │ Components: s-banner, s-stack, s-text...
                      │
                      │ useSessionToken().get()  →  JWT (5-min TTL)
                      │
                      ▼  fetch('https://delayguard-api.vercel.app/...',
                                { headers: { Authorization: `Bearer ${jwt}` }})
┌────────────────────────────────────────────────────────────────┐
│ DelayGuard backend (Koa on Vercel)                             │
│                                                                │
│   middleware/shopify-session.ts                                │
│     verifies JWT with SHOPIFY_API_SECRET                       │
│                                                                │
│   routes/public.ts (NEW)                                       │
│     GET /api/public/orders/:orderId/delay-status               │
│     GET /api/public/shipping-confidence  (Phase 4)             │
│                                                                │
│   services/                                                    │
│     shopify-service  (Admin GraphQL, 2024-01)                  │
│     carrier-service  (ShipEngine)                              │
└────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ Postgres                                                       │
│   shops · orders · fulfillments · delay_alerts                 │
│   tracking_events · order_line_items · app_settings            │
└────────────────────────────────────────────────────────────────┘

Existing async paths (unchanged):
   Shopify webhooks → HMAC verify → BullMQ delay-check → notifications
   Vercel Cron → /api/cron/tracking-refresh → ShipEngine sync
```

---

## 5. Extension Skeleton (Phase 1)

### 5.1 `extensions/order-status-delay/shopify.extension.toml`

```toml
api_version = "2026-04"

[[extensions]]
name = "DelayGuard Order Status"
handle = "order-status-delay"
type = "ui_extension"

[[extensions.targeting]]
module = "./src/OrderStatusBlock.tsx"
target = "customer-account.order-status.block.render"

[extensions.capabilities]
network_access = true
api_access = true
```

### 5.2 `extensions/order-status-delay/src/OrderStatusBlock.tsx`

```tsx
import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

const API_BASE = 'https://delayguard-api.vercel.app';

export default async () => {
  render(<DelayStatus />, document.body);
};

function DelayStatus() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // useSessionToken() hook provides a cached 5-min JWT
        const token = await shopify.sessionToken.get();
        const orderId = shopify.order.current.id;
        const res = await fetch(
          `${API_BASE}/api/public/orders/${orderId}/delay-status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(await res.json());
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (error) return <s-banner tone="critical">{error}</s-banner>;
  if (!data) return <s-text>Loading delivery status…</s-text>;

  const tone =
    data.status === 'delayed' ? 'critical' :
    data.status === 'at_risk' ? 'warning' : 'success';

  return (
    <s-stack direction="block" gap="base">
      <s-banner tone={tone}>
        <s-heading>
          {data.status === 'on_track' ? 'On track' :
           data.status === 'at_risk' ? 'Possible delay detected' :
                                       `Delayed ${data.delayDays} days`}
        </s-heading>
        <s-text>
          Estimated arrival: {formatDate(data.currentEta)}
          {data.delayDays > 0 &&
            ` (originally ${formatDate(data.originalEta)})`}
        </s-text>
      </s-banner>
      <TrackingTimeline events={data.events} />
    </s-stack>
  );
}
```

*Illustrative — exact component API and global `shopify` namespace follow the Preact-based extension model. Final component names will match the current `s-*` vocabulary at implementation time.*

### 5.3 Koa endpoint

```ts
// src/routes/public.ts
import Router from '@koa/router';
import { verifyShopifySessionToken } from '../middleware/shopify-session';

const router = new Router({ prefix: '/api/public' });

router.get(
  '/orders/:orderId/delay-status',
  verifyShopifySessionToken,  // existing middleware — no new auth code
  async (ctx) => {
    const { orderId } = ctx.params;
    const { shop } = ctx.state.session;
    ctx.body = await getOrderDelayStatus(shop, orderId);
  }
);
```

---

## 6. Plan-Tier Matrix (what ships to whom)

| Phase | Extension type | Plans reached | Gated? |
|---|---|---|---|
| 1. Order Status block | Customer Account UI | All except Starter | No |
| 2. Order full-page | Customer Account UI | All except Starter | No |
| 3. Admin order block | Admin UI | All plans | No |
| 4. Pre-purchase confidence | Checkout UI | **Shopify Plus only** | Yes, at install |
| 5. Delivery Customization | Shopify Function | **Shopify Plus only** | Yes, at install |
| 6. Thank-you block *(optional)* | Checkout UI | All except Starter | No |

**Implication**: Phases 1–3 (and optional 6) give DelayGuard extension value to **~95%+ of installable merchants**. Phases 4–5 are upmarket-only, pitched as a Plus tier.

---

## 7. Constraints & Gotchas (things I'd stay ahead of)

| Constraint | Impact | Mitigation |
|---|---|---|
| 64 KB compiled bundle per extension | Hard limit at deploy | Preact (not React) keeps us small; server-render data, not logic |
| Sandbox — no DOM, no CSS overrides, no arbitrary HTML | Styling is component-vocabulary only | Lean into Shopify's design primitives; don't fight the sandbox |
| Session token TTL 5 min | Need fresh token per request | `sessionToken.get()` is cached + auto-refreshes — don't hand-roll |
| Plus gating for pre-purchase | Phase 4 invisible to non-Plus | Gate at install; Phases 1–3 still deliver value |
| Delivery Function max 25/store | Low risk (we need one) | Check on install, fail gracefully |
| Post-purchase extension requires Shopify approval | Time + risk | Avoid — use thank-you block instead |
| API version lifecycle | Breaking changes on ~12mo cadence | Pin API version in TOML; plan quarterly upgrade checks |
| Extension → our backend is cross-origin | CORS | Whitelist `shop.app` and extension origins on the public routes only |
| Customer PII in extension responses | Compliance | Backend filters by session-token `shop` claim — extension can never request another shop's data |

---

## 8. Rollout Plan

**Total estimated effort: 4–6 weeks for Phases 1–3 (the value-dense phases), shipped as part of DelayGuard v2.0 alongside App Store submission.**

| Week | Work |
|---|---|
| 1 | New `extensions/` workspace; `shopify.extension.toml` for Phase 1; scaffold Preact bundle; local dev against dev store |
| 2 | Phase 1 endpoint + extension wiring; JWT middleware contract test; session token auth E2E |
| 3 | Phase 2 full-page extension; Phase 1 polish; accessibility pass |
| 4 | Phase 3 admin extension; reuse Phase 1 endpoint |
| 5 | Phase 6 thank-you block (optional); end-to-end test matrix across plans (non-Plus dev store + Plus dev store) |
| 6 | Submission readiness: bundle size audits, API version pinning, CORS review, Shopify App Store listing updates |

Phases 4 + 5 deferred to v2.1 (Plus tier launch) — separate 2–3 week block.

---

## 9. Honest Context

I have not shipped a Checkout UI, Customer Account, or Admin UI extension to production. My Shopify production work to date is:
- Theme architecture (Liquid, Tinker, metaobjects, sections/blocks) on live merchant-serving stores (bluatlas.com, supply.co)
- Custom Shopify app backend with OAuth, Admin GraphQL, HMAC webhooks, and embedded admin UI (DelayGuard — pre-launch)

The extension model is not foreign to me: DelayGuard already uses the same session-token JWT verification middleware that extension → backend auth requires, and the Preact component model maps directly onto Web Components. The ramp to shipping my first extension is **days, not weeks**.

What I'd ask to move fastest:
1. A Shopify Plus dev store for Phase 4–5 testing
2. Clarity on whether the team wants Rust or JavaScript for Shopify Functions
3. A decision on post-purchase extension appetite (my recommendation: skip — thank-you block wins)

---

## 10. Sources (verified against Shopify developer docs, April 2026)

- Checkout UI extensions overview — `shopify.dev/docs/api/checkout-ui-extensions`
- Checkout UI extension targets — `shopify.dev/docs/api/checkout-ui-extensions/latest/targets`
- Customer Account UI extension targets — `shopify.dev/docs/api/customer-account-ui-extensions/latest/targets`
- Admin UI extension targets — `shopify.dev/docs/api/admin-extensions/latest/extension-targets`
- Session token API — `shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/session-token`
- Delivery Customization Function — `shopify.dev/docs/api/functions/reference/delivery-customization`
- App extension types — `shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions`
- Apps in checkout (plan requirements) — `shopify.dev/docs/apps/build/checkout`
