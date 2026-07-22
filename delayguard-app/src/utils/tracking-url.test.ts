/**
 * tracking-url — sibling tests (Launch WS-E, task E2).
 *
 * buildCarrierTrackingUrl: carrier-pattern deep links for the major carriers
 * (UPS / USPS / FedEx / DHL) with a generic search fallback.
 * resolveTrackingUrl: stored fulfillment tracking_url wins over patterns.
 */

import {
  buildCarrierTrackingUrl,
  resolveTrackingUrl,
} from "./tracking-url";

describe("buildCarrierTrackingUrl", () => {
  const tn = "1Z999AA1234567890";

  it("builds the UPS deep link for carrier code 'ups'", () => {
    expect(buildCarrierTrackingUrl("ups", tn)).toBe(
      `https://www.ups.com/track?tracknum=${tn}`,
    );
  });

  it("builds the USPS deep link for carrier code 'usps'", () => {
    expect(buildCarrierTrackingUrl("usps", "9400111899223100001111")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223100001111",
    );
  });

  it("does NOT mis-route 'usps' to UPS ('ups' is a substring of 'usps' — ordering trap)", () => {
    const url = buildCarrierTrackingUrl("usps", tn);
    expect(url).toContain("usps.com");
    expect(url).not.toContain("www.ups.com");
  });

  it("maps ShipEngine's 'stamps_com' code to USPS", () => {
    expect(buildCarrierTrackingUrl("stamps_com", tn)).toContain(
      "tools.usps.com",
    );
  });

  it("builds the FedEx deep link for carrier code 'fedex'", () => {
    expect(buildCarrierTrackingUrl("fedex", "271999999999")).toBe(
      "https://www.fedex.com/fedextrack/?trknbr=271999999999",
    );
  });

  it("builds the DHL deep link for carrier code 'dhl'", () => {
    expect(buildCarrierTrackingUrl("dhl", "JD014600003828000000")).toBe(
      "https://www.dhl.com/global-en/home/tracking.html?tracking-id=JD014600003828000000",
    );
  });

  it("maps carrier-code variants case-insensitively ('UPS', 'dhl_express', 'fedex_ground')", () => {
    expect(buildCarrierTrackingUrl("UPS", tn)).toContain("www.ups.com");
    expect(buildCarrierTrackingUrl("dhl_express", tn)).toContain("dhl.com");
    expect(buildCarrierTrackingUrl("fedex_ground", tn)).toContain("fedex.com");
  });

  it("falls back to a generic tracking search for unknown carriers", () => {
    expect(buildCarrierTrackingUrl("canada_post", "CA123456789")).toBe(
      "https://www.google.com/search?q=CA123456789",
    );
  });

  it("falls back to the generic search when the carrier code is missing", () => {
    expect(buildCarrierTrackingUrl(undefined, tn)).toBe(
      `https://www.google.com/search?q=${tn}`,
    );
    expect(buildCarrierTrackingUrl(null, tn)).toBe(
      `https://www.google.com/search?q=${tn}`,
    );
  });

  it("URL-encodes the tracking number in every pattern", () => {
    expect(buildCarrierTrackingUrl("ups", "AB 12&34")).toBe(
      "https://www.ups.com/track?tracknum=AB%2012%2634",
    );
    expect(buildCarrierTrackingUrl("unknown", "AB 12&34")).toBe(
      "https://www.google.com/search?q=AB%2012%2634",
    );
  });

  it("returns null when there is no tracking number (unfulfilled orders)", () => {
    expect(buildCarrierTrackingUrl("ups", "")).toBeNull();
    expect(buildCarrierTrackingUrl("ups", null)).toBeNull();
    expect(buildCarrierTrackingUrl("ups", undefined)).toBeNull();
  });
});

describe("resolveTrackingUrl", () => {
  it("prefers the fulfillment's stored tracking_url when present", () => {
    expect(
      resolveTrackingUrl(
        "https://carrier.example-store.com/track/XYZ",
        "ups",
        "1Z999AA1234567890",
      ),
    ).toBe("https://carrier.example-store.com/track/XYZ");
  });

  it("falls back to the carrier pattern when no stored URL exists", () => {
    expect(resolveTrackingUrl(null, "ups", "1Z999AA1234567890")).toBe(
      "https://www.ups.com/track?tracknum=1Z999AA1234567890",
    );
  });

  it("ignores an empty-string stored URL (treated as missing)", () => {
    expect(resolveTrackingUrl("", "fedex", "271999999999")).toBe(
      "https://www.fedex.com/fedextrack/?trknbr=271999999999",
    );
  });

  it("returns null when there is neither a stored URL nor a tracking number", () => {
    expect(resolveTrackingUrl(null, "ups", null)).toBeNull();
    expect(resolveTrackingUrl(undefined, undefined, undefined)).toBeNull();
  });
});
