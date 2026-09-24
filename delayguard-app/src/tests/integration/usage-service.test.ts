/**
 * Per-shop usage measurement (cost visibility, pre-paid-tier).
 *
 * The free plan advertises `monthly_alert_limit: 50` in three config files and
 * nothing anywhere counts anything, so the limit is documentation rather than a
 * mechanism. Before any cap can be enforced honestly, the two numbers have to
 * be observable — and they are different numbers:
 *
 *   - **alertsThisMonth** is the OUTPUT. It is what a 50-alert cap would limit,
 *     and what a merchant would perceive as their usage.
 *   - **ordersMonitored** is the COST DRIVER, and it is the one that actually
 *     sets the infrastructure bill. `delay-check-sweep` scans every undelivered
 *     order from the last 30 days whether or not it produces an alert, so a shop
 *     with 50,000 quiet orders costs Redis commands, Neon compute and Vercel
 *     invocations on all 50,000 while sending nothing.
 *
 * Capping only the first would limit what the merchant sees while leaving the
 * bill untouched. That is why both are collected.
 *
 * `ordersMonitored` deliberately mirrors the sweep's own candidate predicate —
 * not delivered, created inside 30 days, shop still installed. A usage figure
 * that counts a different population than the job doing the work would be a
 * number that looks precise and means nothing.
 *
 * Counted against pg-mem rather than `__mocks__/pg.js`, which answers every
 * statement `rowCount: 1` without reading the WHERE clause — under that stub a
 * GROUP BY that bucketed two shops together would be indistinguishable from one
 * that separated them.
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, execSql } from '../helpers/pg-mem-schema';
import { collectShopUsage } from '../../services/usage-service';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

/** Fixed clock: "now" is mid-month, so last month is unambiguously outside it. */
const NOW = new Date('2026-09-20T12:00:00Z');

const BUSY = 'busy-shop.myshopify.com';
const QUIET = 'quiet-shop.myshopify.com';
const GONE = 'uninstalled-shop.myshopify.com';

function seed(): void {
  for (const t of ['delay_alerts', 'orders', 'app_settings', 'shops']) {
    execSql(`DELETE FROM ${t}`);
  }

  execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, uninstalled_at)
           VALUES (1, '${BUSY}',  'tok', ARRAY['read_orders'], NULL),
                  (2, '${QUIET}', 'tok', ARRAY['read_orders'], NULL),
                  (3, '${GONE}',  'tok', ARRAY['read_orders'], '2026-09-01T00:00:00Z')`);

  // BUSY: 3 monitorable orders, 1 delivered, 1 too old to be swept.
  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, status, tracking_status, created_at)
           VALUES (1, 1, 'A1', '#1', 'Ada',  'unfulfilled', NULL,        '2026-09-18T10:00:00Z'),
                  (2, 1, 'A2', '#2', 'Ada',  'unfulfilled', 'IN_TRANSIT','2026-09-17T10:00:00Z'),
                  (3, 1, 'A3', '#3', 'Ada',  'unfulfilled', NULL,        '2026-09-10T10:00:00Z'),
                  (4, 1, 'A4', '#4', 'Ada',  'fulfilled',   'DELIVERED', '2026-09-16T10:00:00Z'),
                  (5, 1, 'A5', '#5', 'Ada',  'unfulfilled', NULL,        '2026-07-01T10:00:00Z')`);

  // QUIET: installed, one monitorable order, no alerts.
  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, status, tracking_status, created_at)
           VALUES (6, 2, 'B1', '#6', 'Grace', 'unfulfilled', NULL, '2026-09-19T10:00:00Z')`);

  // GONE: uninstalled, but its rows survive until shop/redact arrives.
  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, status, tracking_status, created_at)
           VALUES (7, 3, 'C1', '#7', 'Hopper', 'unfulfilled', NULL, '2026-09-19T10:00:00Z')`);

  // Alerts: 2 for BUSY this month, 1 for BUSY last month, 1 for the gone shop.
  execSql(`INSERT INTO delay_alerts (id, order_id, delay_days, delay_reason, created_at)
           VALUES (1, 1, 3, 'WAREHOUSE_DELAY', '2026-09-05T10:00:00Z'),
                  (2, 2, 4, 'TRANSIT_DELAY',   '2026-09-19T10:00:00Z'),
                  (3, 3, 2, 'WAREHOUSE_DELAY', '2026-08-28T10:00:00Z'),
                  (4, 7, 2, 'WAREHOUSE_DELAY', '2026-09-19T10:00:00Z')`);
}

async function usageFor(shopDomain: string) {
  const rows = await collectShopUsage(NOW);
  return rows.find(r => r.shopDomain === shopDomain);
}

describe('collectShopUsage — the two numbers a free tier has to know', () => {
  beforeAll(applyProductionSchema);
  beforeEach(seed);

  describe('alertsThisMonth — the output a cap would limit', () => {
    it('counts this calendar month only, not last month', async() => {
      expect((await usageFor(BUSY))?.alertsThisMonth).toBe(2);
    });

    it('reports zero for an installed shop that has raised none', async() => {
      expect((await usageFor(QUIET))?.alertsThisMonth).toBe(0);
    });
  });

  describe('ordersMonitored — the cost driver the bill actually follows', () => {
    it("counts the same population the sweep scans, not every order", async() => {
      // 5 orders exist for BUSY; one is DELIVERED and one is older than 30 days.
      expect((await usageFor(BUSY))?.ordersMonitored).toBe(3);
    });

    it('is independent of how many alerts were raised', async() => {
      const quiet = await usageFor(QUIET);
      expect(quiet?.alertsThisMonth).toBe(0);
      expect(quiet?.ordersMonitored).toBe(1);
    });
  });

  describe('scope', () => {
    it('omits uninstalled shops entirely — they cost nothing and cannot be billed', async() => {
      expect(await usageFor(GONE)).toBeUndefined();
    });

    it('keeps shops separate rather than bucketing them together', async() => {
      const rows = await collectShopUsage(NOW);
      expect(rows.map(r => r.shopDomain).sort()).toEqual([BUSY, QUIET].sort());
    });
  });
});
