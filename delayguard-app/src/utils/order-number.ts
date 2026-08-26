/**
 * Order-number display contract (LAUNCH_PLAN §6 R18).
 *
 * `orders.order_number` holds Shopify's `name` field, which already includes
 * whatever prefix the merchant configured — `#DG1001` on the dev store. Both
 * notification renderers add a `#` of their own (the SendGrid template's
 * `#{{orderNumber}}` and sms-service's `order #${…}`), so the first real
 * delay email went out reading `Order ##DG1001`.
 *
 * The contract: **the renderer owns the `#`, the data carries the bare
 * number.** Normalising here rather than in the templates keeps the two
 * channels consistent and needs no SendGrid template redeploy.
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.trim().replace(/^#+/, '');
}
