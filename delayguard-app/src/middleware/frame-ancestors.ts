/**
 * Per-shop `frame-ancestors` for the embedded admin iframe (LAUNCH_PLAN R6).
 *
 * shopify.dev: the header must be
 * `Content-Security-Policy: frame-ancestors https://<shop>.myshopify.com
 * https://admin.shopify.com;`, it must be present on "any routes that render
 * HTML content", and it "must be different for every shop" — so the wildcard
 * this replaces (`https://*.myshopify.com`) let any Shopify store frame the
 * app and did not satisfy the requirement.
 *
 * The shop is read from the query string, which the merchant's browser (and
 * therefore anyone) controls, so it is validated to a myshopify.com host
 * before it is interpolated into a header. Anything else falls back to
 * `'none'` rather than being echoed back.
 */

/**
 * `<store-handle>.myshopify.com`. Anchored, so a value carrying a space,
 * `;`, CR or LF — the characters that would append a directive or split the
 * header — cannot match.
 */
const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

const ADMIN_ORIGIN = "https://admin.shopify.com";

export function isValidShopDomain(shop: unknown): shop is string {
  return (
    typeof shop === "string" && shop.length <= 255 && SHOP_DOMAIN.test(shop)
  );
}

/**
 * The `frame-ancestors` directive for this request. Returned without a
 * trailing `;` so callers can join it into a larger policy.
 */
export function frameAncestorsDirective(shop: unknown): string {
  return isValidShopDomain(shop)
    ? `frame-ancestors https://${shop} ${ADMIN_ORIGIN}`
    : "frame-ancestors 'none'";
}
