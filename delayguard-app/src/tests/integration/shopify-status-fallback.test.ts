/**
 * LAUNCH_PLAN §6 R24 — delay detection must survive with no carrier API.
 *
 * RULE 3 (STUCK_IN_TRANSIT) reads orders.tracking_status and
 * orders.last_tracking_update. Until now the only writer of those columns was
 * the carrier ingest path, so when the carrier API was unavailable — which it
 * has been for this account's entire life — both columns stayed NULL and
 * RULE 3 could never fire. Production evidence: 0 tracking_events.
 *
 * Shopify already pushes `shipment_status` on every fulfillments/updated
 * webhook. These assertions prove it alone populates what RULE 3 needs.
 *
 * They run against pg-mem carrying the production schema, because the claim
 * is about what the statement WROTE. `__mocks__/pg.js` answers every UPDATE
 * with rowCount 1 and stores nothing (.claude/rules/tests.md, R17).
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { TrackingIngestService } from '../../services/tracking-ingest-service';
import { CarrierService } from '../../services/carrier-service';

jest.mock('../../services/carrier-service');
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const ORDER_ID = 5001;
const MockCarrierService = CarrierService as jest.MockedClass<typeof CarrierService>;

beforeAll(applyProductionSchema);

describe('Shopify shipment_status as the carrier-free delay source', () => {
  let ingestService: TrackingIngestService;

  beforeEach(() => {
    jest.clearAllMocks();
    execSql(`DELETE FROM tracking_events`);
    execSql(`DELETE FROM orders`);
    execSql(`DELETE FROM shops`);
    execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
             VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['read_fulfillments'], 'm@delayguardapp.com', 'Dev Store')`);
    execSql(`
      INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
      VALUES (${ORDER_ID}, 1, '9101', '#1001', 'Launch Test', 'launch@example.com', 'fulfilled')
    `);

    ingestService = new TrackingIngestService(
      new MockCarrierService() as jest.Mocked<CarrierService>,
    );
  });

  const orderRow = () =>
    selectRows<{ tracking_status: string | null; last_tracking_update: Date | null }>(
      `SELECT tracking_status, last_tracking_update FROM orders WHERE id = ${ORDER_ID}`,
    )[0];

  it('populates tracking_status from Shopify alone, with no carrier call', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'in_transit');

    expect(orderRow().tracking_status).toBe('IN_TRANSIT');
    // The whole point: this path must not touch the carrier API.
    expect(MockCarrierService.prototype.getTrackingInfo).not.toHaveBeenCalled();
  });

  it('stamps last_tracking_update, which is the clock RULE 3 measures against', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'in_transit');

    expect(orderRow().last_tracking_update).not.toBeNull();
  });

  it('records a tracking_event so the timeline is not empty', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'out_for_delivery');

    const events = selectRows<{ status: string; carrier_status: string }>(
      `SELECT status, carrier_status FROM tracking_events WHERE order_id = ${ORDER_ID}`,
    );
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('OUT_FOR_DELIVERY');
  });

  it('maps a failed delivery attempt to EXCEPTION, which RULE 2 alerts on', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'attempted_delivery');

    expect(orderRow().tracking_status).toBe('EXCEPTION');
  });

  /**
   * The guard that makes this safe to run ahead of the carrier ingest: an
   * unrecognised or absent status must leave a good status alone rather than
   * blanking it. Without this, a Shopify webhook carrying no shipment_status
   * would wipe whatever the carrier had established.
   */
  it('leaves an established status untouched when Shopify sends nothing', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'in_transit');
    await ingestService.ingestShopifyStatus(ORDER_ID, undefined);

    expect(orderRow().tracking_status).toBe('IN_TRANSIT');
  });

  it('leaves an established status untouched for a status Shopify adds later', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'in_transit');
    await ingestService.ingestShopifyStatus(ORDER_ID, 'teleported');

    expect(orderRow().tracking_status).toBe('IN_TRANSIT');
  });

  it('writes no tracking_event at all for an unrecognised status', async() => {
    await ingestService.ingestShopifyStatus(ORDER_ID, 'teleported');

    expect(
      selectRows(`SELECT id FROM tracking_events WHERE order_id = ${ORDER_ID}`),
    ).toHaveLength(0);
  });
});
