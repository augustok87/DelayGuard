# Shopify Release Guide

Last Updated: October 21, 2025

This guide consolidates the readiness report and submission checklist into one operational document.

## Readiness Snapshot

- Mandatory requirements: GDPR webhooks, OAuth, billing → COMPLETE
- Performance: ~35ms average response; optimized bundle; load‑tested
- Security: A‑ rating; HMAC, CSRF, sanitization, headers; rate limiting ready
- Legal: Privacy Policy and Terms of Service complete and dated

Remaining (operational):
- Generate/resize assets; configure production env; Shopify Partner setup; final dev‑store testing

## Required Assets (2025)

- App icon: 1200×1200 (PNG/JPEG)
- Feature media: 1600×900 image OR 2–3 min promo video
- Screenshots: 5–10 at 1600×1200
- Key benefits images (recommended): 1600×1200

See `app-store-assets/README.md` for generation steps.

## Production Setup (Essentials)

1) Infrastructure
- PostgreSQL (Neon/Supabase) and Redis (Upstash)
- ShipEngine, SendGrid, Twilio keys

2) Environment variables (Vercel)
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `REACT_APP_SHOPIFY_API_KEY`, `SHOPIFY_SCOPES`
- `DATABASE_URL`, `REDIS_URL`
- External API keys (ShipEngine/SendGrid/Twilio)

3) Deployment
- `vercel --prod`; run migrations; verify health and logs

## Shopify Partner Configuration

- App URL: `https://<your-app>.vercel.app`
- Redirect URLs: `/auth/callback`, `/billing/callback`
- Embedded: Yes; scopes: read/write orders/fulfillments, read products/customers
- Webhooks:
  - orders/updated, fulfillments/updated, orders/paid
  - GDPR: customers/data_request, customers/redact, shop/redact

## Final Test Plan (Dev Store)

- Install app; complete OAuth; ensure embedded loads without separate login
- Verify authenticated API calls (Authorization: Bearer <session token>)
- Test GDPR endpoints (HMAC enforced) and billing subscribe/cancel flow
- Create order with simulated delay; verify alerting and analytics
- Validate settings persistence; uninstall flow and data cleanup

## Submission Checklist

- [ ] Icon 1200×1200 uploaded
- [ ] Feature media (1600×900) or promo video uploaded
- [ ] 5–10 screenshots (1600×1200) uploaded
- [ ] App description, benefits, pricing completed
- [ ] Privacy Policy and Terms URLs provided
- [ ] Emergency contact (email + phone) present
- [ ] Production environment configured and verified
- [ ] All webhooks and scopes configured
- [ ] Dev store end‑to‑end tests passed

## Common Rejection Risks (Mitigation)

- Missing GDPR/billing → Implemented and tested
- Poor performance/security → Exceeds requirements (A‑, ~35ms)
- Incomplete assets → Follow dimensions; generate from templates

## Time Estimate

- Assets: 2–4 hours
- Env + Shopify config: 3–4 hours
- Testing + submission: 2–3 hours

Total: ~8–12 hours to ship


