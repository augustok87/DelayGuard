/**
 * Customer-sync drain tests — LAUNCH_PLAN B1 (decision D4).
 *
 * Webhooks enqueue customer-sync jobs to Redis (producers are
 * serverless-safe); with no Workers, this cron drains a bounded batch:
 * fetch waiting/delayed jobs, invoke the EXISTING processor
 * (processCustomerSync) per job, then remove the job. Failed jobs are
 * removed too (sync is idempotent and re-enqueued on the customer's next
 * order webhook) so a poison job can never wedge the queue.
 */
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../src/queue/processors/customer-sync', () => ({
  processCustomerSync: jest.fn(),
}));
jest.mock('../../../src/queue/setup', () => ({
  customerSyncQueue: {
    getJobs: jest.fn(),
  },
}));

import { processCustomerSync } from '../../../src/queue/processors/customer-sync';
import { customerSyncQueue } from '../../../src/queue/setup';
import {
  processCustomerSyncDrain,
  CUSTOMER_SYNC_BATCH_SIZE,
} from '../../../src/queue/sweeps/customer-sync-drain';

const mockProcess = processCustomerSync as jest.MockedFunction<
  typeof processCustomerSync
>;
const mockGetJobs = (customerSyncQueue as unknown as { getJobs: jest.Mock })
  .getJobs;

const makeJob = (shopifyOrderId: string) => ({
  data: { shopDomain: 'shop.myshopify.com', shopifyOrderId },
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('processCustomerSyncDrain (B1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess.mockResolvedValue(undefined);
  });

  it('returns zero stats when the queue is empty', async() => {
    mockGetJobs.mockResolvedValue([]);

    const stats = await processCustomerSyncDrain();

    expect(stats).toEqual({ jobsProcessed: 0, errors: 0 });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('fetches a bounded batch of waiting + delayed jobs (oldest first)', async() => {
    mockGetJobs.mockResolvedValue([]);

    await processCustomerSyncDrain();

    expect(mockGetJobs).toHaveBeenCalledWith(
      ['waiting', 'delayed'],
      0,
      CUSTOMER_SYNC_BATCH_SIZE - 1,
      true,
    );
  });

  it('processes each job with the existing processor and removes it', async() => {
    const jobs = [makeJob('1001'), makeJob('1002')];
    mockGetJobs.mockResolvedValue(jobs);

    const stats = await processCustomerSyncDrain();

    expect(stats).toEqual({ jobsProcessed: 2, errors: 0 });
    expect(mockProcess).toHaveBeenCalledTimes(2);
    expect(mockProcess).toHaveBeenCalledWith(jobs[0]);
    expect(jobs[0].remove).toHaveBeenCalled();
    expect(jobs[1].remove).toHaveBeenCalled();
  });

  it('removes failed jobs too and counts the error (no poison-job wedging)', async() => {
    const jobs = [makeJob('1001'), makeJob('1002')];
    mockGetJobs.mockResolvedValue(jobs);
    mockProcess
      .mockRejectedValueOnce(new Error('Shopify GraphQL 500'))
      .mockResolvedValueOnce(undefined);

    const stats = await processCustomerSyncDrain();

    expect(stats).toEqual({ jobsProcessed: 2, errors: 1 });
    expect(jobs[0].remove).toHaveBeenCalled();
    expect(jobs[1].remove).toHaveBeenCalled();
  });

  it('swallows job.remove failures', async() => {
    const job = makeJob('1001');
    job.remove.mockRejectedValueOnce(new Error('lock'));
    mockGetJobs.mockResolvedValue([job]);

    const stats = await processCustomerSyncDrain();

    expect(stats).toEqual({ jobsProcessed: 1, errors: 0 });
  });

  it('returns zeros gracefully when getJobs itself fails', async() => {
    mockGetJobs.mockRejectedValue(new Error('redis gone'));

    const stats = await processCustomerSyncDrain();

    expect(stats).toEqual({ jobsProcessed: 0, errors: 1 });
  });
});
