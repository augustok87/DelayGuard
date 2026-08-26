/**
 * BullMQ delay-check processor — Launch WS-E (tasks E2 + E3).
 *
 * Producer side of the notification routing matrix (v1.19 incident rules):
 *   - positive AND negative dispatch tests per delay rule
 *   - field-by-field assertions on the enqueued notification payload
 *   - field-by-field assertions on the delay_alerts INSERT
 *   - real tracking URLs (E2): stored fulfillments.tracking_url first,
 *     carrier-pattern fallback, generic fallback, never example.com
 *
 * Mocking convention (per .claude/rules/tests.md): DB + queue producer +
 * sibling services are mocked at the module level; the test isolates the
 * processor's own orchestration logic.
 */

import { Job } from 'bullmq';
import { processDelayCheck } from '../../../queue/processors/delay-check';
import { query } from '../../../database/connection';
import { addNotificationJob } from '../../../queue/setup';
import { CarrierService } from '../../../services/carrier-service';
import {
  DelayDetectionService,
  checkWarehouseDelay,
  checkTransitDelay,
} from '../../../services/delay-detection-service';

jest.mock('../../../database/connection');
jest.mock('../../../queue/setup', () => ({
  addNotificationJob: jest.fn(),
}));
jest.mock('../../../services/carrier-service');
jest.mock('../../../services/delay-detection-service');
jest.mock('../../../services/priority-score-service');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockAddNotificationJob = addNotificationJob as jest.MockedFunction<
  typeof addNotificationJob
>;
const mockCheckWarehouseDelay = checkWarehouseDelay as jest.MockedFunction<
  typeof checkWarehouseDelay
>;
const mockCheckTransitDelay = checkTransitDelay as jest.MockedFunction<
  typeof checkTransitDelay
>;
const MockCarrierService = CarrierService as jest.MockedClass<
  typeof CarrierService
>;
const MockDelayDetectionService = DelayDetectionService as jest.MockedClass<
  typeof DelayDetectionService
>;

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  created_at: Date;
  tracking_status: string | null;
  last_tracking_update: Date | null;
  tracking_number: string;
  carrier_code: string;
  warehouse_delay_days: number;
  carrier_delay_days: number;
  transit_delay_days: number;
  email_enabled: boolean;
  sms_enabled: boolean;
  merchant_email: string | null;
  merchant_phone: string | null;
  merchant_name: string | null;
  warehouse_delays_enabled: boolean;
  carrier_delays_enabled: boolean;
  transit_delays_enabled: boolean;
}

function makeOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: '101',
    order_number: '1001',
    customer_name: 'Jane Doe',
    customer_email: 'jane@customer-mail.test',
    customer_phone: '+15558675309',
    status: 'processing',
    created_at: new Date('2026-07-10T00:00:00Z'),
    tracking_status: 'IN_TRANSIT',
    last_tracking_update: new Date('2026-07-15T00:00:00Z'),
    tracking_number: '1Z999AA1234567890',
    carrier_code: 'ups',
    warehouse_delay_days: 2,
    carrier_delay_days: 1,
    transit_delay_days: 7,
    email_enabled: true,
    sms_enabled: true,
    merchant_email: 'mary@merchant-store.test',
    merchant_phone: '+15550001111',
    merchant_name: 'Mary Merchant',
    warehouse_delays_enabled: true,
    carrier_delays_enabled: true,
    transit_delays_enabled: true,
    ...overrides,
  };
}

interface JobData {
  orderId: number;
  trackingNumber: string;
  carrierCode: string;
  shopDomain: string;
}

function makeJob(overrides: Partial<JobData> = {}): Job<JobData> {
  return {
    data: {
      orderId: 101,
      trackingNumber: '1Z999AA1234567890',
      carrierCode: 'ups',
      shopDomain: 'test-shop.myshopify.com',
      ...overrides,
    },
  } as unknown as Job<JobData>;
}

/**
 * Wire mockQuery for the processor's call sequence:
 *   SELECT ... FROM orders            → [orderRow]
 *   INSERT INTO delay_alerts          → [{ id: 55 }]
 *   SELECT tracking_url FROM fulfillments → fulfillmentRows
 *   UPDATE orders                     → []
 */
function wireQuery(
  orderRow: OrderRow | null,
  fulfillmentRows: Array<{ tracking_url: string | null }> = [],
): void {
  mockQuery.mockReset();
  mockQuery.mockImplementation((async(sql: string) => {
    if (sql.includes('FROM orders')) {
      return orderRow ? [orderRow] : [];
    }
    if (sql.includes('INSERT INTO delay_alerts')) {
      return [{ id: 55 }];
    }
    if (sql.includes('FROM fulfillments')) {
      return fulfillmentRows;
    }
    return [];
  }) as unknown as typeof query);
}

const NOT_DELAYED = { isDelayed: false } as Awaited<
  ReturnType<typeof checkWarehouseDelay>
>;

const WAREHOUSE_RESULT = {
  isDelayed: true,
  delayDays: 3,
  delayReason: 'WAREHOUSE_DELAY',
  originalDelivery: '2026-07-25',
  estimatedDelivery: '2026-07-30',
} as Awaited<ReturnType<typeof checkWarehouseDelay>>;

const CARRIER_RESULT = {
  isDelayed: true,
  delayDays: 2,
  delayReason: 'DELAYED_STATUS',
  originalDelivery: '2026-07-20',
  estimatedDelivery: '2026-08-01',
};

const TRANSIT_RESULT = {
  isDelayed: true,
  delayDays: 8,
  delayReason: 'STUCK_IN_TRANSIT',
  originalDelivery: '2026-07-18',
  estimatedDelivery: '2026-08-03',
} as Awaited<ReturnType<typeof checkTransitDelay>>;

let checkForDelaysMock: jest.Mock;
let getTrackingInfoMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAddNotificationJob.mockResolvedValue(undefined);
  mockCheckWarehouseDelay.mockResolvedValue(NOT_DELAYED);
  mockCheckTransitDelay.mockResolvedValue(NOT_DELAYED);
  checkForDelaysMock = jest.fn().mockResolvedValue({ isDelayed: false });
  getTrackingInfoMock = jest.fn().mockResolvedValue({
    trackingNumber: '1Z999AA1234567890',
    carrierCode: 'ups',
    status: 'IN_TRANSIT',
    events: [],
  });
  MockCarrierService.mockImplementation(
    () =>
      ({ getTrackingInfo: getTrackingInfoMock } as unknown as CarrierService),
  );
  MockDelayDetectionService.mockImplementation(
    () =>
      ({ checkForDelays: checkForDelaysMock } as unknown as DelayDetectionService),
  );
});

describe('processDelayCheck — notification routing matrix (E3, v1.19 rules)', () => {
  it('WAREHOUSE delay → enqueues a merchant-routed payload, field by field, with NO customer contact', async() => {
    wireQuery(makeOrderRow(), [
      { tracking_url: 'https://carrier-portal.test/track/XYZ' },
    ]);
    mockCheckWarehouseDelay.mockResolvedValue(WAREHOUSE_RESULT);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).toHaveBeenCalledTimes(1);
    expect(mockAddNotificationJob).toHaveBeenCalledWith({
      // §6 R17: the job names the delay_alerts row it completes. Without it
      // the processor falls back to "newest alert on the order" and one send
      // marks every alert on that order delivered.
      alertId: 55,
      orderId: 101,
      delayDetails: {
        estimatedDelivery: '2026-07-30',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://carrier-portal.test/track/XYZ',
        delayDays: 3,
        delayReason: 'WAREHOUSE_DELAY',
      },
      delayType: 'WAREHOUSE_DELAY',
      merchantEmail: 'mary@merchant-store.test',
      merchantPhone: '+15550001111',
      merchantName: 'Mary Merchant',
      customerEmail: undefined,
      customerPhone: undefined,
      shopDomain: 'test-shop.myshopify.com',
    });
  });

  it('CARRIER delay → enqueues a customer-routed payload, field by field, with NO merchant contact', async() => {
    wireQuery(makeOrderRow(), []);
    checkForDelaysMock.mockResolvedValue(CARRIER_RESULT);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).toHaveBeenCalledTimes(1);
    expect(mockAddNotificationJob).toHaveBeenCalledWith({
      // §6 R17: the job names the delay_alerts row it completes. Without it
      // the processor falls back to "newest alert on the order" and one send
      // marks every alert on that order delivered.
      alertId: 55,
      orderId: 101,
      delayDetails: {
        estimatedDelivery: '2026-08-01',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA1234567890',
        delayDays: 2,
        delayReason: 'DELAYED_STATUS',
      },
      delayType: 'CARRIER_DELAY',
      merchantEmail: undefined,
      merchantPhone: undefined,
      merchantName: undefined,
      customerEmail: 'jane@customer-mail.test',
      customerPhone: '+15558675309',
      shopDomain: 'test-shop.myshopify.com',
    });
  });

  it('TRANSIT delay → enqueues a customer-routed payload with delayType TRANSIT_DELAY', async() => {
    wireQuery(makeOrderRow(), []);
    mockCheckTransitDelay.mockResolvedValue(TRANSIT_RESULT);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).toHaveBeenCalledTimes(1);
    const payload = mockAddNotificationJob.mock.calls[0][0];
    expect(payload.delayType).toBe('TRANSIT_DELAY');
    expect(payload.customerEmail).toBe('jane@customer-mail.test');
    expect(payload.customerPhone).toBe('+15558675309');
    expect(payload.merchantEmail).toBeUndefined();
    expect(payload.merchantPhone).toBeUndefined();
    expect(payload.merchantName).toBeUndefined();
  });

  it('negative (rule 1): warehouse rule disabled → checkWarehouseDelay never runs, no job', async() => {
    wireQuery(makeOrderRow({ warehouse_delays_enabled: false }), []);

    await processDelayCheck(makeJob());

    expect(mockCheckWarehouseDelay).not.toHaveBeenCalled();
    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });

  it('negative (rule 2): carrier rule disabled → checkForDelays never runs, no job', async() => {
    wireQuery(makeOrderRow({ carrier_delays_enabled: false }), []);
    checkForDelaysMock.mockResolvedValue(CARRIER_RESULT);

    await processDelayCheck(makeJob());

    expect(checkForDelaysMock).not.toHaveBeenCalled();
    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });

  it('negative (rule 3): transit rule disabled → checkTransitDelay never runs, no job', async() => {
    wireQuery(makeOrderRow({ transit_delays_enabled: false }), []);
    mockCheckTransitDelay.mockResolvedValue(TRANSIT_RESULT);

    await processDelayCheck(makeJob());

    expect(mockCheckTransitDelay).not.toHaveBeenCalled();
    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });

  it('negative: no rule triggers → no notification job', async() => {
    wireQuery(makeOrderRow(), []);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });

  it('negative: delay detected but both channels disabled → no notification job', async() => {
    wireQuery(
      makeOrderRow({ email_enabled: false, sms_enabled: false }),
      [],
    );
    mockCheckWarehouseDelay.mockResolvedValue(WAREHOUSE_RESULT);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });
});

describe('processDelayCheck — real tracking URLs (E2)', () => {
  beforeEach(() => {
    checkForDelaysMock.mockResolvedValue(CARRIER_RESULT);
  });

  it("uses the fulfillment's stored tracking_url when one exists", async() => {
    wireQuery(makeOrderRow(), [
      { tracking_url: 'https://carrier-portal.test/track/XYZ' },
    ]);

    await processDelayCheck(makeJob());

    const payload = mockAddNotificationJob.mock.calls[0][0];
    expect(
      (payload.delayDetails as { trackingUrl: string }).trackingUrl,
    ).toBe('https://carrier-portal.test/track/XYZ');

    const fulfillmentCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('FROM fulfillments'),
    );
    expect(fulfillmentCall).toBeDefined();
    expect(fulfillmentCall?.[1]).toEqual([101, '1Z999AA1234567890']);
  });

  it('falls back to the carrier-pattern link (UPS) when no stored URL exists', async() => {
    wireQuery(makeOrderRow(), []);

    await processDelayCheck(makeJob());

    const payload = mockAddNotificationJob.mock.calls[0][0];
    expect(
      (payload.delayDetails as { trackingUrl: string }).trackingUrl,
    ).toBe('https://www.ups.com/track?tracknum=1Z999AA1234567890');
  });

  it('falls back to the generic tracking search for unknown carriers', async() => {
    wireQuery(makeOrderRow({ carrier_code: 'canada_post' }), []);

    await processDelayCheck(makeJob({ carrierCode: 'canada_post' }));

    const payload = mockAddNotificationJob.mock.calls[0][0];
    expect(
      (payload.delayDetails as { trackingUrl: string }).trackingUrl,
    ).toBe('https://www.google.com/search?q=1Z999AA1234567890');
  });

  it('unfulfilled warehouse delay (no tracking number) → empty trackingUrl, no fulfillments lookup, never example.com', async() => {
    wireQuery(makeOrderRow({ tracking_number: '', carrier_code: '' }), []);
    checkForDelaysMock.mockResolvedValue({ isDelayed: false });
    mockCheckWarehouseDelay.mockResolvedValue(WAREHOUSE_RESULT);

    await processDelayCheck(makeJob({ trackingNumber: '', carrierCode: '' }));

    const payload = mockAddNotificationJob.mock.calls[0][0];
    const details = payload.delayDetails as {
      trackingUrl: string;
      trackingNumber: string;
    };
    expect(details.trackingUrl).toBe('');
    expect(details.trackingNumber).toBe('');
    expect(
      mockQuery.mock.calls.some(([sql]) =>
        typeof sql === 'string' && sql.includes('FROM fulfillments'),
      ),
    ).toBe(false);
    expect(JSON.stringify(payload)).not.toContain('example.com');
  });

  it('no payload ever contains a placeholder tracking domain (E2 acceptance)', async() => {
    wireQuery(makeOrderRow(), []);

    await processDelayCheck(makeJob());

    expect(JSON.stringify(mockAddNotificationJob.mock.calls)).not.toContain(
      'example.com',
    );
  });
});

describe('processDelayCheck — delay_alerts persistence (v1.19 field-population rule)', () => {
  it('INSERTs the warehouse alert with every column value, in order', async() => {
    wireQuery(makeOrderRow(), []);
    mockCheckWarehouseDelay.mockResolvedValue(WAREHOUSE_RESULT);

    await processDelayCheck(makeJob());

    const insertCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO delay_alerts'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual([
      101, // order_id
      3, // delay_days
      3, // estimated_delay_days (display copy)
      'WAREHOUSE_DELAY', // delay_reason
      '2026-07-25', // original_delivery_date
      '2026-07-30', // estimated_delivery_date
    ]);
  });

  it('INSERTs the carrier alert with every column value, in order', async() => {
    wireQuery(makeOrderRow(), []);
    checkForDelaysMock.mockResolvedValue(CARRIER_RESULT);

    await processDelayCheck(makeJob());

    const insertCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO delay_alerts'),
    );
    expect(insertCall?.[1]).toEqual([
      101,
      2,
      2, // estimated_delay_days (display copy)
      'DELAYED_STATUS',
      '2026-07-20',
      '2026-08-01',
    ]);
  });

  it('re-throws when the order does not exist (BullMQ retry must see the failure)', async() => {
    wireQuery(null, []);

    await expect(processDelayCheck(makeJob())).rejects.toThrow(
      /Order 101 not found/,
    );
    expect(mockAddNotificationJob).not.toHaveBeenCalled();
  });
});

describe('processDelayCheck — settings columns come from app_settings, not shops (schema-truth fix)', () => {
  /**
   * runMigrations() puts email_enabled / sms_enabled / *_delay_days /
   * *_delays_enabled on app_settings — only merchant_email / merchant_phone /
   * merchant_name live on shops. A SELECT that reads the flags off the shops
   * alias is runtime-fatal in production (column does not exist). Field-by-
   * field SQL assertions per .claude/rules/backend.md v1.19 rules.
   */
  const SETTINGS_COLUMNS = [
    'warehouse_delay_days',
    'carrier_delay_days',
    'transit_delay_days',
    'email_enabled',
    'sms_enabled',
    'warehouse_delays_enabled',
    'carrier_delays_enabled',
    'transit_delays_enabled',
  ];
  const SHOPS_COLUMNS = ['merchant_email', 'merchant_phone', 'merchant_name'];

  it('order+settings SELECT joins app_settings and sources every settings flag from it', async() => {
    wireQuery(makeOrderRow());

    await processDelayCheck(makeJob());

    const settingsCall = mockQuery.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('FROM orders') &&
        sql.includes('WHERE o.id'),
    );
    expect(settingsCall).toBeDefined();
    const sql = settingsCall?.[0] as string;

    const joinMatch = sql.match(/JOIN\s+app_settings\s+(\w+)\s+ON/);
    expect(joinMatch).not.toBeNull();
    const alias = joinMatch?.[1] as string;

    for (const col of SETTINGS_COLUMNS) {
      expect(sql).toContain(`${alias}.${col}`);
      // and NOT read off the shops alias (runtime-fatal: column not on shops)
      expect(sql).not.toMatch(new RegExp(`\\bs\\.${col}\\b`));
    }
    for (const col of SHOPS_COLUMNS) {
      expect(sql).toMatch(new RegExp(`\\bs\\.${col}\\b`));
    }
  });
});

/**
 * LAUNCH_PLAN §6 R25 — a carrier outage must not discard a delay that was
 * already detected without the carrier.
 *
 * RULE 1 (warehouse) needs no carrier data at all: it compares the order's own
 * age against a threshold. RULES 2 and 3 need ShipEngine. But the tracking
 * fetch sat unguarded in the middle of the processor, so any ShipEngine
 * failure threw past the notification dispatch at the end — discarding a
 * warehouse alert that had *already been detected and persisted* moments
 * earlier, and leaving `orders.updated_at` unmoved.
 *
 * This is not hypothetical: §6 R24 proves ShipEngine currently refuses
 * `/v1/tracking` outright on this account's plan ("You must upgrade your
 * billing plan"), and `getTrackingInfo` turns that 401 into a thrown
 * "Invalid API key". So the moment any order carries a tracking number, every
 * delay check on it aborts — including the one rule that would still work.
 */
describe('processDelayCheck — a carrier failure must not discard RULE 1 (§6 R25)', () => {
  beforeEach(() => {
    getTrackingInfoMock.mockRejectedValue(new Error('Invalid API key'));
  });

  it('still dispatches the warehouse alert when ShipEngine refuses', async() => {
    mockCheckWarehouseDelay.mockResolvedValue(WAREHOUSE_RESULT);
    wireQuery(makeOrderRow(), [{ tracking_url: null }]);

    await processDelayCheck(makeJob());

    expect(mockAddNotificationJob).toHaveBeenCalledTimes(1);
    expect(mockAddNotificationJob.mock.calls[0][0]).toMatchObject({
      delayType: 'WAREHOUSE_DELAY',
    });
  });

  it('does not fail the job — the order is checked again next sweep', async() => {
    mockCheckWarehouseDelay.mockResolvedValue(NOT_DELAYED);
    wireQuery(makeOrderRow(), [{ tracking_url: null }]);

    await expect(processDelayCheck(makeJob())).resolves.toBeUndefined();
  });

  it('still propagates failures that are NOT the carrier call', async() => {
    // Guards the over-correction: the new boundary must be narrow. A database
    // failure still has to reach BullMQ so attempts:3 retries it.
    mockCheckWarehouseDelay.mockRejectedValue(new Error('Postgres is down'));
    wireQuery(makeOrderRow(), [{ tracking_url: null }]);

    await expect(processDelayCheck(makeJob())).rejects.toThrow(/Postgres is down/);
  });
});
