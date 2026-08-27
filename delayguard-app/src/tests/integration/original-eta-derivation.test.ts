/**
 * LAUNCH_PLAN §6 R24 — original_eta must survive the move to EasyPost.
 *
 * ShipEngine returned both `estimated_delivery_date` and
 * `original_estimated_delivery_date`, and both writers persisted the latter
 * verbatim. EasyPost exposes only the CURRENT estimate, so that column would
 * now be written NULL on every single refresh — silently disabling the
 * DATE_DELAY rule in delay-detection.ts, which fires only when
 * current_eta > original_eta.
 *
 * The fix derives the original from the FIRST estimate we ever saw, so these
 * assertions are about database state across two successive ingests. The
 * `pg` mock cannot make them: it answers every UPDATE with rowCount 1 and
 * never stores a value (see .claude/rules/tests.md, R17).
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { TrackingIngestService } from '../../services/tracking-ingest-service';
import { CarrierService } from '../../services/carrier-service';
import { TrackingInfo } from '../../types';

jest.mock('../../services/carrier-service');
jest.mock('../../services/redis-connection', () => ({
  getRedisConnection: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
}));
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const MockCarrierService = CarrierService as jest.MockedClass<typeof CarrierService>;

const ORDER_ID = 4001;

/** What CarrierService now returns for EasyPost: no original ETA, ever. */
const easyPostTracking = (currentEta: string): TrackingInfo => ({
  trackingNumber: '1Z999AA10123456784',
  carrierCode: 'ups',
  status: 'IN_TRANSIT',
  estimatedDeliveryDate: currentEta,
  originalEstimatedDeliveryDate: undefined,
  events: [],
});

// applyProductionSchema is not idempotent — pg-mem rejects the re-CREATE — so
// the schema is built once for the whole file rather than per describe block.
beforeAll(applyProductionSchema);

describe('original_eta derivation (EasyPost has no original ETA)', () => {
  let carrierService: jest.Mocked<CarrierService>;
  let ingestService: TrackingIngestService;

  beforeEach(() => {
    jest.clearAllMocks();
    execSql(`DELETE FROM tracking_events`);
    execSql(`DELETE FROM orders`);
    execSql(`DELETE FROM shops`);
    execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
             VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['write_orders'], 'merchant@delayguardapp.com', 'Dev Store')`);
    execSql(`
      INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
      VALUES (${ORDER_ID}, 1, '9001', '#1001', 'Launch Test', 'launch@example.com', 'unfulfilled')
    `);

    carrierService = new MockCarrierService() as jest.Mocked<CarrierService>;
    ingestService = new TrackingIngestService(carrierService);
  });

  const ingest = async(currentEta: string) => {
    carrierService.getTrackingInfo.mockResolvedValue(easyPostTracking(currentEta));
    await ingestService.ingestTracking(ORDER_ID, '1Z999AA10123456784', 'ups');
  };

  const etas = () =>
    selectRows<{ original_eta: Date | null; current_eta: Date | null }>(
      `SELECT original_eta, current_eta FROM orders WHERE id = ${ORDER_ID}`,
    )[0];

  it('seeds original_eta from the first estimate ever seen', async() => {
    await ingest('2026-09-02T00:00:00Z');

    const row = etas();
    expect(row.original_eta).not.toBeNull();
    expect(new Date(row.original_eta as Date).toISOString()).toBe('2026-09-02T00:00:00.000Z');
  });

  it('does NOT overwrite original_eta when the carrier pushes the date back', async() => {
    await ingest('2026-09-02T00:00:00Z');
    await ingest('2026-09-06T00:00:00Z');

    const row = etas();
    expect(new Date(row.original_eta as Date).toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(new Date(row.current_eta as Date).toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });

  it('does not blank an established original_eta when a refresh carries no ETA at all', async() => {
    await ingest('2026-09-02T00:00:00Z');

    carrierService.getTrackingInfo.mockResolvedValue({
      ...easyPostTracking('2026-09-02T00:00:00Z'),
      estimatedDeliveryDate: undefined,
    });
    await ingestService.ingestTracking(ORDER_ID, '1Z999AA10123456784', 'ups');

    expect(etas().original_eta).not.toBeNull();
  });
});

/**
 * The cron refresh path has the identical defect and matters more: it runs on
 * every tick, so an unguarded write would blank original_eta repeatedly rather
 * than once. Fixing one writer and not the other would leave DATE_DELAY dead
 * in exactly the path that feeds it.
 */
describe('original_eta survives the cron tracking refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    execSql(`DELETE FROM tracking_events`);
    execSql(`DELETE FROM fulfillments`);
    execSql(`DELETE FROM orders`);
    execSql(`DELETE FROM shops`);
    execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
             VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['write_orders'], 'm@delayguardapp.com', 'Dev Store')`);
    execSql(`
      INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status, tracking_status, original_eta, current_eta)
      VALUES (${ORDER_ID}, 1, '9001', '#1001', 'Launch Test', 'launch@example.com', 'unfulfilled', 'IN_TRANSIT',
              '2026-09-02T00:00:00Z', '2026-09-02T00:00:00Z')
    `);
    execSql(`
      INSERT INTO fulfillments (order_id, shopify_fulfillment_id, tracking_number, carrier_code, status)
      VALUES (${ORDER_ID}, '77001', '1Z999AA10123456784', 'ups', 'success')
    `);
  });

  it('keeps the established original_eta when the refresh reports a later estimate', async() => {
    MockCarrierService.prototype.getTrackingInfo = jest
      .fn()
      .mockResolvedValue(easyPostTracking('2026-09-06T00:00:00Z'));

    const { processTrackingRefresh } = require('../../queue/processors/tracking-refresh');
    await processTrackingRefresh();

    const row = selectRows<{ original_eta: Date | null; current_eta: Date | null }>(
      `SELECT original_eta, current_eta FROM orders WHERE id = ${ORDER_ID}`,
    )[0];

    expect(new Date(row.original_eta as Date).toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(new Date(row.current_eta as Date).toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });
});
