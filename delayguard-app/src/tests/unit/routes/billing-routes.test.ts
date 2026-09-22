/**
 * Billing routes tests — LAUNCH_PLAN WS-F F1.
 *
 * With Shopify App Pricing (Managed Pricing), plans are configured in the
 * Partner Dashboard and Shopify hosts the plan-selection/charge flow. The
 * app-side billing surface is therefore read-only:
 *   GET /billing/plans — static plan catalog (public).
 *
 * The old stub charge flow (/subscribe, /callback, /cancel, /usage,
 * /subscription — "test-charge-id", local subscriptions writes) is deleted;
 * these tests pin that the endpoints are gone.
 *
 * The router is prefix-free; the test mounts it at /billing exactly like
 * src/server.ts does, which asserts the canonical single-prefix URL
 * (no /billing/billing/* double prefix).
 */

import request from 'supertest';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

jest.mock('../../../database/connection');
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { billingRoutes } from '../../../routes/billing';

describe('Billing routes', () => {
  let app: Koa;

  beforeEach(() => {
    app = new Koa();
    app.use(bodyParser());
    const root = new Router();
    root.use('/billing', billingRoutes.routes(), billingRoutes.allowedMethods());
    app.use(root.routes());
    app.use(root.allowedMethods());
    jest.clearAllMocks();
  });

  describe('GET /billing/plans', () => {
    it('returns the App Pricing plan catalog at the single-prefix URL', async() => {
      const response = await request(app.callback())
        .get('/billing/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.plans.free.price).toBe(0);
    });

    /**
     * The Pro ($7) and Enterprise ($25) plans were DELETED from Shopify App
     * Pricing in v1.80 — the app is free-only and the live App Store listing
     * carries exactly one plan, "Free". This endpoint is public and
     * unauthenticated, so until v1.81 anyone (a reviewer included) could read
     * a catalog advertising two tiers that cannot be subscribed to. Selling a
     * plan Shopify does not have is a rejection, and a rejection costs a full
     * review cycle.
     *
     * This asserts on the whole payload rather than on the two names that
     * happen to exist today: a future tier added to the catalog but not to
     * the Partner Dashboard is the same defect under a different key.
     */
    it('advertises no paid plan and no price above zero', async() => {
      const response = await request(app.callback())
        .get('/billing/plans')
        .expect(200);

      const plans = response.body.plans as Record<
        string,
        { price: number; trial_days?: number }
      >;

      expect(Object.keys(plans)).toEqual(['free']);
      for (const [tier, plan] of Object.entries(plans)) {
        expect([tier, plan.price]).toEqual([tier, 0]);
      }
      expect(JSON.stringify(plans)).not.toMatch(/enterprise/i);
    });

    it('does not respond on the old double-prefixed path', async() => {
      await request(app.callback()).get('/billing/billing/plans').expect(404);
    });
  });

  describe('stub charge flow is deleted', () => {
    it.each([
      ['post', '/billing/subscribe'],
      ['get', '/billing/callback'],
      ['post', '/billing/cancel'],
      ['get', '/billing/usage'],
      ['get', '/billing/subscription'],
    ] as const)('%s %s no longer exists', async(method, path) => {
      const response = await request(app.callback())[method](path);
      expect(response.status).toBe(404);
    });
  });
});
