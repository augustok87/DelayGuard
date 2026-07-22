/**
 * Customer-sync cron drain — LAUNCH_PLAN B1 (decision D4).
 *
 * Webhooks enqueue customer-sync jobs to Redis (producers are
 * serverless-safe). With Workers gone, this cron drains a bounded batch:
 * fetch waiting/delayed jobs oldest-first, invoke the EXISTING processor
 * (processCustomerSync) per job, then remove the job.
 *
 * Failure policy: failed jobs are removed too and counted. Customer sync
 * is idempotent (UPSERT into customer_intelligence) and re-enqueued on
 * the customer's next order webhook, so dropping one failed sync is
 * self-healing — while keeping it would let a poison job occupy a batch
 * slot on every tick.
 *
 * The processor module (processors/customer-sync.ts) is owned by another
 * workstream and is treated as READ-ONLY: called, never modified.
 */
import { logger } from "../../utils/logger";
import { processCustomerSync } from "../processors/customer-sync";
import { customerSyncQueue } from "../setup";

export interface CustomerSyncDrainStats {
  jobsProcessed: number;
  errors: number;
}

export const CUSTOMER_SYNC_BATCH_SIZE = 20;
// 5s headroom under the 30s Vercel function cap.
const TIME_BUDGET_MS = 25_000;

export async function processCustomerSyncDrain(): Promise<CustomerSyncDrainStats> {
  const startedAt = Date.now();
  const stats: CustomerSyncDrainStats = { jobsProcessed: 0, errors: 0 };

  if (!customerSyncQueue) {
    logger.warn(
      "Customer-sync drain skipped: queue not initialized (setupQueues not run)",
    );
    return stats;
  }

  let jobs;
  try {
    jobs = await customerSyncQueue.getJobs(
      ["waiting", "delayed"],
      0,
      CUSTOMER_SYNC_BATCH_SIZE - 1,
      true, // ascending → oldest first
    );
  } catch (error) {
    stats.errors++;
    logger.error("Customer-sync drain failed to fetch jobs", error as Error);
    return stats;
  }

  logger.info(`👤 Customer-sync drain: ${jobs.length} queued jobs`);

  for (const job of jobs) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      logger.warn(
        "⏱️  Customer-sync drain time budget exhausted; stopping mid-batch",
        {
          processed: stats.jobsProcessed,
          remaining: jobs.length - stats.jobsProcessed,
        },
      );
      break;
    }

    stats.jobsProcessed++;
    try {
      await processCustomerSync(job);
    } catch (error) {
      stats.errors++;
      logger.error(
        "Customer-sync drain: job failed (removed anyway — idempotent, re-enqueued on next order webhook)",
        error as Error,
        { jobData: job.data as unknown },
      );
    }

    try {
      await job.remove();
    } catch (removeError) {
      logger.warn("Customer-sync drain: failed to remove job", {
        error:
          removeError instanceof Error
            ? removeError.message
            : String(removeError),
      });
    }
  }

  logger.info("✅ Customer-sync drain completed", {
    jobsProcessed: stats.jobsProcessed,
    errors: stats.errors,
    durationMs: Date.now() - startedAt,
  });

  return stats;
}
