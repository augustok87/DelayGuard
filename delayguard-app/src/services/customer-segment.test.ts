/**
 * deriveSegment pure-fn tests
 *
 * Phase 2.1.a — Customer Intelligence. TDD-first per .claude/rules/tests.md.
 *
 * Segment precedence (highest priority wins) — see deriveSegment header for
 * rationale on each rule:
 *
 *   1. VIP        — numberOfOrders >= 5 OR amountSpent >= 1000
 *   2. At-Risk    — numberOfOrders >= 2 AND daysSinceLastOrder >= 90
 *   3. Gift-Buyer — numberOfOrders === 1 AND amountSpent >= 200 AND !emailMarketingSubscribed
 *   4. Repeat     — numberOfOrders >= 2
 *   5. New        — fallback
 *
 * Boundary edges at 5 orders / $1000 LTV / 90-day lapse / $200 single-purchase.
 */
import { deriveSegment } from "./customer-segment";

describe("deriveSegment", () => {
  it("returns VIP when numberOfOrders crosses the 5-order threshold (boundary)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 5,
        amountSpent: 0,
        daysSinceLastOrder: 0,
        emailMarketingSubscribed: true,
      }),
    ).toBe("VIP");
  });

  it("returns VIP when amountSpent crosses the $1000 LTV threshold (boundary) even at orders=1", () => {
    expect(
      deriveSegment({
        numberOfOrders: 1,
        amountSpent: 1000,
        daysSinceLastOrder: 0,
        emailMarketingSubscribed: true,
      }),
    ).toBe("VIP");
  });

  it("returns Repeat just below the VIP order-count threshold (4 orders, sub-$1000 LTV)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 4,
        amountSpent: 999,
        daysSinceLastOrder: 0,
        emailMarketingSubscribed: true,
      }),
    ).toBe("Repeat");
  });

  it("returns New just below the VIP LTV threshold at orders=1 (treats $999.99 as not-yet-VIP)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 1,
        amountSpent: 999.99,
        daysSinceLastOrder: 0,
        emailMarketingSubscribed: true,
      }),
    ).toBe("New");
  });

  it("returns At-Risk when a 2+-order customer crosses the 90-day lapse threshold (boundary)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 3,
        amountSpent: 500,
        daysSinceLastOrder: 90,
        emailMarketingSubscribed: true,
      }),
    ).toBe("At-Risk");
  });

  it("returns Gift-Buyer for a single high-value purchase by a non-subscriber (boundary at $200 LTV)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 1,
        amountSpent: 200,
        daysSinceLastOrder: 30,
        emailMarketingSubscribed: false,
      }),
    ).toBe("Gift-Buyer");
  });

  it("returns New for a low-value single purchase (under the Gift-Buyer LTV threshold)", () => {
    expect(
      deriveSegment({
        numberOfOrders: 1,
        amountSpent: 50,
        daysSinceLastOrder: 0,
        emailMarketingSubscribed: true,
      }),
    ).toBe("New");
  });

  it("returns Repeat for an active 2+-order customer who has not lapsed past 90 days", () => {
    expect(
      deriveSegment({
        numberOfOrders: 3,
        amountSpent: 400,
        daysSinceLastOrder: 15,
        emailMarketingSubscribed: true,
      }),
    ).toBe("Repeat");
  });
});
