/**
 * BullMQ setup — SERVERLESS-SAFE SPLIT (LAUNCH_PLAN B1, decision D4)
 *
 * setupQueues()  → producers ONLY (Redis connection + Queues). Safe in
 *                  Vercel functions; this is what the serverless entry
 *                  (api/[[...path]].ts → ensureInitialized) calls.
 * startWorkers() → BullMQ Workers. Long-running processes ONLY (the dev
 *                  server in src/server.ts, or an external worker host).
 *                  Workers started inside a Vercel function terminate the
 *                  moment the invocation ends — never call this from any
 *                  serverless code path.
 *
 * In production, background processing is done by DB-driven cron sweeps
 * (src/queue/sweeps/*, exposed at /api/cron/*) that invoke the processor
 * functions directly within the 30s function cap — see
 * .claude/rules/deploy.md.
 */

import { Queue, Worker } from "bullmq";
import { logger } from "../utils/logger";
import IORedis from "ioredis";
import { processDelayCheck } from "./processors/delay-check";
import { processNotification } from "./processors/notification";
import { processCustomerSync } from "./processors/customer-sync";

let redis: IORedis;
let delayCheckQueue: Queue;
let notificationQueue: Queue;
let customerSyncQueue: Queue;
let delayCheckWorker: Worker;
let notificationWorker: Worker;
let customerSyncWorker: Worker;

/**
 * Initialize the shared Redis connection and the three queues
 * (producers). Idempotent — safe to call once per serverless cold start.
 * Creates NO Workers.
 */
export async function setupQueues(): Promise<void> {
  if (redis) {
    return;
  }

  try {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }
    redis = new IORedis(redisUrl, {
      // BullMQ requires maxRetriesPerRequest: null — its blocking
      // commands break with a bounded retry count (LAUNCH_PLAN B1).
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Test Redis connection
    await redis.ping();
    logger.info("✅ Redis connected successfully");

    // Create queues
    delayCheckQueue = new Queue("delay-check", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    notificationQueue = new Queue("notifications", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Phase 2.1.a: customer-sync queue. Uses the canonical defaults
    // (attempts:3 exponential 2s backoff) per .claude/rules/backend.md
    // — no diverging config.
    customerSyncQueue = new Queue("customer-sync", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    logger.info("✅ Queues initialized (producers only — no workers)");
  } catch (error) {
    logger.error("Error setting up queues", error as Error);
    throw error;
  }
}

/**
 * Start the BullMQ Workers. ⚠️ LONG-RUNNING PROCESSES ONLY — the dev
 * server (`require.main === module` path in src/server.ts) or an external
 * worker host. NEVER called from a serverless code path: Vercel functions
 * terminate Workers immediately (LAUNCH_PLAN B1 / deploy.md).
 */
export async function startWorkers(): Promise<void> {
  if (!redis) {
    await setupQueues();
  }
  if (delayCheckWorker) {
    return;
  }

  delayCheckWorker = new Worker("delay-check", processDelayCheck, {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000, // 100 jobs per minute
    },
  });

  notificationWorker = new Worker("notifications", processNotification, {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 200,
      duration: 60000, // 200 jobs per minute
    },
  });

  // Phase 2.1.a: customer-sync worker. Conservative concurrency + rate
  // limit — every job makes one Shopify GraphQL call. ShipEngine
  // rate-limit territory is documented at audit Wave 1.1; the Shopify
  // GraphQL cost-points limit is 1000/sec on standard plans, and one
  // Customer query is a couple of points, so 200/min leaves ample
  // headroom. Concurrency 5 mirrors the delay-check worker.
  customerSyncWorker = new Worker("customer-sync", processCustomerSync, {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 200,
      duration: 60000,
    },
  });

  // Set up event listeners
  setupQueueEvents();

  logger.info("✅ Workers started (long-running process mode)");
}

function setupQueueEvents(): void {
  // Delay check queue events
  delayCheckWorker.on("completed", (job) => {
    logger.info(`✅ Delay check completed for job ${job.id}`);
  });

  delayCheckWorker.on("failed", (job, err) => {
    logger.error(`❌ Delay check failed for job ${job?.id}:`, err as Error);
  });

  // Notification queue events
  notificationWorker.on("completed", (job) => {
    logger.info(`✅ Notification sent for job ${job.id}`);
  });

  notificationWorker.on("failed", (job, err) => {
    logger.error(`❌ Notification failed for job ${job?.id}:`, err as Error);
  });

  // Global error handling
  delayCheckWorker.on("error", (err) => {
    logger.error("❌ Delay check worker error:", err);
  });

  notificationWorker.on("error", (err) => {
    logger.error("❌ Notification worker error:", err);
  });

  // Phase 2.1.a: customer-sync queue events
  customerSyncWorker.on("completed", (job) => {
    logger.info(`✅ Customer sync completed for job ${job.id}`);
  });

  customerSyncWorker.on("failed", (job, err) => {
    logger.error(`❌ Customer sync failed for job ${job?.id}:`, err as Error);
  });

  customerSyncWorker.on("error", (err) => {
    logger.error("❌ Customer sync worker error:", err);
  });
}

export async function addDelayCheckJob(data: {
  orderId: number;
  trackingNumber: string;
  carrierCode: string;
  shopDomain: string;
}): Promise<void> {
  if (!delayCheckQueue) {
    throw new Error("Delay check queue not initialized");
  }

  await delayCheckQueue.add("check-delay", data, {
    delay: 5000, // 5 second delay to allow for order processing
    jobId: `delay-check-${data.orderId}-${Date.now()}`,
  });
}

export async function addNotificationJob(data: {
  /** The delay_alerts row this notification completes (§6 R17). */
  alertId?: number;
  orderId: number;
  delayDetails: unknown;
  shopDomain: string;
  // Phase 2.1: Notification routing fields
  delayType?: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'TRANSIT_DELAY';
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantName?: string | null;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<void> {
  if (!notificationQueue) {
    throw new Error("Notification queue not initialized");
  }

  await notificationQueue.add("send-notification", data, {
    // Alert-scoped identity (§6 R17): one order can owe several notifications,
    // so an order-scoped job id names the wrong thing in queue diagnostics.
    jobId: `notification-${data.orderId}-${data.alertId ?? "na"}-${Date.now()}`,
  });
}

/**
 * Phase 2.1.a — enqueue a customer-sync job after an order is upserted.
 * Idempotent: re-running for the same (shopDomain, shopifyOrderId) just
 * re-UPSERTs customer_intelligence with the latest stats. The jobId
 * includes Date.now() so re-runs are deliberate (not deduped by BullMQ).
 */
export async function addCustomerSyncJob(data: {
  shopDomain: string;
  shopifyOrderId: string;
}): Promise<void> {
  if (!customerSyncQueue) {
    throw new Error("Customer sync queue not initialized");
  }

  await customerSyncQueue.add("sync-customer", data, {
    jobId: `customer-sync-${data.shopifyOrderId}-${Date.now()}`,
  });
}

export async function getQueueStats(): Promise<{
  delayCheck: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  notifications: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}> {
  if (!delayCheckQueue || !notificationQueue) {
    throw new Error("Queues not initialized");
  }

  const delayCheckStats = await delayCheckQueue.getJobCounts();
  const notificationStats = await notificationQueue.getJobCounts();

  return {
    delayCheck: {
      waiting: delayCheckStats.waiting,
      active: delayCheckStats.active,
      completed: delayCheckStats.completed,
      failed: delayCheckStats.failed,
    },
    notifications: {
      waiting: notificationStats.waiting,
      active: notificationStats.active,
      completed: notificationStats.completed,
      failed: notificationStats.failed,
    },
  };
}

export async function closeQueues(): Promise<void> {
  if (delayCheckWorker) {
    await delayCheckWorker.close();
  }
  if (notificationWorker) {
    await notificationWorker.close();
  }
  if (customerSyncWorker) {
    await customerSyncWorker.close();
  }
  if (redis) {
    await redis.quit();
  }
}

export { delayCheckQueue, notificationQueue, customerSyncQueue, redis };
