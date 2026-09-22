/**
 * LAUNCH_PLAN §6 R29 (root cause) and R32 — the app's own headers must not
 * block the assets it ships.
 *
 * Shopify's dashboard failed "Using the latest App Bridge script loaded from
 * Shopify's CDN" for a reason nobody had looked for: the script tag was
 * present and correct, and the script was **never allowed to execute**.
 *
 *   - The app sent `Cross-Origin-Embedder-Policy: require-corp`.
 *   - `https://cdn.shopify.com/shopifycloud/app-bridge.js` sends
 *     `access-control-allow-origin: *` but **no** `Cross-Origin-Resource-Policy`.
 *
 * Under `require-corp` a no-CORS cross-origin `<script>` is blocked unless it
 * carries CORP, so the app's own header blocked Shopify's bridge. `window.shopify`
 * therefore never existed, the legacy npm App Bridge was silently carrying every
 * session token, and Shopify's check saw its script fail to run. Measured live:
 * "App Bridge global not present — app-bridge.js has not initialised", alongside
 * Chrome's "Specify a Cross-Origin Resource Policy to stop a resource from being
 * blocked".
 *
 * Cross-origin isolation is the wrong posture for an app whose whole job is to
 * be embedded in someone else's admin. `frame-ancestors` (per-shop, R6) is what
 * controls who may frame us, and that stays.
 *
 * R32 is the same class of bug one directive over: the document links a Google
 * Fonts stylesheet that `style-src` forbids, so every merchant saw fallback
 * typography.
 */
import { SecurityHeadersMiddleware } from "../../../middleware/security-headers";

/** The exact URLs the served document references. */
const APP_BRIDGE_CDN = "https://cdn.shopify.com";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

interface CapturedHeaders {
  [name: string]: string;
}

/** Run the middleware over a framed request and capture what it set. */
async function headersFor(
  shop = "delayguard-dev.myshopify.com",
): Promise<CapturedHeaders> {
  const captured: CapturedHeaders = {};
  const ctx = {
    path: "/",
    query: { shop, embedded: "1", host: "abc" },
    get: () => "",
    set: (name: string, value: string) => {
      captured[name] = value;
    },
    remove: () => undefined,
    // The middleware strips server-identifying headers off the response
    // object at the end; without it the call throws before setting anything.
    response: { headers: {} as Record<string, string> },
  } as unknown as Parameters<typeof SecurityHeadersMiddleware.apply>[0];

  await SecurityHeadersMiddleware.apply(ctx, async() => undefined);
  return captured;
}

function directive(csp: string, name: string): string {
  const found = csp.split(";").map(d => d.trim()).find(d => d.startsWith(`${name} `));
  return found ?? "";
}

describe("Embedded-app headers must not block Shopify's own assets", () => {
  it("does not send Cross-Origin-Embedder-Policy: require-corp", async() => {
    // This is the header that blocked app-bridge.js. The Shopify CDN does not
    // send CORP, so require-corp is equivalent to refusing the bridge.
    const headers = await headersFor();

    expect(headers["Cross-Origin-Embedder-Policy"]).toBeUndefined();
  });

  it("does not lock the document to same-origin embedding", async() => {
    // COOP/CORP same-origin are cross-origin-isolation directives. An app that
    // lives inside admin.shopify.com must not ask to be isolated from it.
    const headers = await headersFor();

    expect(headers["Cross-Origin-Resource-Policy"]).not.toBe("same-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).not.toBe("same-origin");
  });

  it("still names the requesting shop in frame-ancestors (R6 must not regress)", async() => {
    const headers = await headersFor("some-other-store.myshopify.com");

    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors https://some-other-store.myshopify.com https://admin.shopify.com",
    );
  });

  it("allows the App Bridge CDN in script-src", async() => {
    const headers = await headersFor();

    expect(directive(headers["Content-Security-Policy"], "script-src")).toContain(
      APP_BRIDGE_CDN,
    );
  });

  it("allows the Google Fonts stylesheet the document actually links (R32)", async() => {
    const headers = await headersFor();
    const csp = headers["Content-Security-Policy"];

    expect(directive(csp, "style-src")).toContain(GOOGLE_FONTS_CSS);
    expect(directive(csp, "font-src")).toContain(GOOGLE_FONTS_FILES);
  });
});
