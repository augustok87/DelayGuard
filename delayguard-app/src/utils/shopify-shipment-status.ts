/**
 * Shopify's own carrier tracking, mapped onto DelayGuard's internal status
 * vocabulary.
 *
 * Shopify polls the carriers on its supported list and pushes the result as
 * `shipment_status` on the fulfillments/updated webhook — data we already
 * receive for free, with no carrier API, no vendor account and no API key.
 * It is what keeps delay detection alive when the carrier API is unavailable
 * (LAUNCH_PLAN §6 R24).
 *
 * The value set has no "delayed" member, so this source never yields DELAYED.
 * Lateness is caught by RULE 3's time-based STUCK_IN_TRANSIT check reading
 * orders.tracking_status and orders.last_tracking_update.
 */
const INTERNAL_STATUS_BY_SHOPIFY_STATUS: Record<string, string> = {
  delivered: "DELIVERED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  ready_for_pickup: "OUT_FOR_DELIVERY",
  in_transit: "IN_TRANSIT",
  confirmed: "ACCEPTED",
  label_printed: "ACCEPTED",
  label_purchased: "ACCEPTED",
  attempted_delivery: "EXCEPTION",
  failure: "EXCEPTION",
};

/**
 * @returns the internal status, or null when Shopify sent nothing we
 * recognise. Null means "do not write" rather than "unknown", so a value
 * Shopify introduces later cannot overwrite a good status with a useless one.
 */
export function mapShopifyShipmentStatus(
  shipmentStatus: string | undefined | null,
): string | null {
  if (!shipmentStatus) {
    return null;
  }

  return (
    INTERNAL_STATUS_BY_SHOPIFY_STATUS[shipmentStatus.toLowerCase()] ?? null
  );
}
