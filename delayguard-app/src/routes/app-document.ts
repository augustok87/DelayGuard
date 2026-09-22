/**
 * Serves the embedded app's HTML document from Koa (LAUNCH_PLAN §6 R6).
 *
 * Why Koa and not the CDN: shopify.dev requires `frame-ancestors` to name
 * the *specific* shop, so the header value depends on the request. Vercel's
 * static filesystem check answers `/` before any rewrite reaches the
 * function, so while the built HTML was called `public/index.html` the one
 * response that actually gets framed was served by the CDN with no CSP at
 * all. The build now emits `public/app.html`, which frees `/` to fall
 * through the rewrite into Koa — where `security-headers.ts` runs and sets
 * the per-shop directive.
 *
 * The document is read once and cached: it is immutable for the lifetime of
 * a deployment, and a serverless instance should not touch the filesystem
 * on every request.
 */
import { Context } from "koa";
import { readFileSync } from "fs";
import { join } from "path";

export const APP_DOCUMENT_FILENAME = "app.html";

/**
 * Shown only when the bundle is missing — a build that did not run, or an
 * `includeFiles` glob that stopped shipping the document. Deliberately
 * *not* a silent empty page: a blank iframe in the Shopify admin is
 * indistinguishable from a slow load, so it says what is wrong.
 */
const MISSING_BUNDLE_DOCUMENT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>DelayGuard</title></head>
<body><p>DelayGuard is starting up. The application bundle is not available on this deployment.</p></body></html>`;

let cached: string | null = null;

/** Exported for tests — a module-level cache outlives `jest.resetModules()`. */
export function resetAppDocumentCache(): void {
  cached = null;
}

export function readAppDocument(): string {
  if (cached !== null) return cached;

  try {
    cached = readFileSync(
      join(__dirname, "..", "..", "public", APP_DOCUMENT_FILENAME),
      "utf8",
    );
  } catch {
    // Do not cache the fallback: a missing file at cold start should not
    // pin a broken response for the life of the instance.
    return MISSING_BUNDLE_DOCUMENT;
  }

  return cached;
}


/**
 * Shown to anyone who opens the app URL outside the Shopify admin — most
 * importantly the reviewer who clicks the listing's website link (§6 R30).
 *
 * That link used to serve the embedded app document, which cannot start
 * App Bridge outside the iframe: every /api/* call 401'd and the visitor got
 * a red "Missing Authorization header" banner over empty counters.
 *
 * Deliberately self-contained — no bundle, no external stylesheet, no web
 * font — so it renders under the app's own CSP with nothing to block, and
 * says only what the app actually does. Delay detection runs off Shopify's
 * own fulfillment and tracking status, so there is no carrier claim here, and
 * the App Store listing carries exactly one plan, so there is no price here.
 */
const SUPPORT_EMAIL = "support@delayguardapp.com";

const LANDING_PAGE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DelayGuard — Shipping delay alerts for Shopify</title>
<meta name="description" content="DelayGuard watches Shopify orders for shipping delays and emails customers before they contact support.">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px 16px;
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a; background: #fbfbfb;
  }
  main { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 2rem; margin: 0 0 .25em; letter-spacing: -.02em; }
  .tagline { color: #5c5f62; margin: 0 0 2em; font-size: 1.1rem; }
  h2 { font-size: 1.05rem; margin: 2.5em 0 .75em; }
  ul { padding-left: 1.25em; margin: 0; }
  li { margin: .4em 0; }
  a { color: #1f5199; }
  footer { margin-top: 3em; padding-top: 1.5em; border-top: 1px solid #e3e3e3; color: #5c5f62; font-size: .9rem; }
  @media (prefers-color-scheme: dark) {
    body { color: #e3e3e3; background: #141414; }
    .tagline, footer { color: #a8a8a8; }
    a { color: #8ab4f8; }
    footer { border-top-color: #303030; }
  }
</style>
</head>
<body><main>
  <h1>DelayGuard</h1>
  <p class="tagline">Catch shipping delays and tell customers before they ask.</p>

  <p>DelayGuard is an embedded Shopify app. It watches your orders and raises an
  alert when one has not shipped within a window you choose, when Shopify reports
  a delivery exception, or when a package sits in transit too long.</p>

  <h2>What it does</h2>
  <ul>
    <li>Detects delays from your Shopify fulfillment and tracking status</li>
    <li>Emails the customer automatically when a delay is detected</li>
    <li>Shows every delayed order on one dashboard, with the reason</li>
    <li>Lets you set the day thresholds for each rule</li>
  </ul>

  <h2>Installing</h2>
  <p>DelayGuard installs from the Shopify App Store and runs inside your Shopify
  admin. There is no separate account and nothing to configure outside Shopify.</p>

  <footer>
    <p>Questions or support: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>
      <a href="/legal/privacy-policy">Privacy policy</a> &middot;
      <a href="/legal/terms-of-service">Terms of service</a>
    </p>
  </footer>
</main></body></html>`;

/**
 * True when Shopify framed this request. The admin always sends at least one
 * of these, and `vercel.json` has already redirected a bare `?shop=` to OAuth
 * before it could reach here.
 */
function isFramedByShopify(ctx: Context): boolean {
  const q = ctx.query ?? {};
  return Boolean(q.embedded || q.id_token || q.host || q.shop);
}

/**
 * `GET /` — the app for the Shopify admin, the landing page for everyone else.
 * The CSP is set by `security-headers.ts`, which runs ahead of the router.
 */
export async function serveAppDocument(ctx: Context): Promise<void> {
  ctx.type = "html";
  ctx.body = isFramedByShopify(ctx) ? readAppDocument() : LANDING_PAGE;
}
