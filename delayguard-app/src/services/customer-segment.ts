/**
 * Customer segmentation pure function — Phase 2.1.a.
 *
 * Maps a customer's lifetime stats to one of five segments. Pure / no I/O /
 * deterministic — easy to retune thresholds without touching the sync
 * pipeline. Consumers: CustomerSyncService (writes the segment into
 * `customer_intelligence.segment`); Phase 2.2 priority-score will read it.
 *
 * Precedence highest-first (a customer that matches multiple rules takes
 * the first match in this order):
 *
 *   1. VIP        — ordersCount >= 5 OR totalSpent >= 1000
 *                   Plan source: IMPLEMENTATION_PLAN.md line 2108.
 *   2. At-Risk    — ordersCount >= 2 AND daysSinceLastOrder >= 90
 *                   A previously-repeat customer who has lapsed.
 *                   90-day cutoff matches Shopify's "Returning" segment.
 *   3. Gift-Buyer — ordersCount === 1 AND totalSpent >= 200 AND
 *                   !acceptsMarketing
 *                   Heuristic for one-off high-value purchases (gifts,
 *                   wedding registries) where the buyer hasn't opted into
 *                   marketing — retention plays are unlikely to convert.
 *   4. Repeat     — ordersCount >= 2 (active, not lapsed)
 *   5. New        — fallback (orders <= 1, low LTV)
 *
 * Boundaries are inclusive at the threshold (5 orders === VIP, 90 days
 * === At-Risk, $200 single-purchase === Gift-Buyer). The customer_segment
 * tests pin every boundary.
 */
export type CustomerSegment = "VIP" | "Repeat" | "New" | "At-Risk" | "Gift-Buyer";

export interface DeriveSegmentInput {
  ordersCount: number;
  totalSpent: number;
  daysSinceLastOrder: number;
  acceptsMarketing: boolean;
}

export function deriveSegment(input: DeriveSegmentInput): CustomerSegment {
  const { ordersCount, totalSpent, daysSinceLastOrder, acceptsMarketing } = input;

  if (ordersCount >= 5 || totalSpent >= 1000) return "VIP";
  if (ordersCount >= 2 && daysSinceLastOrder >= 90) return "At-Risk";
  if (ordersCount === 1 && totalSpent >= 200 && !acceptsMarketing) {
    return "Gift-Buyer";
  }
  if (ordersCount >= 2) return "Repeat";
  return "New";
}
