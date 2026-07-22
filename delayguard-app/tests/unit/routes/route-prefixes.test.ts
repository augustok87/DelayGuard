/**
 * Route-listing test — LAUNCH_PLAN A3 acceptance.
 *
 * Router files must NOT carry their own prefix (the mount point in
 * src/server.ts provides it). Canonical URLs:
 *   /api/*            (apiRoutes mounted at /api)
 *   /billing/*        (billingRoutes mounted at /billing)
 *   /webhooks/customers/data_request, /webhooks/customers/redact,
 *   /webhooks/shop/redact   (gdprRoutes mounted at /webhooks)
 *   /api/cron/*       (cron routers mounted at /api/cron)
 *
 * Before this fix the routers double-prefixed to /api/api/*,
 * /billing/billing/* and /webhooks/gdpr/*.
 */
import type Router from 'koa-router';
import { apiRoutes } from '../../../src/routes/api';
import { billingRoutes } from '../../../src/routes/billing';
import { gdprRoutes } from '../../../src/routes/gdpr';
import { webhookRoutes } from '../../../src/routes/webhooks';
import { trackingRefreshCronRoutes } from '../../../src/routes/tracking-refresh-cron';
import { queueSweepCronRoutes } from '../../../src/routes/queue-sweep-cron';

interface RouterLayer {
  path: string;
  methods: string[];
}

const layerPaths = (router: Router): string[] =>
  (router as unknown as { stack: RouterLayer[] }).stack.map((l) => l.path);

const routerPrefix = (router: Router): string | undefined =>
  (router as unknown as { opts?: { prefix?: string } }).opts?.prefix;

describe('A3 — no router-level prefixes (mount-point prefixes only)', () => {
  it('apiRoutes has no /api prefix and exposes canonical relative paths', () => {
    expect(routerPrefix(apiRoutes)).toBeUndefined();
    const paths = layerPaths(apiRoutes);
    for (const expected of [
      '/alerts',
      '/orders',
      '/settings',
      '/analytics',
      '/shop',
      '/merchant-settings',
      '/test-alert',
      '/health',
    ]) {
      expect(paths).toContain(expected);
    }
    expect(paths.some((p) => p.startsWith('/api/'))).toBe(false);
  });

  it('billingRoutes has no /billing prefix', () => {
    expect(routerPrefix(billingRoutes)).toBeUndefined();
    const paths = layerPaths(billingRoutes);
    for (const expected of ['/plans', '/subscription', '/subscribe', '/cancel', '/usage']) {
      expect(paths).toContain(expected);
    }
    expect(paths.some((p) => p.startsWith('/billing/'))).toBe(false);
  });

  it('gdprRoutes has no /gdpr prefix — GDPR topics sit directly under the /webhooks mount', () => {
    expect(routerPrefix(gdprRoutes)).toBeUndefined();
    const paths = layerPaths(gdprRoutes);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/customers/data_request',
        '/customers/redact',
        '/shop/redact',
      ]),
    );
    expect(paths.some((p) => p.startsWith('/gdpr/'))).toBe(false);
  });

  it('webhookRoutes exposes Shopify topics relative to the /webhooks mount', () => {
    const paths = layerPaths(webhookRoutes);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/orders/updated',
        '/fulfillments/updated',
        '/orders/paid',
      ]),
    );
  });

  it('cron routers expose relative paths for the /api/cron mount (GET + POST each)', () => {
    const trackingLayers = (
      trackingRefreshCronRoutes as unknown as { stack: RouterLayer[] }
    ).stack;
    const trackingMethods = trackingLayers
      .filter((l) => l.path === '/tracking-refresh')
      .flatMap((l) => l.methods);
    expect(trackingMethods).toEqual(expect.arrayContaining(['GET', 'POST']));

    const sweepPaths = layerPaths(queueSweepCronRoutes);
    expect(sweepPaths).toEqual(
      expect.arrayContaining([
        '/delay-check',
        '/notification-dispatch',
        '/customer-sync',
      ]),
    );
    expect(sweepPaths.some((p) => p.startsWith('/api/'))).toBe(false);
  });
});
