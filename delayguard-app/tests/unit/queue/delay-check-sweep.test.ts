/**
 * Delay-check sweep tests — LAUNCH_PLAN B1 (decision D4: DB-driven cron
 * sweeps replace BullMQ workers).
 *
 * The sweep pulls a bounded batch of candidate orders (not delivered,
 * recent, no fresh delay_alert) from Postgres, resumes from a Redis
 * cursor, and invokes the EXISTING processor (processDelayCheck) per
 * order — the processor module is owned by another workstream and is
 * only called here, never modified.
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
jest.mock('../../../src/services/redis-connection', () => ({
  getRedisConnection: jest.fn(),
}));
jest.mock('../../../src/queue/processors/delay-check', () => ({
  processDelayCheck: jest.fn(),
}));
jest.mock('../../../src/queue/setup', () => ({
  delayCheckQueue: {
    drain: jest.fn().mockResolvedValue(undefined),
  },
}));

import { query } from '../../../src/database/connection';
import { getRedisConnection } from '../../../src/services/redis-connection';
import { processDelayCheck } from '../../../src/queue/processors/delay-check';
import { delayCheckQueue } from '../../../src/queue/setup';
import {
  processDelayCheckSweep,
  DELAY_CHECK_BATCH_SIZE,
} from '../../../src/queue/sweeps/delay-check-sweep';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetRedis = getRedisConnection as jest.MockedFunction<
  typeof getRedisConnection
>;
const mockProcess = processDelayCheck as jest.MockedFunction<
  typeof processDelayCheck
>;
const mockDrain = (delayCheckQueue as unknown as { drain: jest.Mock }).drain;

interface CandidateRow {
  id: number;
  shop_domain: string;
  tracking_number: string | null;
  carrier_code: string | null;
}

const row = (id: number, tracking = true): CandidateRow => ({
  id,
  shop_domain: 'shop.myshopify.com',
  tracking_number: tracking ? `TRACK-${id}` : null,
  carrier_code: tracking ? 'ups' : null,
});

describe('processDelayCheckSweep (B1)', () => {
  let redisGet: jest.Mock;
  let redisSet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    redisGet = jest.fn().mockResolvedValue(null);
    redisSet = jest.fn().mockResolvedValue('OK');
    mockGetRedis.mockResolvedValue({ get: redisGet, set: redisSet } as never);
    mockProcess.mockResolvedValue(undefined);
  });

  it('does nothing when there are no candidate orders', async() => {
    mockQuery.mockResolvedValue([]);

    const stats = await processDelayCheckSweep();

    expect(stats).toEqual({ ordersChecked: 0, errors: 0 });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('resumes from the Redis cursor and passes bounded-batch params to SQL', async() => {
    redisGet.mockResolvedValue('42');
    mockQuery.mockResolvedValue([]);

    await processDelayCheckSweep();

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      42,
      DELAY_CHECK_BATCH_SIZE,
    ]);
  });

  it('invokes the existing processor once per candidate with a synthesized job', async() => {
    mockQuery.mockResolvedValue([row(1), row(2, false), row(3)]);

    const stats = await processDelayCheckSweep();

    expect(stats.ordersChecked).toBe(3);
    expect(mockProcess).toHaveBeenCalledTimes(3);
    expect(mockProcess).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: {
          orderId: 1,
          trackingNumber: 'TRACK-1',
          carrierCode: 'ups',
          shopDomain: 'shop.myshopify.com',
        },
      }),
    );
    // Unfulfilled order (no tracking yet): empty strings make the
    // processor skip carrier rules and still run the warehouse rule.
    expect(mockProcess).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 2,
          trackingNumber: '',
          carrierCode: '',
        }),
      }),
    );
  });

  it('continues past per-order failures and counts them', async() => {
    mockQuery.mockResolvedValue([row(1), row(2), row(3)]);
    mockProcess
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ShipEngine 500'))
      .mockResolvedValueOnce(undefined);

    const stats = await processDelayCheckSweep();

    expect(stats).toEqual({ ordersChecked: 3, errors: 1 });
  });

  it('advances the cursor after a full batch, resets it after a partial batch', async() => {
    const fullBatch = Array.from({ length: DELAY_CHECK_BATCH_SIZE }, (_, i) =>
      row(i + 1),
    );
    mockQuery.mockResolvedValueOnce(fullBatch);
    await processDelayCheckSweep();
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringContaining('cursor'),
      String(DELAY_CHECK_BATCH_SIZE),
    );

    redisSet.mockClear();
    mockQuery.mockResolvedValueOnce([row(99)]);
    await processDelayCheckSweep();
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringContaining('cursor'),
      '0',
    );
  });

  it('stops mid-batch when the time budget is exhausted (30s Vercel cap)', async() => {
    mockQuery.mockResolvedValue([row(1), row(2), row(3)]);
    const realNow = Date.now();
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(realNow) // sweep start
      .mockReturnValueOnce(realNow) // budget check, order 1 → within budget
      .mockReturnValue(realNow + 26_000); // subsequent checks → exhausted

    const stats = await processDelayCheckSweep();

    expect(stats.ordersChecked).toBe(1);
    expect(mockProcess).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });

  it('discards redundant webhook-enqueued BullMQ jobs after the sweep', async() => {
    mockQuery.mockResolvedValue([row(1)]);

    await processDelayCheckSweep();

    expect(mockDrain).toHaveBeenCalledWith(true);
  });

  it('swallows queue-drain failures (sweep result still returned)', async() => {
    mockQuery.mockResolvedValue([row(1)]);
    mockDrain.mockRejectedValueOnce(new Error('redis gone'));

    const stats = await processDelayCheckSweep();

    expect(stats.ordersChecked).toBe(1);
  });
});
