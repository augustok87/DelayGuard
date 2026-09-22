/**
 * Minimum-scope review requirement — every scope requested at install must be
 * one the app actually uses.
 *
 * The install consent screen asked merchants for `write_orders` and
 * `write_fulfillments`, verified live on the production OAuth redirect. The
 * app has never written to either resource: the only GraphQL mutation in the
 * codebase is `webhookSubscriptionCreate`, which needs neither. A scope
 * requested and never exercised is a documented App Store review finding, and
 * it is the kind a reviewer can check in one click.
 *
 * These assertions are deliberately tied to *usage*: the second one fails if
 * someone adds a write scope back without a mutation to justify it, and the
 * third fails if a write mutation appears without the scope, so the pair
 * cannot drift into agreeing with each other while disagreeing with reality.
 */
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_SHOPIFY_SCOPES } from "../../../config/app-config";

const SRC_DIR = path.resolve(__dirname, "../../..");
const TOML = path.resolve(__dirname, "../../../../shopify.app.toml");
const ENV_EXAMPLE = path.resolve(__dirname, "../../../../env.example");

const WRITE_SCOPES = ["write_orders", "write_fulfillments"] as const;

/** Mutations that would actually justify an order/fulfillment write scope. */
const WRITE_MUTATIONS =
  /\b(orderUpdate|orderEditBegin|orderEditCommit|fulfillmentCreateV2|fulfillmentCreate|fulfillmentTrackingInfoUpdate)\s*\(/;

function shippedSources(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests" || entry.name === "__mocks__") continue;
      shippedSources(full, acc);
      continue;
    }
    if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("OAuth scopes are the minimum the app actually uses", () => {
  it("does not request order/fulfillment write scopes in the code defaults", () => {
    for (const scope of WRITE_SCOPES) {
      expect(DEFAULT_SHOPIFY_SCOPES as readonly string[]).not.toContain(scope);
    }
  });

  it("keeps shopify.app.toml and env.example in sync with those defaults", () => {
    const toml = fs.readFileSync(TOML, "utf8");
    const envExample = fs.readFileSync(ENV_EXAMPLE, "utf8");

    for (const scope of WRITE_SCOPES) {
      expect(toml).not.toContain(scope);
      expect(envExample).not.toContain(scope);
    }

    // The declared list must still carry what the app does use.
    for (const scope of DEFAULT_SHOPIFY_SCOPES) {
      expect(toml).toContain(scope);
      expect(envExample).toContain(scope);
    }
  });

  it("performs no order or fulfillment write mutation that would need them", () => {
    const offenders = shippedSources(SRC_DIR)
      .filter(f => WRITE_MUTATIONS.test(fs.readFileSync(f, "utf8")))
      .map(f => path.relative(SRC_DIR, f));

    // If this ever fails, the app DID start writing — restore the scope
    // rather than deleting the assertion.
    expect(offenders).toEqual([]);
  });
});
