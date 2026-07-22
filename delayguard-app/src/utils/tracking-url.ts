/**
 * Real tracking URLs (Launch WS-E, task E2).
 *
 * Replaces the placeholder tracking links in the delay-check
 * processor. Preference order (see resolveTrackingUrl):
 *   1. the fulfillment's stored `tracking_url` column (carrier-provided,
 *      persisted by FulfillmentPersistenceService)
 *   2. a carrier-pattern deep link built from carrier_code + tracking number
 *      (major carriers: UPS, USPS, FedEx, DHL)
 *   3. a generic tracking search as the last resort
 */

/**
 * Build a carrier deep link for a tracking number.
 *
 * Carrier codes are matched case-insensitively and tolerantly against
 * ShipEngine-style codes ('ups', 'usps', 'stamps_com', 'fedex',
 * 'fedex_ground', 'dhl_express', …). Order matters: 'usps' contains 'ups',
 * so USPS is matched first.
 *
 * Returns null when there is no tracking number (e.g. unfulfilled orders
 * flagged by the warehouse-delay rule).
 */
export function buildCarrierTrackingUrl(
  carrierCode: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!trackingNumber) {
    return null;
  }

  const encoded = encodeURIComponent(trackingNumber);
  const code = (carrierCode ?? "").toLowerCase();

  // USPS before UPS: 'ups' is a substring of 'usps'.
  if (code.includes("usps") || code.includes("stamps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  }
  if (code.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  }
  if (code.includes("dhl")) {
    return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encoded}`;
  }
  if (code.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encoded}`;
  }

  // Generic fallback: a search for the tracking number resolves the right
  // carrier page for virtually every carrier without hardcoding them all.
  return `https://www.google.com/search?q=${encoded}`;
}

/**
 * Resolve the best tracking URL for a shipment.
 * A stored (carrier-provided) URL always wins; empty strings are treated
 * as missing. Returns null only when nothing can be built.
 */
export function resolveTrackingUrl(
  storedTrackingUrl: string | null | undefined,
  carrierCode: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (storedTrackingUrl) {
    return storedTrackingUrl;
  }
  return buildCarrierTrackingUrl(carrierCode, trackingNumber);
}
