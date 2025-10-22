# DelayGuard Developer Handbook

Last Updated: October 21, 2025

This handbook consolidates technical architecture and day-to-day developer guidance for DelayGuard.

## Architecture Overview

- Backend: Node.js 20+, Koa 2, TypeScript; PostgreSQL (Neon/Supabase); Redis (Upstash); BullMQ
- Frontend: React 18 + TypeScript; custom components; Redux Toolkit; Webpack
- Integrations: Shopify Admin GraphQL, ShipEngine, SendGrid, Twilio
- Deployment: Vercel serverless; OpenAPI docs served at `/docs` and `/api/swagger.json`
- Security: Security headers, CSRF protection, input sanitization, HMAC verification; A- rating

### High-Level Diagram

```
Shopify Webhooks → Koa API → Queue/Workers → External APIs
                     ↓
                 React UI
```

## Development

### Quick Start

```
cd delayguard-app
npm install

# Simple mode (no DB/Redis)
npm run dev

# Full mode (requires DB/Redis)
npm run dev:full
```

Key scripts: build (`build:*`), tests (`test:*`), lint (`lint:*`), type-check, db migrations (`db:migrate*`).

### Environment

Copy `env.example` to `.env` and fill values. For production, set variables in Vercel (see `PRODUCTION_SETUP.md`).

Critical vars for embedded auth:
- `SHOPIFY_API_SECRET` (JWT verification)
- `SHOPIFY_API_KEY` and `REACT_APP_SHOPIFY_API_KEY`

## Authentication (Embedded App)

- Session-token (JWT) based via Shopify App Bridge
- Backend validates tokens; routes protected with `requireAuth`
- Frontend uses `ShopifyProvider` and `useApiClient`

Endpoints (examples): `/api/alerts`, `/api/orders`, `/api/settings`, `/api/analytics`, `/api/health`

## Testing

- Jest + RTL; unit, integration, E2E, performance
- Nearly all suites passing; legacy EnhancedDashboard tests superseded by updated migration tests
- Run: `npm test`, `npm run test:coverage`, or targeted patterns

## Security & Compliance

- HMAC verification on webhooks; CSRF, input sanitization middleware
- GDPR webhooks implemented (`customers/data_request`, `customers/redact`, `shop/redact`)
- Billing system with plans and trial periods

## Observability

- Health checks, performance monitor, error tracking hooks
- Queue and cache metrics available in services

## Production & Deployment

- Use Vercel for hosting; configure environment variables
- Run migrations (`db:migrate:prod`); validate health and flows
- See `PRODUCTION_SETUP.md` for detailed steps

## File Map (Pointers)

- Server entry: `delayguard-app/src/server.ts`
- Routes: `delayguard-app/src/routes/*`
- Services: `delayguard-app/src/services/*`
- Components: `delayguard-app/src/components/*`
- Hooks: `delayguard-app/src/hooks/*`
- Store: `delayguard-app/src/store/*`
- Middleware: `delayguard-app/src/middleware/*`

## Contributor Guidelines

- Strict TypeScript; early returns; meaningful names; avoid deep nesting
- Tests first for new features; accessibility and performance considered
- Keep docs updated; generate API docs via scripts


