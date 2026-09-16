/**
 * LAUNCH_PLAN §6 R24 — the fallback must survive the absence it exists for.
 *
 * CarrierService's constructor throws when no API key is present, and
 * TrackingIngestService built one eagerly. Since the fulfillments/updated
 * webhook routes through that service, a deployment with no carrier key would
 * have thrown before reaching the Shopify-status write — 500ing the webhook,
 * triggering Shopify retries, and disabling the carrier-independent path in
 * precisely the case it was built for.
 *
 * CarrierService is deliberately NOT mocked here. A mocked constructor cannot
 * throw, so a mocked test would have passed against the broken code and proved
 * nothing (.claude/rules/tests.md — a check that cannot fail is not a check).
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { TrackingIngestService } from '../../services/tracking-ingest-service';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const ORDER_ID = 6001;

describe('TrackingIngestService with no carrier API key', () => {
  const originalKey = process.env.EASYPOST_API_KEY;

  beforeAll(applyProductionSchema);

  beforeEach(() => {
    delete process.env.EASYPOST_API_KEY;
    execSql(`DELETE FROM tracking_events`);
    execSql(`DELETE FROM orders`);
    execSql(`DELETE FROM shops`);
    execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
             VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['read_fulfillments'], 'm@delayguardapp.com', 'Dev')`);
    execSql(`
      INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
      VALUES (${ORDER_ID}, 1, '9201', '#1002', 'No Key', 'nokey@example.com', 'fulfilled')
    `);
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.EASYPOST_API_KEY;
    } else {
      process.env.EASYPOST_API_KEY = originalKey;
    }
  });

  it('constructs without a carrier key', () => {
    expect(() => new TrackingIngestService()).not.toThrow();
  });

  it('still persists Shopify shipment_status — the whole point of the fallback', async() => {
    const service = new TrackingIngestService();

    await service.ingestShopifyStatus(ORDER_ID, 'in_transit');

    const row = selectRows<{ tracking_status: string | null }>(
      `SELECT tracking_status FROM orders WHERE id = ${ORDER_ID}`,
    )[0];
    expect(row.tracking_status).toBe('IN_TRANSIT');
  });

  it('treats a missing carrier key as an unavailable carrier, not a crash', async() => {
    const service = new TrackingIngestService();

    await expect(
      service.ingestTracking(ORDER_ID, '1Z999AA10123456784', 'ups'),
    ).resolves.toBeUndefined();
  });
});
