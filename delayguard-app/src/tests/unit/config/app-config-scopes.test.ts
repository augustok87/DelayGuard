/**
 * SHOPIFY_SCOPES parsing — R2 live-install fix (B1).
 *
 * Found on the live dev-store install attempt (2026-07-29): production's
 * `GET /auth?shop=…` redirected to Shopify with
 *
 *   scope=…%2Cread_products%2Cread_customers%0A
 *
 * The `%0A` is a trailing newline that rode along when SHOPIFY_SCOPES was
 * pasted into the Vercel dashboard. `read_customers\n` is not a valid
 * Shopify scope, so the OAuth grant is corrupt — the merchant either sees
 * an invalid_scope error or silently loses the read_customers grant that
 * Phase 2.1.a customer intelligence depends on.
 *
 * The env value is fixed separately, but the parser must not be able to
 * emit a whitespace-contaminated scope again: env vars picked up
 * whitespace once and will again.
 */
import { parseScopes, DEFAULT_SHOPIFY_SCOPES } from "../../../config/app-config";

describe("parseScopes (SHOPIFY_SCOPES)", () => {
  it("strips a trailing newline from the last scope (the live B1 defect)", () => {
    const raw =
      "read_orders,write_orders,read_fulfillments,write_fulfillments,read_products,read_customers\n";

    const scopes = parseScopes(raw);

    expect(scopes).toEqual([
      "read_orders",
      "write_orders",
      "read_fulfillments",
      "write_fulfillments",
      "read_products",
      "read_customers",
    ]);
    // Nothing that would survive URL-encoding into %0A / %20 / %0D.
    expect(scopes.every((scope: string) => !/\s/.test(scope))).toBe(true);
  });

  it("trims surrounding whitespace, CRLF and stray spaces around commas", () => {
    expect(parseScopes("  read_orders , write_orders\r\n")).toEqual([
      "read_orders",
      "write_orders",
    ]);
  });

  it("drops empty entries from trailing or doubled commas", () => {
    expect(parseScopes("read_orders,,write_orders,")).toEqual([
      "read_orders",
      "write_orders",
    ]);
  });

  it("falls back to the code defaults when unset, empty, or whitespace-only", () => {
    expect(parseScopes(undefined)).toEqual(DEFAULT_SHOPIFY_SCOPES);
    expect(parseScopes("")).toEqual(DEFAULT_SHOPIFY_SCOPES);
    expect(parseScopes("   \n  ")).toEqual(DEFAULT_SHOPIFY_SCOPES);
    expect(parseScopes(",,,")).toEqual(DEFAULT_SHOPIFY_SCOPES);
  });

  it("keeps read_customers in the defaults (Phase 2.1.a customer intelligence)", () => {
    expect(DEFAULT_SHOPIFY_SCOPES).toContain("read_customers");
    expect(DEFAULT_SHOPIFY_SCOPES).toContain("read_products");
  });
});
