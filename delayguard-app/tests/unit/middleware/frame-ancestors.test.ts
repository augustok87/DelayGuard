/**
 * Per-shop `frame-ancestors` — LAUNCH_PLAN §6 R6.
 *
 * shopify.dev requires the framed document to send
 * `Content-Security-Policy: frame-ancestors https://<shop>.myshopify.com
 * https://admin.shopify.com;` on "any routes that render HTML content", and
 * states the directive "must be different for every shop". The previous
 * value was a wildcard (`https://*.myshopify.com`), which satisfies neither
 * clause — any Shopify store could frame the app.
 *
 * The shop comes from the query string, so it is attacker-controlled: it is
 * validated against the myshopify.com host shape before it reaches a header,
 * or the response falls back to `'none'`.
 */
import {
  frameAncestorsDirective,
  isValidShopDomain,
} from "../../../src/middleware/frame-ancestors";

describe("isValidShopDomain", () => {
  it("accepts a real myshopify.com host", () => {
    expect(isValidShopDomain("delayguard-dev.myshopify.com")).toBe(true);
  });

  it("rejects hosts outside myshopify.com", () => {
    expect(isValidShopDomain("evil.com")).toBe(false);
    expect(isValidShopDomain("myshopify.com")).toBe(false);
    expect(isValidShopDomain("shop.myshopify.com.evil.com")).toBe(false);
  });

  it("rejects non-string and empty input", () => {
    expect(isValidShopDomain(undefined)).toBe(false);
    expect(isValidShopDomain(null)).toBe(false);
    expect(isValidShopDomain("")).toBe(false);
    expect(isValidShopDomain(["a.myshopify.com"])).toBe(false);
  });

  it("rejects values carrying CSP or header-injection characters", () => {
    // A bare `;` would let a caller append their own directive; CR/LF would
    // split the header entirely.
    expect(isValidShopDomain("a.myshopify.com; frame-ancestors *")).toBe(false);
    expect(isValidShopDomain("a.myshopify.com\r\nX-Injected: 1")).toBe(false);
    expect(isValidShopDomain("a.myshopify.com https://evil.com")).toBe(false);
  });
});

describe("frameAncestorsDirective", () => {
  it("names the specific shop alongside the Shopify admin", () => {
    expect(frameAncestorsDirective("delayguard-dev.myshopify.com")).toBe(
      "frame-ancestors https://delayguard-dev.myshopify.com https://admin.shopify.com",
    );
  });

  it("differs per shop — the requirement a wildcard cannot meet", () => {
    expect(frameAncestorsDirective("shop-a.myshopify.com")).not.toBe(
      frameAncestorsDirective("shop-b.myshopify.com"),
    );
  });

  it("never emits a wildcard host", () => {
    expect(frameAncestorsDirective("shop-a.myshopify.com")).not.toContain("*");
  });

  it("falls back to 'none' when the shop is absent or untrusted", () => {
    expect(frameAncestorsDirective(undefined)).toBe("frame-ancestors 'none'");
    expect(frameAncestorsDirective("evil.com")).toBe("frame-ancestors 'none'");
  });
});
