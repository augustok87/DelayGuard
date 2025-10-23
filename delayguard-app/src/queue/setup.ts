import { Queue, Worker } from "bullmq";
import { logger } from "../utils/logger";
import IORedis from "ioredis";
// import { QueueEvents } from 'bullmq'; // Available for future use
// import { AppConfig } from '../types'; // Available for future use
import { processDelayCheck } from "./processors/delay-check";
import { processNotification } from "./processors/notification";

let redis: IORedis;
let delayCheckQueue: Queue;
let notificationQueue: Queue;
let delayCheckWorker: Worker;
let notificationWorker: Worker;

export async function setupQueues(): Promise<void> {
  try {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }
    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
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

    // Create workers
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

    // Set up event listeners
    setupQueueEvents();

    logger.info("✅ Queues and workers initialized");
  } catch (error) {
    logger.error("Error setting up queues", error as Error);
    throw error;
  }
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
  orderId: number;
  delayDetails: unknown;
  shopDomain: string;
}): Promise<void> {
  if (!notificationQueue) {
    throw new Error("Notification queue not initialized");
  }

  await notificationQueue.add("send-notification", data, {
    jobId: `notification-${data.orderId}-${Date.now()}`,
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
  if (redis) {
    await redis.quit();
  }
}

export { delayCheckQueue, notificationQueue, redis };
