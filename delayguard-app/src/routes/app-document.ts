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
 * `GET /` — the framed document. The CSP is set by `security-headers.ts`,
 * which runs ahead of the router for every request.
 */
export async function serveAppDocument(ctx: Context): Promise<void> {
  ctx.type = "html";
  ctx.body = readAppDocument();
}
