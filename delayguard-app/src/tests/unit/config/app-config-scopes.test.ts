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
 *
 * The fixtures below use only scopes the app declares, because the parser
 * now drops anything outside DEFAULT_SHOPIFY_SCOPES (see R39, at the foot of
 * this file). They still fail if trimming is removed: an untrimmed
 * `read_customers\n` no longer matches a declared scope and disappears from
 * the result entirely.
 */
import { parseScopes, DEFAULT_SHOPIFY_SCOPES } from "../../../config/app-config";

describe("parseScopes (SHOPIFY_SCOPES)", () => {
  it("strips a trailing newline from the last scope (the live B1 defect)", () => {
    const raw =
      "read_orders,read_fulfillments,read_products,read_customers\n";

    const scopes = parseScopes(raw);

    expect(scopes).toEqual([
      "read_orders",
      "read_fulfillments",
      "read_products",
      "read_customers",
    ]);
    // Nothing that would survive URL-encoding into %0A / %20 / %0D.
    expect(scopes.every((scope: string) => !/\s/.test(scope))).toBe(true);
  });

  it("trims surrounding whitespace, CRLF and stray spaces around commas", () => {
    expect(parseScopes("  read_orders , read_products\r\n")).toEqual([
      "read_orders",
      "read_products",
    ]);
  });

  it("drops empty entries from trailing or doubled commas", () => {
    expect(parseScopes("read_orders,,read_products,")).toEqual([
      "read_orders",
      "read_products",
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

/**
 * The env var may narrow the code defaults, never widen them (R39).
 *
 * `minimum-scopes.test.ts` asserted DEFAULT_SHOPIFY_SCOPES carries no write
 * scope, and passed — while production's authorize redirect, read live on
 * 2026-09-22, was still
 *
 *   scope=read_orders,write_orders,read_fulfillments,write_fulfillments,…
 *
 * because `SHOPIFY_SCOPES` was set in Vercel 338 days earlier and the parser
 * returned whatever it said. A guard that cannot fail on the thing it claims
 * to guard is not a guard: the minimum-scope invariant has to hold over what
 * the merchant is actually asked for, not over a constant the env overrides.
 *
 * Narrowing stays allowed — dropping a scope can only reduce what the app is
 * granted, and a deployment that wants less access should be able to say so.
 */
describe("parseScopes never widens beyond the code defaults", () => {
  /** Verbatim from `GET /auth` on production, 2026-09-22. */
  const LIVE_PRODUCTION_VALUE =
    "read_orders,write_orders,read_fulfillments,write_fulfillments,read_products,read_customers";

  it("drops the write scopes a stale env var still asks for", () => {
    expect(parseScopes(LIVE_PRODUCTION_VALUE)).toEqual([
      "read_orders",
      "read_fulfillments",
      "read_products",
      "read_customers",
    ]);
  });

  it("ignores a scope the app has never declared", () => {
    expect(parseScopes("read_orders,read_discounts")).toEqual(["read_orders"]);
  });

  it("still honours an env var that asks for less", () => {
    expect(parseScopes("read_orders,read_products")).toEqual([
      "read_orders",
      "read_products",
    ]);
  });

  it("falls back to the defaults when nothing survives the filter", () => {
    // An empty scope list would send `scope=` to Shopify; the defaults are
    // the honest floor, and they are what the toml already declares.
    expect(parseScopes("write_orders,write_fulfillments")).toEqual(
      DEFAULT_SHOPIFY_SCOPES,
    );
  });
});
