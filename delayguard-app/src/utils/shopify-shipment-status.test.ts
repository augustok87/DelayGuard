import { mapShopifyShipmentStatus } from './shopify-shipment-status';

/**
 * LAUNCH_PLAN §6 R24 — the carrier-independent delay source.
 *
 * Shopify polls the carriers it supports and pushes the result to us as
 * `shipment_status` on the fulfillments/updated webhook. We have been
 * receiving that field since the webhook was registered and discarding it:
 * FulfillmentWebhookPayload declares it, and upsertFulfillment never writes
 * it. Mapping it onto the internal vocabulary is what lets RULE 3
 * (STUCK_IN_TRANSIT) fire without any carrier API at all.
 *
 * Shopify's value set — verified against shopify.dev 2026-08-27 — carries no
 * "delayed" member, so this source can never produce DELAYED. That is the
 * honest limit of the fallback, and the test below pins it so nobody later
 * assumes otherwise.
 */
describe('mapShopifyShipmentStatus', () => {
  it.each([
    ['delivered', 'DELIVERED'],
    ['out_for_delivery', 'OUT_FOR_DELIVERY'],
    ['ready_for_pickup', 'OUT_FOR_DELIVERY'],
    ['in_transit', 'IN_TRANSIT'],
    ['confirmed', 'ACCEPTED'],
    ['label_printed', 'ACCEPTED'],
    ['label_purchased', 'ACCEPTED'],
    ['attempted_delivery', 'EXCEPTION'],
    ['failure', 'EXCEPTION'],
  ])('maps Shopify "%s" to %s', (shopifyStatus, expected) => {
    expect(mapShopifyShipmentStatus(shopifyStatus)).toBe(expected);
  });

  it('returns null when Shopify sends no shipment_status', () => {
    expect(mapShopifyShipmentStatus(undefined)).toBeNull();
  });

  it('returns null for an empty string rather than writing a blank status', () => {
    expect(mapShopifyShipmentStatus('')).toBeNull();
  });

  // Returning null — rather than "UNKNOWN" — matters: the caller skips the
  // write entirely, so a value Shopify adds later cannot overwrite a good
  // status with a meaningless one.
  it('returns null for a status Shopify adds later', () => {
    expect(mapShopifyShipmentStatus('teleported')).toBeNull();
  });

  it('tolerates the uppercase spelling some Shopify APIs use', () => {
    expect(mapShopifyShipmentStatus('IN_TRANSIT')).toBe('IN_TRANSIT');
  });

  /**
   * The capability boundary, pinned deliberately. Shopify reports that a
   * delivery was ATTEMPTED and that tracking FAILED, but never that a parcel
   * is running late — so RULE 2's DELAYED_STATUS branch stays dark on this
   * source and RULE 3's time-based check is what actually catches lateness.
   */
  it('never produces DELAYED — Shopify has no such status', () => {
    const everyShopifyStatus = [
      'label_printed', 'label_purchased', 'attempted_delivery',
      'ready_for_pickup', 'confirmed', 'in_transit', 'out_for_delivery',
      'delivered', 'failure',
    ];

    const mapped = everyShopifyStatus.map(mapShopifyShipmentStatus);

    expect(mapped).not.toContain('DELAYED');
  });
});
