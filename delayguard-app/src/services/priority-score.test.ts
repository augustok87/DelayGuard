/**
 * Phase 2.1.b — priority-score pure-fn tests.
 *
 * Pure-fn boundary coverage per IMPLEMENTATION_PLAN.md §2.2 (lines 2200-2280)
 * with Gift-Buyer added (v1.48) and confirmed band = 25 (same as Repeat).
 *
 * Four axes:
 *   - orderValue  (0-30) by orderTotal bands: 500/300/200/100/50/else
 *   - customerValue (0-40) by segment: VIP=40, New=30, Repeat=25, Gift-Buyer=25,
 *                          At-Risk=15, missing/null=20 (Q3 neutral fallback)
 *   - churnRisk   (0-20) by previousDelays count: >=2=20, ==1=15, 0=5
 *   - urgency     (0-10) by delayDays bands: 7+/5+/3+/else
 *
 * Sum -> priorityLevel: >=80 Critical, >=60 High, >=40 Medium, <40 Low.
 *
 * Boundary discipline: each band cutoff is tested on the threshold itself
 * (e.g. orderTotal === 500 must score 30, not 25).
 */
import {
  calculatePriorityScore,
  PriorityScoreInput,
} from "./priority-score";
import type { CustomerSegment } from "./customer-segment";

function input(overrides: Partial<PriorityScoreInput> = {}): PriorityScoreInput {
  return {
    orderTotal: 100,
    segment: "New",
    previousDelays: 0,
    delayDays: 1,
    ...overrides,
  };
}

describe("calculatePriorityScore", () => {
  describe("orderValue axis (0-30)", () => {
    it("scores 30 at the $500 threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ orderTotal: 500 })).factors.orderValue).toBe(30);
    });

    it("scores 25 at the $300 threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ orderTotal: 300 })).factors.orderValue).toBe(25);
    });

    it("scores 20 at the $200 threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ orderTotal: 200 })).factors.orderValue).toBe(20);
    });

    it("scores 15 at the $100 threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ orderTotal: 100 })).factors.orderValue).toBe(15);
    });

    it("scores 10 at the $50 threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ orderTotal: 50 })).factors.orderValue).toBe(10);
    });

    it("scores 5 below the $50 threshold", () => {
      expect(calculatePriorityScore(input({ orderTotal: 49.99 })).factors.orderValue).toBe(5);
    });

    it("scores 5 when orderTotal is null (no captured total — fallback to lowest band)", () => {
      // total_amount is nullable on orders for legacy rows + edge-case webhooks
      // that omit total_price. Lowest-band fallback is intentional — alerts
      // without an order total cannot be high-priority on that axis.
      expect(calculatePriorityScore(input({ orderTotal: null })).factors.orderValue).toBe(5);
    });
  });

  describe("customerValue axis (0-40)", () => {
    it("scores 40 for VIP", () => {
      expect(calculatePriorityScore(input({ segment: "VIP" })).factors.customerValue).toBe(40);
    });

    it("scores 30 for New (first-impression bonus per plan)", () => {
      expect(calculatePriorityScore(input({ segment: "New" })).factors.customerValue).toBe(30);
    });

    it("scores 25 for Repeat", () => {
      expect(calculatePriorityScore(input({ segment: "Repeat" })).factors.customerValue).toBe(25);
    });

    it("scores 25 for Gift-Buyer (band = Repeat, locked v1.49)", () => {
      // Plan predates this segment; v1.48 added it. The band reflects
      // moderate retention upside despite high single-order value — the
      // buyer has opted out of marketing per the deriveSegment rule.
      expect(calculatePriorityScore(input({ segment: "Gift-Buyer" })).factors.customerValue).toBe(25);
    });

    it("scores 15 for At-Risk", () => {
      expect(calculatePriorityScore(input({ segment: "At-Risk" })).factors.customerValue).toBe(15);
    });

    it("scores 20 when segment is null (Q3 neutral fallback)", () => {
      // Guest checkout OR customer-sync race: customer_intelligence row is
      // missing at scoring time. Neutral 20 (mid-band) preserves a fair
      // priority for non-guest customers whose sync hasn't yet completed;
      // Phase 2.2.c re-score follow-up will heal stale scores.
      expect(calculatePriorityScore(input({ segment: null })).factors.customerValue).toBe(20);
    });
  });

  describe("churnRisk axis (0-20)", () => {
    it("scores 20 when previousDelays >= 2", () => {
      expect(calculatePriorityScore(input({ previousDelays: 2 })).factors.churnRisk).toBe(20);
    });

    it("scores 20 when previousDelays is high (e.g. 5)", () => {
      expect(calculatePriorityScore(input({ previousDelays: 5 })).factors.churnRisk).toBe(20);
    });

    it("scores 15 when previousDelays === 1", () => {
      expect(calculatePriorityScore(input({ previousDelays: 1 })).factors.churnRisk).toBe(15);
    });

    it("scores 5 when previousDelays === 0", () => {
      expect(calculatePriorityScore(input({ previousDelays: 0 })).factors.churnRisk).toBe(5);
    });
  });

  describe("urgency axis (0-10)", () => {
    it("scores 10 at the 7-day delay threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ delayDays: 7 })).factors.urgency).toBe(10);
    });

    it("scores 8 at the 5-day delay threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ delayDays: 5 })).factors.urgency).toBe(8);
    });

    it("scores 5 at the 3-day delay threshold (inclusive)", () => {
      expect(calculatePriorityScore(input({ delayDays: 3 })).factors.urgency).toBe(5);
    });

    it("scores 2 below the 3-day threshold", () => {
      expect(calculatePriorityScore(input({ delayDays: 1 })).factors.urgency).toBe(2);
    });
  });

  describe("total score + level", () => {
    it("returns Critical for score >= 80", () => {
      // VIP(40) + $500(30) + 2 delays(20) + 7d(10) = 100
      const result = calculatePriorityScore({
        orderTotal: 500,
        segment: "VIP",
        previousDelays: 2,
        delayDays: 7,
      });
      expect(result.score).toBe(100);
      expect(result.level).toBe("Critical");
    });

    it("returns Critical at the 80 boundary (inclusive)", () => {
      // VIP(40) + $300(25) + 1 delay(15) + 0 (urgency=2 since delayDays<3) = 82
      // Adjust to hit exactly 80: VIP(40) + $200(20) + 1 delay(15) + 5d(8) = 83. Need 80.
      // VIP(40) + $100(15) + 1 delay(15) + 7d(10) = 80
      const result = calculatePriorityScore({
        orderTotal: 100,
        segment: "VIP",
        previousDelays: 1,
        delayDays: 7,
      });
      expect(result.score).toBe(80);
      expect(result.level).toBe("Critical");
    });

    it("returns High at the 60 boundary (inclusive)", () => {
      // New(30) + $100(15) + 0 delays(5) + 7d(10) = 60
      const result = calculatePriorityScore({
        orderTotal: 100,
        segment: "New",
        previousDelays: 0,
        delayDays: 7,
      });
      expect(result.score).toBe(60);
      expect(result.level).toBe("High");
    });

    it("returns Medium at the 40 boundary (inclusive)", () => {
      // At-Risk(15) + $50(10) + 1 delay(15) + 1d(2) = 42  -- close, need exact
      // Q3 fallback(20) + $50(10) + 0(5) + 3d(5) = 40
      const result = calculatePriorityScore({
        orderTotal: 50,
        segment: null,
        previousDelays: 0,
        delayDays: 3,
      });
      expect(result.score).toBe(40);
      expect(result.level).toBe("Medium");
    });

    it("returns Low below 40", () => {
      // At-Risk(15) + $0(5) + 0(5) + 1d(2) = 27
      const result = calculatePriorityScore({
        orderTotal: 0,
        segment: "At-Risk",
        previousDelays: 0,
        delayDays: 1,
      });
      expect(result.score).toBe(27);
      expect(result.level).toBe("Low");
    });

    it("Q3-fallback guest checkout with $200 order + 1d delay = 47 Medium", () => {
      // Guest case: orderTotal $200(20) + null segment Q3(20) + 0 delays(5) + 1d(2) = 47
      // Documents the realistic guest-checkout score so the fallback's
      // effect on the priority band is visible in test output.
      const result = calculatePriorityScore({
        orderTotal: 200,
        segment: null,
        previousDelays: 0,
        delayDays: 1,
      });
      expect(result.score).toBe(47);
      expect(result.level).toBe("Medium");
      expect(result.factors).toEqual({
        orderValue: 20,
        customerValue: 20,
        churnRisk: 5,
        urgency: 2,
      });
    });
  });

  it("each segment maps to one customerValue band — exhaustive sanity check", () => {
    const segments: Array<{ segment: CustomerSegment | null; expected: number }> = [
      { segment: "VIP", expected: 40 },
      { segment: "New", expected: 30 },
      { segment: "Repeat", expected: 25 },
      { segment: "Gift-Buyer", expected: 25 },
      { segment: "At-Risk", expected: 15 },
      { segment: null, expected: 20 },
    ];
    for (const { segment, expected } of segments) {
      expect(calculatePriorityScore(input({ segment })).factors.customerValue).toBe(expected);
    }
  });
});
