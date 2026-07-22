/**
 * Notification-dispatch cron sweep — LAUNCH_PLAN B1 (decision D4).
 *
 * Postgres is the durable notification queue: every detected delay writes
 * a delay_alerts row (delay-check processor) BEFORE any dispatch happens.
 * Each tick this sweep:
 *   - selects pending alerts (created in the last 7 days, at least one
 *     channel enabled + unsent + recipient present — mirroring the
 *     processor's own dispatch gates so disabled channels can't cause an
 *     infinite re-select loop), newest first;
 *   - synthesizes the NotificationJobData payload — including the Phase
 *     2.1 routing fields (warehouse → merchant, carrier/transit →
 *     customer, mirroring processors/delay-check.ts) — and invokes the
 *     EXISTING processor (processNotification) per alert;
 *   - finally discards the redundant BullMQ notification jobs (each one
 *     corresponds to a delay_alerts row this sweep already covers).
 *
 * processNotification re-checks email_sent/sms_sent itself, so
 * overlapping cron ticks cannot double-send.
 *
 * The processor module (processors/notification.ts) is owned by another
 * workstream and is treated as READ-ONLY: called, never modified.
 */
import { query } from "../../database/connection";
import { logger } from "../../utils/logger";
import { processNotification } from "../processors/notification";
import { notificationQueue } from "../setup";
import { asJob } from "./synth-job";

export interface NotificationSweepStats {
  alertsProcessed: number;
  errors: number;
}

interface PendingAlertRow {
  alert_id: number;
  order_id: number;
  delay_days: number | null;
  delay_reason: string | null;
  estimated_delivery_date: string | Date | null;
  customer_email: string | null;
  customer_phone: string | null;
  shop_domain: string;
  merchant_email: string | null;
  merchant_phone: string | null;
  merchant_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

export const NOTIFICATION_BATCH_SIZE = 25;
// 5s headroom under the 30s Vercel function cap.
const TIME_BUDGET_MS = 25_000;

type DelayType = "WAREHOUSE_DELAY" | "CARRIER_DELAY" | "TRANSIT_DELAY";

/**
 * Map the persisted delay_reason (delay-detection-service values:
 * WAREHOUSE_DELAY, STUCK_IN_TRANSIT, EVENT_DELAY, ETA_EXCEEDED) onto the
 * Phase 2.1 routing delayType.
 */
function toDelayType(delayReason: string | null): DelayType {
  if (delayReason === "WAREHOUSE_DELAY") {
    return "WAREHOUSE_DELAY";
  }
  if (delayReason === "STUCK_IN_TRANSIT") {
    return "TRANSIT_DELAY";
  }
  return "CARRIER_DELAY"; // EVENT_DELAY, ETA_EXCEEDED, unknown
}

async function discardRedundantQueueJobs(): Promise<void> {
  try {
    if (notificationQueue) {
      await notificationQueue.drain(true);
    }
  } catch (error) {
    logger.warn("Failed to drain redundant notification queue jobs", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function processNotificationSweep(): Promise<NotificationSweepStats> {
  const startedAt = Date.now();
  const stats: NotificationSweepStats = { alertsProcessed: 0, errors: 0 };

  try {
    const pending = await query<PendingAlertRow>(
      `
      SELECT
        da.id AS alert_id,
        da.order_id,
        da.delay_days,
        da.delay_reason,
        da.estimated_delivery_date,
        o.customer_email,
        o.customer_phone,
        s.shop_domain,
        s.merchant_email,
        s.merchant_phone,
        s.merchant_name,
        f.tracking_number,
        f.tracking_url
      FROM delay_alerts da
      JOIN orders o ON o.id = da.order_id
      JOIN shops s ON s.id = o.shop_id
      JOIN app_settings st ON st.shop_id = o.shop_id
      LEFT JOIN LATERAL (
        SELECT tracking_number, tracking_url
        FROM fulfillments
        WHERE order_id = o.id AND tracking_number IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      ) f ON TRUE
      WHERE da.created_at > NOW() - INTERVAL '7 days'
        AND (
          (st.email_enabled AND NOT da.email_sent AND o.customer_email IS NOT NULL)
          OR (st.sms_enabled AND NOT da.sms_sent AND o.customer_phone IS NOT NULL)
        )
      ORDER BY da.id DESC
      LIMIT $1
    `,
      [NOTIFICATION_BATCH_SIZE],
    );

    logger.info(`📨 Notification sweep: ${pending.length} pending alerts`);

    for (const alert of pending) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        logger.warn(
          "⏱️  Notification sweep time budget exhausted; stopping mid-batch",
          {
            processed: stats.alertsProcessed,
            remaining: pending.length - stats.alertsProcessed,
          },
        );
        break;
      }

      stats.alertsProcessed++;
      const delayType = toDelayType(alert.delay_reason);

      try {
        await processNotification(
          asJob({
            orderId: alert.order_id,
            delayDetails: {
              estimatedDelivery: alert.estimated_delivery_date
                ? new Date(alert.estimated_delivery_date).toISOString()
                : "",
              trackingNumber: alert.tracking_number ?? "",
              // Stored fulfillment tracking_url or empty — never a
              // fabricated placeholder link.
              trackingUrl: alert.tracking_url ?? "",
              delayDays: alert.delay_days ?? 0,
              delayReason: alert.delay_reason ?? "UNKNOWN",
            },
            delayType,
            // Phase 2.1 routing (mirrors processors/delay-check.ts):
            // warehouse delays → merchant; carrier/transit → customer.
            merchantEmail:
              delayType === "WAREHOUSE_DELAY" ? alert.merchant_email : undefined,
            merchantPhone:
              delayType === "WAREHOUSE_DELAY" ? alert.merchant_phone : undefined,
            merchantName:
              delayType === "WAREHOUSE_DELAY" ? alert.merchant_name : undefined,
            customerEmail:
              delayType !== "WAREHOUSE_DELAY"
                ? alert.customer_email ?? undefined
                : undefined,
            customerPhone:
              delayType !== "WAREHOUSE_DELAY"
                ? alert.customer_phone ?? undefined
                : undefined,
            shopDomain: alert.shop_domain,
          }),
        );
      } catch (error) {
        stats.errors++;
        logger.error(
          `Notification sweep failed for alert ${alert.alert_id}`,
          error as Error,
          { alertId: alert.alert_id, orderId: alert.order_id },
        );
      }
    }

    await discardRedundantQueueJobs();

    logger.info("✅ Notification sweep completed", {
      alertsProcessed: stats.alertsProcessed,
      errors: stats.errors,
      durationMs: Date.now() - startedAt,
    });

    return stats;
  } catch (error) {
    logger.error("Error in processNotificationSweep", error as Error);
    throw error;
  }
}
