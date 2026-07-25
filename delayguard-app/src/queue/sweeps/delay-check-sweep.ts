/**
 * Delay-check cron sweep — LAUNCH_PLAN B1 (decision D4: DB-driven cron
 * sweeps replace BullMQ Workers on Vercel).
 *
 * Every tick pulls a bounded batch of candidate orders straight from
 * Postgres and runs the EXISTING delay-check processor per order:
 *   - candidates: not delivered, created in the last 30 days, and with no
 *     delay_alert in the last 7 days (suppression window — the sweep
 *     re-scans periodically, unlike the old one-shot webhook trigger, and
 *     must not re-alert the same order every tick);
 *   - resumes from a Redis cursor (same pattern as tracking-refresh);
 *   - stops early when the 25s time budget is exhausted (30s Vercel cap);
 *   - finally discards the now-redundant webhook-enqueued BullMQ
 *     delay-check jobs — with no Workers they would otherwise accumulate
 *     in Redis forever, and every enqueued order is covered by this sweep.
 *
 * The processor module (processors/delay-check.ts) is owned by another
 * workstream and is treated as READ-ONLY: called, never modified.
 */
import { query } from "../../database/connection";
import { getRedisConnection } from "../../services/redis-connection";
import { logger } from "../../utils/logger";
import { processDelayCheck } from "../processors/delay-check";
import { delayCheckQueue } from "../setup";
import { asJob } from "./synth-job";

export interface DelayCheckSweepStats {
  ordersChecked: number;
  errors: number;
}

interface CandidateOrderRow {
  id: number;
  shop_domain: string;
  tracking_number: string | null;
  carrier_code: string | null;
}

export const DELAY_CHECK_BATCH_SIZE = 10;
// 5s headroom under the 30s Vercel function cap.
const TIME_BUDGET_MS = 25_000;
const CURSOR_KEY = "delay-check-sweep:cursor:last-id";

async function readCursor(): Promise<number> {
  try {
    const redis = await getRedisConnection();
    const raw = await redis.get(CURSOR_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    logger.error(
      "Failed to read delay-check-sweep cursor; starting from 0",
      error as Error,
    );
    return 0;
  }
}

async function writeCursor(value: number): Promise<void> {
  try {
    const redis = await getRedisConnection();
    await redis.set(CURSOR_KEY, String(value));
  } catch (error) {
    logger.error("Failed to persist delay-check-sweep cursor", error as Error);
  }
}

/**
 * Discard webhook-enqueued BullMQ delay-check jobs. The DB sweep covers
 * every candidate order, so queued jobs are redundant; without Workers
 * they would accumulate in Redis unboundedly. Best-effort.
 */
async function discardRedundantQueueJobs(): Promise<void> {
  try {
    if (delayCheckQueue) {
      await delayCheckQueue.drain(true); // true → also delayed jobs (producer adds use delay: 5000)
    }
  } catch (error) {
    logger.warn("Failed to drain redundant delay-check queue jobs", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function processDelayCheckSweep(): Promise<DelayCheckSweepStats> {
  const startedAt = Date.now();
  const stats: DelayCheckSweepStats = { ordersChecked: 0, errors: 0 };

  try {
    const cursor = await readCursor();

    const candidates = await query<CandidateOrderRow>(
      `
      SELECT
        o.id,
        s.shop_domain,
        f.tracking_number,
        f.carrier_code
      FROM orders o
      JOIN shops s ON s.id = o.shop_id
      LEFT JOIN LATERAL (
        SELECT tracking_number, carrier_code
        FROM fulfillments
        WHERE order_id = o.id AND tracking_number IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      ) f ON TRUE
      WHERE (o.tracking_status IS NULL OR o.tracking_status <> 'DELIVERED')
        AND o.created_at > NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM delay_alerts da
          WHERE da.order_id = o.id
            AND da.created_at > NOW() - INTERVAL '7 days'
        )
        AND o.id > $1
      ORDER BY o.id ASC
      LIMIT $2
    `,
      [cursor, DELAY_CHECK_BATCH_SIZE],
    );

    logger.info(
      `🔍 Delay-check sweep: ${candidates.length} candidate orders (cursor=${cursor})`,
    );

    if (candidates.length === 0) {
      if (cursor > 0) {
        await writeCursor(0);
      }
      await discardRedundantQueueJobs();
      return stats;
    }

    let lastProcessedId = cursor;

    for (const order of candidates) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        logger.warn(
          "⏱️  Delay-check sweep time budget exhausted; stopping mid-batch",
          {
            processed: stats.ordersChecked,
            remaining: candidates.length - stats.ordersChecked,
          },
        );
        break;
      }

      stats.ordersChecked++;
      try {
        await processDelayCheck(
          asJob({
            orderId: order.id,
            // Empty strings → processor skips carrier/transit rules and
            // still evaluates the warehouse rule for unfulfilled orders.
            trackingNumber: order.tracking_number ?? "",
            carrierCode: order.carrier_code ?? "",
            shopDomain: order.shop_domain,
          }),
        );
      } catch (error) {
        stats.errors++;
        logger.error(
          `Delay-check sweep failed for order ${order.id}`,
          error as Error,
          { orderId: order.id },
        );
      }
      // Advance on failure too — a permanently-failing order must not
      // block subsequent ticks; reset-on-drain retries it next sweep.
      lastProcessedId = order.id;
    }

    if (candidates.length < DELAY_CHECK_BATCH_SIZE) {
      await writeCursor(0);
    } else {
      await writeCursor(lastProcessedId);
    }

    await discardRedundantQueueJobs();

    logger.info("✅ Delay-check sweep completed", {
      ordersChecked: stats.ordersChecked,
      errors: stats.errors,
      lastProcessedId,
      durationMs: Date.now() - startedAt,
    });

    return stats;
  } catch (error) {
    logger.error("Error in processDelayCheckSweep", error as Error);
    throw error;
  }
}
