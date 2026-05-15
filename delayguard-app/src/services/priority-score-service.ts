/**
 * PriorityScoreService — Phase 2.1.b.
 *
 * One method: `scoreAlert(alertId)`. Hydrates the inputs the pure-fn
 * calculator needs, calls `calculatePriorityScore`, persists the result
 * to delay_alerts.priority_score + priority_level.
 *
 * Two DB reads (one if guest checkout) + one DB write:
 *   1. Alert + order + LEFT JOIN customer_intelligence (single JOIN).
 *   2. COUNT(*) of prior delays for same (shop_id, shopify_customer_id) —
 *      skipped when the order is a guest checkout (shopify_customer_id NULL).
 *   3. UPDATE delay_alerts SET priority_score = ?, priority_level = ?.
 *
 * Silent-skip on missing alert: defends against orphaned scoring calls
 * (per the prompt; the delay-check flow already guarantees existence).
 *
 * v1.19 field-population rule: the sibling test asserts every persisted
 * column appears in the UPDATE parameter array.
 *
 * Multi-tenant guard: churn query scopes on `o.shop_id` from the alert's
 * own order — never on a caller-supplied value. Same Wave 2.1 pattern as
 * MerchantApiService.
 */
import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { calculatePriorityScore, type PriorityLevel } from "./priority-score";
import type { CustomerSegment } from "./customer-segment";

interface AlertLookupRow {
  delay_days: number;
  shop_id: number;
  shopify_customer_id: string | null;
  total_amount: string | null;
  segment: string | null;
}

const CUSTOMER_SEGMENTS = new Set<CustomerSegment>([
  "VIP",
  "Repeat",
  "New",
  "At-Risk",
  "Gift-Buyer",
]);

function parseSegment(value: string | null): CustomerSegment | null {
  if (value === null) return null;
  return CUSTOMER_SEGMENTS.has(value as CustomerSegment)
    ? (value as CustomerSegment)
    : null;
}

function parseOrderTotal(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class PriorityScoreService {
  async scoreAlert(alertId: number): Promise<void> {
    const lookupRows = await query<AlertLookupRow>(
      `SELECT da.delay_days,
              o.shop_id,
              o.shopify_customer_id,
              o.total_amount,
              ci.segment
       FROM delay_alerts da
       JOIN orders o ON o.id = da.order_id
       LEFT JOIN customer_intelligence ci
         ON ci.shop_id = o.shop_id
        AND ci.shopify_customer_id = o.shopify_customer_id
       WHERE da.id = $1`,
      [alertId],
    );

    if (lookupRows.length === 0) {
      logger.info("Alert not found, skipping priority scoring", { alertId });
      return;
    }

    const row = lookupRows[0];

    let previousDelays = 0;
    if (row.shopify_customer_id !== null) {
      // Multi-tenant: scope on the alert's own order.shop_id. Exclude self
      // from the count so a freshly-stored alert doesn't inflate its own
      // churn signal.
      const churnRows = await query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM delay_alerts da
         JOIN orders o ON o.id = da.order_id
         WHERE o.shop_id = $1
           AND o.shopify_customer_id = $2
           AND da.id <> $3`,
        [row.shop_id, row.shopify_customer_id, alertId],
      );
      previousDelays = parseInt(churnRows[0]?.count ?? "0", 10);
    }

    const { score, level } = calculatePriorityScore({
      orderTotal: parseOrderTotal(row.total_amount),
      segment: parseSegment(row.segment),
      previousDelays,
      delayDays: row.delay_days,
    });

    await this.persistScore(alertId, score, level);
  }

  private async persistScore(
    alertId: number,
    score: number,
    level: PriorityLevel,
  ): Promise<void> {
    await query(
      `UPDATE delay_alerts
       SET priority_score = $1,
           priority_level = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [score, level, alertId],
    );
  }
}
