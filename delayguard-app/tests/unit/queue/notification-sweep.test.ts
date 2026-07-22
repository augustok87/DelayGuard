/**
 * Notification-dispatch sweep tests — LAUNCH_PLAN B1 (decision D4).
 *
 * The sweep reads pending delay_alerts (channel-eligible, unsent, recent)
 * straight from Postgres — the DB is the durable queue — synthesizes the
 * NotificationJobData payload (including the Phase 2.1 routing fields)
 * and invokes the EXISTING processor (processNotification) per alert.
 */
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
}));
jest.mock('../../../src/queue/processors/notification', () => ({
  processNotification: jest.fn(),
}));
jest.mock('../../../src/queue/setup', () => ({
  notificationQueue: {
    drain: jest.fn().mockResolvedValue(undefined),
  },
}));

import { query } from '../../../src/database/connection';
import { processNotification } from '../../../src/queue/processors/notification';
import { notificationQueue } from '../../../src/queue/setup';
import {
  processNotificationSweep,
  NOTIFICATION_BATCH_SIZE,
} from '../../../src/queue/sweeps/notification-sweep';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockProcess = processNotification as jest.MockedFunction<
  typeof processNotification
>;
const mockDrain = (notificationQueue as unknown as { drain: jest.Mock }).drain;

interface PendingAlertRow {
  alert_id: number;
  order_id: number;
  delay_days: number | null;
  delay_reason: string | null;
  estimated_delivery_date: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shop_domain: string;
  merchant_email: string | null;
  merchant_phone: string | null;
  merchant_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

const baseRow: PendingAlertRow = {
  alert_id: 7,
  order_id: 101,
  delay_days: 3,
  delay_reason: 'ETA_EXCEEDED',
  estimated_delivery_date: '2026-08-01T00:00:00.000Z',
  customer_email: 'buyer@example.org',
  customer_phone: '+15550001111',
  shop_domain: 'shop.myshopify.com',
  merchant_email: 'owner@shop.com',
  merchant_phone: '+15559998888',
  merchant_name: 'Shop Owner',
  tracking_number: '1Z999',
  tracking_url: 'https://www.ups.com/track?tracknum=1Z999',
};

describe('processNotificationSweep (B1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess.mockResolvedValue(undefined);
  });

  it('does nothing when no alerts are pending', async() => {
    mockQuery.mockResolvedValue([]);

    const stats = await processNotificationSweep();

    expect(stats).toEqual({ alertsProcessed: 0, errors: 0 });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('bounds the batch size in SQL', async() => {
    mockQuery.mockResolvedValue([]);

    await processNotificationSweep();

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      NOTIFICATION_BATCH_SIZE,
    ]);
  });

  it('synthesizes the full NotificationJobData for a carrier delay (customer routing)', async() => {
    mockQuery.mockResolvedValue([baseRow]);

    const stats = await processNotificationSweep();

    expect(stats).toEqual({ alertsProcessed: 1, errors: 0 });
    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          orderId: 101,
          delayDetails: {
            estimatedDelivery: '2026-08-01T00:00:00.000Z',
            trackingNumber: '1Z999',
            trackingUrl: 'https://www.ups.com/track?tracknum=1Z999',
            delayDays: 3,
            delayReason: 'ETA_EXCEEDED',
          },
          delayType: 'CARRIER_DELAY',
          merchantEmail: undefined,
          merchantPhone: undefined,
          merchantName: undefined,
          customerEmail: 'buyer@example.org',
          customerPhone: '+15550001111',
          shopDomain: 'shop.myshopify.com',
        },
      }),
    );
  });

  it('routes warehouse delays to the merchant (Phase 2.1 routing fields)', async() => {
    mockQuery.mockResolvedValue([
      { ...baseRow, delay_reason: 'WAREHOUSE_DELAY' },
    ]);

    await processNotificationSweep();

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delayType: 'WAREHOUSE_DELAY',
          merchantEmail: 'owner@shop.com',
          merchantPhone: '+15559998888',
          merchantName: 'Shop Owner',
          customerEmail: undefined,
          customerPhone: undefined,
        }),
      }),
    );
  });

  it('maps STUCK_IN_TRANSIT to TRANSIT_DELAY', async() => {
    mockQuery.mockResolvedValue([
      { ...baseRow, delay_reason: 'STUCK_IN_TRANSIT' },
    ]);

    await processNotificationSweep();

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delayType: 'TRANSIT_DELAY' }),
      }),
    );
  });

  it('uses safe fallbacks when tracking/ETA data is missing (never example.com)', async() => {
    mockQuery.mockResolvedValue([
      {
        ...baseRow,
        estimated_delivery_date: null,
        tracking_number: null,
        tracking_url: null,
        delay_days: null,
        delay_reason: null,
      },
    ]);

    await processNotificationSweep();

    const jobArg = mockProcess.mock.calls[0][0] as unknown as {
      data: { delayDetails: Record<string, unknown> };
    };
    expect(jobArg.data.delayDetails).toEqual({
      estimatedDelivery: '',
      trackingNumber: '',
      trackingUrl: '',
      delayDays: 0,
      delayReason: 'UNKNOWN',
    });
  });

  it('continues past per-alert failures and counts them', async() => {
    mockQuery.mockResolvedValue([
      baseRow,
      { ...baseRow, alert_id: 8, order_id: 102 },
    ]);
    mockProcess
      .mockRejectedValueOnce(new Error('SendGrid down'))
      .mockResolvedValueOnce(undefined);

    const stats = await processNotificationSweep();

    expect(stats).toEqual({ alertsProcessed: 2, errors: 1 });
  });

  it('drains the redundant BullMQ notification queue after the sweep', async() => {
    mockQuery.mockResolvedValue([baseRow]);

    await processNotificationSweep();

    expect(mockDrain).toHaveBeenCalledWith(true);
  });
});
