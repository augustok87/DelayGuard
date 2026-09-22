/**
 * LAUNCH_PLAN §6 R29 — the app must ship ONLY the CDN App Bridge.
 *
 * Shopify's Partner Dashboard failed "Using the latest App Bridge script
 * loaded from Shopify's CDN" and greyed out "Submit for review", while
 * `app-bridge-setup.test.ts` — the suite named after that very requirement —
 * stayed green. It asserts the HTML template carries the CDN script tag, which
 * is true and always was. What it never asked is what the BUNDLE does after
 * the template loads: `AppProvider` wrapped the whole app in `ShopifyProvider`,
 * which called `createApp()` from the legacy npm `@shopify/app-bridge` v3, so
 * the previous-generation bridge booted on top of the CDN one. The deployed
 * vendors chunk carried 119 `APP::` legacy action types, and inside the real
 * admin iframe the app logged "App Bridge initialized successfully" — that was
 * `createApp` succeeding.
 *
 * So these assertions are deliberately about the shipped SOURCE rather than
 * the template. A requirement about which bridge runs cannot be verified by
 * reading the HTML that loads one of them.
 */
import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../..");
const PACKAGE_JSON = path.resolve(__dirname, "../../../package.json");

const LEGACY_PACKAGE = "@shopify/app-bridge";

/** Every shipped .ts/.tsx file — tests and mocks are not shipped. */
function shippedSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests" || entry.name === "__mocks__") continue;
      shippedSourceFiles(full, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

/**
 * Strip comments so the assertions are about code. The docs explaining WHY
 * the legacy bridge is gone necessarily name `createApp()`, and a test that
 * forbids mentioning the mistake would forbid documenting it.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("App Bridge — CDN only, no legacy npm bridge (R29)", () => {
  it("does not declare @shopify/app-bridge as a dependency", () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(Object.keys(pkg.dependencies ?? {})).not.toContain(LEGACY_PACKAGE);
    expect(Object.keys(pkg.devDependencies ?? {})).not.toContain(
      LEGACY_PACKAGE,
    );
  });

  it("no shipped source file imports the legacy npm bridge", () => {
    const offenders = shippedSourceFiles(SRC_DIR)
      .filter(file => {
        const text = fs.readFileSync(file, "utf8");
        // Only real import/require statements — a comment explaining why the
        // package is gone must not fail this test.
        return (
          /^\s*import\s[^\n]*from\s+["']@shopify\/app-bridge/m.test(text) ||
          /require\(\s*["']@shopify\/app-bridge/.test(text)
        );
      })
      .map(f => path.relative(SRC_DIR, f));

    expect(offenders).toEqual([]);
  });

  it("never calls createApp(), the legacy bridge's entry point", () => {
    const offenders = shippedSourceFiles(SRC_DIR)
      .filter(file => /\bcreateApp\s*\(/.test(withoutComments(fs.readFileSync(file, "utf8"))))
      .map(f => path.relative(SRC_DIR, f));

    expect(offenders).toEqual([]);
  });
});
