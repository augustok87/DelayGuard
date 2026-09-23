/**
 * LAUNCH_PLAN §6 R30 — the listing's website URL must not serve the app shell.
 *
 * `websiteUrl` in the live App Store listing is `https://delayguard-api.vercel.app`,
 * and that served the EMBEDDED app document. Opened outside the Shopify admin —
 * exactly what a reviewer does when they click the listing's website link —
 * App Bridge cannot initialise, every `/api/*` call 401s, and the page renders
 * a red "Error: Missing Authorization header" banner over `0 / 0 / 0` counters
 * and "Not Connected". Screenshotted 2026-09-22.
 *
 * So `/` now answers by audience: a request that Shopify framed gets the app,
 * and a bare request gets a plain informational page. The embedded assertions
 * below are the regression half — serving marketing copy to the admin iframe
 * would be a far worse bug than the one being fixed.
 */
import {
  serveAppDocument,
  resetAppDocumentCache,
  APP_DOCUMENT_FILENAME,
} from "../../../routes/app-document";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import type { Context } from "koa";

/**
 * `public/app.html` is a webpack artifact and is gitignored, so it exists on a
 * developer's machine — the local gate builds before it tests — and does not
 * exist in CI, whose test job runs Jest without building. That difference made
 * the three framed assertions below pass locally and fail on every push, and
 * the local gate could not see it. The branch under test picks *which*
 * document to serve, not what webpack put inside it, so a stand-in is enough;
 * it is written only when the real build output is absent, and removed again.
 */
const APP_DOCUMENT_PATH = join(process.cwd(), "public", APP_DOCUMENT_FILENAME);
let wroteStandIn = false;

interface Captured {
  body: string;
  type: string;
  status?: number;
}

function ctxFor(query: Record<string, string>): { ctx: Context; out: Captured } {
  const out: Captured = { body: "", type: "" };
  const ctx = {
    path: "/",
    query,
    set type(v: string) {
      out.type = v;
    },
    set body(v: string) {
      out.body = v;
    },
    get body() {
      return out.body;
    },
    set status(v: number) {
      out.status = v;
    },
  } as unknown as Context;
  return { ctx, out };
}

describe("GET / answers by audience (R30)", () => {
  beforeAll(() => {
    if (existsSync(APP_DOCUMENT_PATH)) return;
    mkdirSync(join(process.cwd(), "public"), { recursive: true });
    writeFileSync(
      APP_DOCUMENT_PATH,
      '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
      "utf8",
    );
    wroteStandIn = true;
  });

  afterAll(() => {
    if (wroteStandIn) rmSync(APP_DOCUMENT_PATH, { force: true });
  });

  beforeEach(resetAppDocumentCache);

  describe("a bare request — what a reviewer clicking the listing sees", () => {
    it("does not serve the embedded app bundle", async() => {
      const { ctx, out } = ctxFor({});
      await serveAppDocument(ctx);

      expect(out.body).not.toContain('<div id="root">');
      expect(out.body).not.toMatch(/app-bridge\.js/);
    });

    it("names the app and says what it does", async() => {
      const { ctx, out } = ctxFor({});
      await serveAppDocument(ctx);

      expect(out.body).toContain("DelayGuard");
      expect(out.body.toLowerCase()).toMatch(/delay/);
    });

    it("links the legal pages and the support address a merchant would need", async() => {
      const { ctx, out } = ctxFor({});
      await serveAppDocument(ctx);

      expect(out.body).toContain("/legal/privacy-policy");
      expect(out.body).toContain("/legal/terms-of-service");
      expect(out.body).toContain("support@delayguardapp.com");
    });

    it("claims no carrier integration and sells no paid plan", async() => {
      // The listing carries exactly one plan, and delay detection runs off
      // Shopify's own fulfillment and tracking status — no carrier account.
      const { ctx, out } = ctxFor({});
      await serveAppDocument(ctx);

      expect(out.body).not.toMatch(/\$\d/);
      expect(out.body).not.toMatch(/\bSMS\b/);
      expect(out.body).not.toMatch(/carrier account|carrier API/i);
    });
  });

  describe("a framed request — the merchant's actual app", () => {
    it.each([
      ["embedded", { embedded: "1", shop: "delayguard-dev.myshopify.com", host: "abc" }],
      ["id_token", { id_token: "jwt", shop: "delayguard-dev.myshopify.com" }],
      ["host", { host: "abc", shop: "delayguard-dev.myshopify.com" }],
    ])("still serves the app document when %s is present", async(_label, query) => {
      const { ctx, out } = ctxFor(query as Record<string, string>);
      await serveAppDocument(ctx);

      expect(out.body).toContain('<div id="root">');
    });
  });
});
