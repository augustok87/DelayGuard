/**
 * Queue setup tests — LAUNCH_PLAN B1 (decision D4).
 *
 * On Vercel, BullMQ Workers terminate with the function and must never be
 * created in a serverless code path. setupQueues() is therefore
 * producer-only (queues + Redis connection); Workers move behind
 * startWorkers(), which only the long-running dev server calls.
 *
 * The shared IORedis connection must use maxRetriesPerRequest: null —
 * BullMQ blocking operations degrade with a bounded retry count.
 */
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue(undefined),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    }),
    drain: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('ioredis', () => {
  const ctor = jest
    .fn()
    .mockImplementation((_url: string, _options: Record<string, unknown>) => ({
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
    }));
  return { __esModule: true, default: ctor };
});

type SetupModule = typeof import('../../../src/queue/setup');
type MockedCtor = jest.Mock;

describe('queue setup (serverless-safe, B1)', () => {
  let setup: SetupModule;
  let QueueMock: MockedCtor;
  let WorkerMock: MockedCtor;
  let RedisMock: MockedCtor;

  beforeEach(async() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379/1';

    const bullmq = await import('bullmq');
    QueueMock = bullmq.Queue as unknown as MockedCtor;
    WorkerMock = bullmq.Worker as unknown as MockedCtor;
    const ioredis = await import('ioredis');
    RedisMock = ioredis.default as unknown as MockedCtor;
    QueueMock.mockClear();
    WorkerMock.mockClear();
    RedisMock.mockClear();

    setup = await import('../../../src/queue/setup');
  });

  it('setupQueues creates producers only — NO Workers', async() => {
    await setup.setupQueues();

    expect(QueueMock).toHaveBeenCalledTimes(3);
    expect(WorkerMock).not.toHaveBeenCalled();
  });

  it('setupQueues uses maxRetriesPerRequest: null on the shared connection', async() => {
    await setup.setupQueues();

    expect(RedisMock).toHaveBeenCalledTimes(1);
    const options = RedisMock.mock.calls[0][1] as Record<string, unknown>;
    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it('setupQueues is idempotent (second call does not duplicate queues)', async() => {
    await setup.setupQueues();
    await setup.setupQueues();

    expect(QueueMock).toHaveBeenCalledTimes(3);
  });

  it('startWorkers creates the three Workers (dev/long-running only)', async() => {
    await setup.startWorkers();

    expect(WorkerMock).toHaveBeenCalledTimes(3);
    const workerNames = WorkerMock.mock.calls.map((call: unknown[]) => call[0]);
    expect(workerNames).toEqual(
      expect.arrayContaining(['delay-check', 'notifications', 'customer-sync']),
    );
  });

  it('producers work after setupQueues without any Worker', async() => {
    await setup.setupQueues();

    await setup.addDelayCheckJob({
      orderId: 1,
      trackingNumber: '1Z',
      carrierCode: 'ups',
      shopDomain: 'x.myshopify.com',
    });
    await setup.addNotificationJob({
      orderId: 1,
      delayDetails: {},
      shopDomain: 'x.myshopify.com',
    });
    await setup.addCustomerSyncJob({
      shopDomain: 'x.myshopify.com',
      shopifyOrderId: '99',
    });

    expect(WorkerMock).not.toHaveBeenCalled();
    const queueResults = QueueMock.mock.results as unknown as Array<{
      value: { add: jest.Mock };
    }>;
    const totalAdds = queueResults.reduce(
      (sum, result) => sum + result.value.add.mock.calls.length,
      0,
    );
    expect(totalAdds).toBe(3);
  });

  it('closeQueues closes cleanly when only producers were started', async() => {
    await setup.setupQueues();

    await expect(setup.closeQueues()).resolves.not.toThrow();
  });
});
