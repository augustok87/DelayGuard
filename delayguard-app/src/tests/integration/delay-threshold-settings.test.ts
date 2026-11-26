/**
 * The merchant's delay threshold must be the one the delay check uses.
 *
 * The settings screen has one number, "Alert me when orders sit unfulfilled
 * for N days", saved to app_settings.delay_threshold_days. It promises
 * "Stuck in Transit" is auto-calculated as N + 5. The delay check instead
 * read app_settings.warehouse_delay_days and transit_delay_days, which no code
 * path ever writes, so every shop ran on the column defaults (2 and 7) no
 * matter what the merchant chose.
 *
 * These run against pg-mem with the production schema because the bug is
 * about which column the SELECT reads (.claude/rules/tests.md, R17/R19).
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { Job } from 'bullmq';
import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { processDelayCheck } from '../../queue/processors/delay-check';
import { CarrierService } from '../../services/carrier-service';

jest.mock('../../services/carrier-service');
jest.mock('../../services/priority-score-service');
jest.mock('../../queue/setup', () => ({ addNotificationJob: jest.fn() }));
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const SHOP_ID = 1;
const ORDER_ID = 7001;
const HOUR_MS = 60 * 60 * 1000;

const MockCarrierService = CarrierService as jest.MockedClass<typeof CarrierService>;

beforeAll(applyProductionSchema);

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function seedShop(merchantThresholdDays: number): void {
  execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
           VALUES (${SHOP_ID}, 'delayguard-dev.myshopify.com', 'tok', ARRAY['read_orders'], 'm@delayguardapp.com', 'Dev Store')`);
  execSql(`INSERT INTO app_settings (shop_id, delay_threshold_days) VALUES (${SHOP_ID}, ${merchantThresholdDays})`);
}

function seedUnfulfilledOrder(ageHours: number): void {
  execSql(`
    INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status, created_at)
    VALUES (${ORDER_ID}, ${SHOP_ID}, '9201', '#1201', 'Threshold Test', 'buyer@example.com', 'unfulfilled', '${hoursAgo(ageHours)}')
  `);
}

function seedInTransitOrder(hoursSinceLastScan: number): void {
  execSql(`
    INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status,
                        tracking_status, last_tracking_update)
    VALUES (${ORDER_ID}, ${SHOP_ID}, '9202', '#1202', 'Threshold Test', 'buyer@example.com', 'fulfilled',
            'IN_TRANSIT', '${hoursAgo(hoursSinceLastScan)}')
  `);
}

function runDelayCheck(withTracking: boolean): Promise<void> {
  const data = withTracking
    ? { orderId: ORDER_ID, trackingNumber: '9400100000000000000000', carrierCode: 'usps', shopDomain: 'delayguard-dev.myshopify.com' }
    : { orderId: ORDER_ID, trackingNumber: '', carrierCode: '', shopDomain: 'delayguard-dev.myshopify.com' };
  return processDelayCheck({ data } as unknown as Job<typeof data>);
}

function alertReasons(): string[] {
  return selectRows<{ delay_reason: string }>(
    `SELECT delay_reason FROM delay_alerts WHERE order_id = ${ORDER_ID}`,
  ).map((row) => row.delay_reason);
}

describe("delay check honors the merchant's threshold setting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // No carrier answer: RULE 2 stays out of the way and RULE 3 runs on
    // Shopify's tracking_status alone, as it does in production today.
    MockCarrierService.prototype.getTrackingInfo.mockRejectedValue(new Error('no carrier'));
    execSql(`DELETE FROM delay_alerts`);
    execSql(`DELETE FROM orders`);
    execSql(`DELETE FROM app_settings`);
    execSql(`DELETE FROM shops`);
  });

  describe('warehouse rule (unfulfilled orders)', () => {
    it('does not alert before the merchant threshold, even past the old 2-day default', async() => {
      seedShop(5);
      seedUnfulfilledOrder(3 * 24 + 1);

      await runDelayCheck(false);

      expect(alertReasons()).not.toContain('WAREHOUSE_DELAY');
    });

    it('alerts once the merchant threshold passes, even before the old 2-day default', async() => {
      seedShop(1);
      seedUnfulfilledOrder(24 + 1);

      await runDelayCheck(false);

      expect(alertReasons()).toContain('WAREHOUSE_DELAY');
    });
  });

  describe('stuck-in-transit rule (threshold + 5 days, as the settings screen promises)', () => {
    it('alerts at threshold + 5 days without a scan, before the old 7-day default', async() => {
      seedShop(1);
      seedInTransitOrder(6 * 24 + 1);

      await runDelayCheck(true);

      expect(alertReasons()).toContain('STUCK_IN_TRANSIT');
    });

    // Passes against the broken code too. Kept to pin the other half of the
    // contract: the transit rule must add 5 days, not reuse the warehouse
    // threshold as-is.
    it('does not alert one day short of threshold + 5', async() => {
      seedShop(1);
      seedInTransitOrder(5 * 24 + 1);

      await runDelayCheck(true);

      expect(alertReasons()).not.toContain('STUCK_IN_TRANSIT');
    });
  });
});
