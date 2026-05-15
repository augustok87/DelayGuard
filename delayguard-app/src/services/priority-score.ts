/**
 * Priority score pure function — Phase 2.1.b.
 *
 * Maps an alert + its order + the cached customer-intelligence state to a
 * 0-100 priority score with a four-axis breakdown:
 *
 *   - orderValue   (0-30) — captured order total bands
 *   - customerValue (0-40) — segment band (VIP > New > Repeat = Gift-Buyer > At-Risk)
 *   - churnRisk    (0-20) — count of prior delay alerts on same customer
 *   - urgency      (0-10) — delay-days bands
 *
 * Pure / no I/O / deterministic. Caller (PriorityScoreService) is responsible
 * for hydrating the inputs from delay_alerts + orders + customer_intelligence
 * + a COUNT(*) of prior delays — see the sibling service for the DB plumbing.
 *
 * Q3 fallback (locked v1.49): when the customer's segment is null at scoring
 * time (guest checkout OR customer-sync hasn't yet completed for an
 * identified customer), customerValue scores a neutral 20 — middle of the
 * 0-40 band, neither penalising guests nor pre-judging non-guest customers
 * whose intelligence row will appear shortly. Phase 2.2.c will introduce a
 * re-score hook at the end of customer-sync.ts to heal stale scores from
 * the race window.
 *
 * Boundary discipline: every cutoff is inclusive at the threshold. See the
 * sibling priority-score.test.ts for the exhaustive boundary suite.
 */
import type { CustomerSegment } from "./customer-segment";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export interface PriorityScoreFactors {
  orderValue: number;
  customerValue: number;
  churnRisk: number;
  urgency: number;
}

export interface PriorityScoreResult {
  score: number;
  level: PriorityLevel;
  factors: PriorityScoreFactors;
}

export interface PriorityScoreInput {
  /** Captured order total in shop currency. `null` for legacy rows that
   * predate v1.49's orders.total_amount column OR webhooks that omit
   * total_price. Falls back to the lowest band (5pt). */
  orderTotal: number | null;
  /** Customer segment from `customer_intelligence.segment`, or `null` if
   * no row exists (guest checkout OR pre-sync race). Q3 fallback → 20pt. */
  segment: CustomerSegment | null;
  /** Count of prior delay alerts for the same (shop_id, shopify_customer_id),
   * excluding the alert being scored. `0` for guest customers (no stable
   * identity to count against). */
  previousDelays: number;
  /** Alert's delay-days value from delay_alerts.delay_days. */
  delayDays: number;
}

function orderValueBand(total: number | null): number {
  if (total === null) return 5;
  if (total >= 500) return 30;
  if (total >= 300) return 25;
  if (total >= 200) return 20;
  if (total >= 100) return 15;
  if (total >= 50) return 10;
  return 5;
}

function customerValueBand(segment: CustomerSegment | null): number {
  if (segment === null) return 20; // Q3 fallback
  switch (segment) {
    case "VIP":
      return 40;
    case "New":
      return 30;
    case "Repeat":
    case "Gift-Buyer":
      return 25;
    case "At-Risk":
      return 15;
  }
}

function churnRiskBand(previousDelays: number): number {
  if (previousDelays >= 2) return 20;
  if (previousDelays === 1) return 15;
  return 5;
}

function urgencyBand(delayDays: number): number {
  if (delayDays >= 7) return 10;
  if (delayDays >= 5) return 8;
  if (delayDays >= 3) return 5;
  return 2;
}

function levelFor(score: number): PriorityLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function calculatePriorityScore(
  input: PriorityScoreInput,
): PriorityScoreResult {
  const factors: PriorityScoreFactors = {
    orderValue: orderValueBand(input.orderTotal),
    customerValue: customerValueBand(input.segment),
    churnRisk: churnRiskBand(input.previousDelays),
    urgency: urgencyBand(input.delayDays),
  };
  const score =
    factors.orderValue + factors.customerValue + factors.churnRisk + factors.urgency;
  return { score, level: levelFor(score), factors };
}
