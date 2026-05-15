/**
 * deriveSegment pure-fn tests
 *
 * Phase 2.1.a — Customer Intelligence. TDD-first per .claude/rules/tests.md.
 *
 * Segment precedence (highest priority wins) — see deriveSegment header for
 * rationale on each rule:
 *
 *   1. VIP        — ordersCount >= 5 OR totalSpent >= 1000
 *   2. At-Risk    — ordersCount >= 2 AND daysSinceLastOrder >= 90
 *   3. Gift-Buyer — ordersCount === 1 AND totalSpent >= 200 AND !acceptsMarketing
 *   4. Repeat     — ordersCount >= 2
 *   5. New        — fallback
 *
 * Boundary edges at 5 orders / $1000 LTV / 90-day lapse / $200 single-purchase.
 */
import { deriveSegment } from "./customer-segment";

describe("deriveSegment", () => {
  it("returns VIP when ordersCount crosses the 5-order threshold (boundary)", () => {
    expect(
      deriveSegment({
        ordersCount: 5,
        totalSpent: 0,
        daysSinceLastOrder: 0,
        acceptsMarketing: true,
      }),
    ).toBe("VIP");
  });

  it("returns VIP when totalSpent crosses the $1000 LTV threshold (boundary) even at orders=1", () => {
    expect(
      deriveSegment({
        ordersCount: 1,
        totalSpent: 1000,
        daysSinceLastOrder: 0,
        acceptsMarketing: true,
      }),
    ).toBe("VIP");
  });

  it("returns Repeat just below the VIP order-count threshold (4 orders, sub-$1000 LTV)", () => {
    expect(
      deriveSegment({
        ordersCount: 4,
        totalSpent: 999,
        daysSinceLastOrder: 0,
        acceptsMarketing: true,
      }),
    ).toBe("Repeat");
  });

  it("returns New just below the VIP LTV threshold at orders=1 (treats $999.99 as not-yet-VIP)", () => {
    expect(
      deriveSegment({
        ordersCount: 1,
        totalSpent: 999.99,
        daysSinceLastOrder: 0,
        acceptsMarketing: true,
      }),
    ).toBe("New");
  });

  it("returns At-Risk when a 2+-order customer crosses the 90-day lapse threshold (boundary)", () => {
    expect(
      deriveSegment({
        ordersCount: 3,
        totalSpent: 500,
        daysSinceLastOrder: 90,
        acceptsMarketing: true,
      }),
    ).toBe("At-Risk");
  });

  it("returns Gift-Buyer for a single high-value purchase by a non-subscriber (boundary at $200 LTV)", () => {
    expect(
      deriveSegment({
        ordersCount: 1,
        totalSpent: 200,
        daysSinceLastOrder: 30,
        acceptsMarketing: false,
      }),
    ).toBe("Gift-Buyer");
  });

  it("returns New for a low-value single purchase (under the Gift-Buyer LTV threshold)", () => {
    expect(
      deriveSegment({
        ordersCount: 1,
        totalSpent: 50,
        daysSinceLastOrder: 0,
        acceptsMarketing: true,
      }),
    ).toBe("New");
  });

  it("returns Repeat for an active 2+-order customer who has not lapsed past 90 days", () => {
    expect(
      deriveSegment({
        ordersCount: 3,
        totalSpent: 400,
        daysSinceLastOrder: 15,
        acceptsMarketing: true,
      }),
    ).toBe("Repeat");
  });
});
