/**
 * Real-app integration tests — WS-A acceptance criteria (LAUNCH_PLAN A1–A4).
 *
 * Boots the ACTUAL configured Koa app from src/server.ts and exercises the
 * full middleware chain end-to-end. (This suite superseded a set of
 * tautological tests against a hardcoded stub fixture, deleted 2026-07-29 —
 * they asserted only that the fixture returned its own constants, covered no
 * production code, and were the source of the order-dependent flakiness that
 * destabilized the pre-commit gate. See LAUNCH_PLAN.md §6 R5.)
 *
 * - A1: /health is Koa-served and honest (real Postgres/Redis pings,
 *   measured latencies — no fake response_time: 0).
 * - A2: /webhooks* and /api/cron/* are exempt from CSRF; a tokenless
 *   webhook POST reaches the HMAC check (401, NOT 403-CSRF); CSP allows
 *   Shopify admin framing; X-Frame-Options is gone; /api/* is guarded by
 *   the session-token middleware.
 * - A3: canonical single-prefix routes (/api/*, /billing/*,
 *   /webhooks/customers/*); the old double-prefixed paths 404.
 * - A4: /api/cron/tracking-refresh is mounted and guarded by CRON_SECRET.
 *
 * pg and ioredis are globally mocked (see jest.config moduleNameMapper),
 * so "healthy" here means the middleware/service wiring is correct.
 */
import request from 'supertest';

process.env.CRON_SECRET = 'test-cron-secret';

// The tracking-refresh processor hits ShipEngine + Postgres for real; the
// cron route contract (auth → invoke processor → 200 stats) is what A4
// verifies, so the processor itself is mocked.
jest.mock('../../src/queue/processors/tracking-refresh', () => ({
  processTrackingRefresh: jest
    .fn()
    .mockResolvedValue({ ordersProcessed: 0, eventsStored: 0, errors: 0 }),
}));

import { app } from '../../src/server';
import { setupDatabase } from '../../src/database/connection';
import { processTrackingRefresh } from '../../src/queue/processors/tracking-refresh';

const callback = app.callback();

describe('server.ts real app (WS-A)', () => {
  beforeAll(async() => {
    // Initialize the (mocked) pg pool so /health reports database healthy.
    await setupDatabase();
  });

  describe('A2 — webhooks reach HMAC verification, not CSRF', () => {
    it('tokenless POST /webhooks/orders/updated → 401 HMAC rejection (NOT 403-CSRF)', async() => {
      const res = await request(callback)
        .post('/webhooks/orders/updated')
        .send({ id: 123 });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('tokenless POST /webhooks/customers/redact → 401 HMAC rejection (GDPR, canonical path)', async() => {
      const res = await request(callback)
        .post('/webhooks/customers/redact')
        .send({ shop_domain: 'x.myshopify.com' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('POST /api/cron/tracking-refresh without secret → 401 cron rejection (NOT 403-CSRF)', async() => {
      const res = await request(callback).post('/api/cron/tracking-refresh');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('A2 — embedded-app response headers', () => {
    // R6. The framed document is `/`, and the directive must name the one
    // shop — a wildcard would let any Shopify store frame the app.
    it('the app document carries a shop-specific frame-ancestors', async() => {
      const res = await request(callback).get(
        '/?shop=delayguard-dev.myshopify.com&embedded=1',
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['content-security-policy']).toContain(
        'frame-ancestors https://delayguard-dev.myshopify.com https://admin.shopify.com',
      );
      expect(res.headers['content-security-policy']).not.toContain(
        '*.myshopify.com',
      );
    });

    it('a shop it cannot trust never reaches the header', async() => {
      const res = await request(callback).get(
        `/?shop=${encodeURIComponent('evil.com; frame-ancestors *')}`,
      );

      expect(res.headers['content-security-policy']).toContain(
        "frame-ancestors 'none'",
      );
      expect(res.headers['content-security-policy']).not.toContain('evil.com');
    });

    it('X-Frame-Options is no longer sent', async() => {
      const res = await request(callback).get('/health');

      expect(res.headers['x-frame-options']).toBeUndefined();
    });
  });

  describe('A2 — session-token auth still guards /api/*', () => {
    it('GET /api/alerts without a session token → 401', async() => {
      const res = await request(callback).get('/api/alerts');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_AUTH_HEADER');
    });
  });

  describe('A3 — canonical single-prefix routes', () => {
    it('GET /billing/plans → 200 (single prefix)', async() => {
      const res = await request(callback).get('/billing/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.plans).toBeDefined();
    });

    it('old double-prefixed paths are gone', async() => {
      await request(callback).get('/billing/billing/plans').expect(404);
      await request(callback).get('/api/api/alerts').expect(404);
      await request(callback)
        .post('/webhooks/gdpr/customers/redact')
        .expect(404);
    });
  });

  describe('A1 — honest Koa-served /health', () => {
    it('returns per-service statuses with measured latencies', async() => {
      const res = await request(callback).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.services.database.status).toBe('healthy');
      expect(typeof res.body.services.database.responseTimeMs).toBe('number');
      expect(res.body.services.redis.status).toBe('healthy');
      expect(typeof res.body.services.redis.responseTimeMs).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('H-1 — legal pages mounted on the real app', () => {
    it('GET /legal/privacy-policy → 200 HTML', async() => {
      const res = await request(callback).get('/legal/privacy-policy');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Privacy Policy');
    });

    it('GET /legal/terms-of-service → 200 HTML', async() => {
      const res = await request(callback).get('/legal/terms-of-service');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Terms of Service');
    });

    it('GET /legal/<unknown> → 404', async() => {
      await request(callback).get('/legal/does-not-exist').expect(404);
    });
  });

  describe('A4 — cron route auth', () => {
    it('wrong secret → 401', async() => {
      const res = await request(callback)
        .post('/api/cron/tracking-refresh')
        .set('Authorization', 'Bearer wrong-secret');

      expect(res.status).toBe(401);
    });

    it('correct secret → 200 with stats (POST)', async() => {
      const res = await request(callback)
        .post('/api/cron/tracking-refresh')
        .set('Authorization', 'Bearer test-cron-secret');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toEqual({
        ordersProcessed: 0,
        eventsStored: 0,
        errors: 0,
      });
      expect(processTrackingRefresh).toHaveBeenCalled();
    });

    it('correct secret → 200 (GET — Vercel Cron invokes with GET)', async() => {
      const res = await request(callback)
        .get('/api/cron/tracking-refresh')
        .set('Authorization', 'Bearer test-cron-secret');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
