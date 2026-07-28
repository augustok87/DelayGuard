/**
 * OAuth routes — WS-C C2/C3.
 *
 * Mounted at /auth (server.ts). Flow:
 *
 *   GET /auth?shop=x.myshopify.com
 *     → 302 to Shopify's authorize URL. Scopes come from
 *       config.shopify.scopes (C2 — never raw SHOPIFY_SCOPES env, which
 *       can be unset and would serialize as the literal "undefined").
 *       The redirect URI is built from the stable SHOPIFY_APP_URL
 *       (decision D5), NOT the per-deploy VERCEL_URL — it must exactly
 *       match the allowlist in the Partner Dashboard. A CSRF `state`
 *       nonce is generated and mirrored into a short-lived signed
 *       cookie (see utils/oauth-state.ts).
 *
 *   GET /auth/callback?code=…&shop=…&state=…&hmac=…
 *     → Shopify redirects here (GET, not POST). Order of checks:
 *       shop-domain shape (400) → query HMAC (401) → state nonce vs
 *       cookie (403) → code-for-token exchange (502 on upstream
 *       failure) → shopAuth.upsertShop → 302 back into the embedded
 *       admin app.
 *
 * Routes stay thin per .claude/rules/backend.md — the token exchange
 * and persistence live in ShopAuthService.
 */
import Router from "koa-router";
import { logger } from "../utils/logger";
import { ShopAuthService } from "../services/shop-auth-service";
import { registerWebhooks } from "../services/webhook-registration-service";
import { appConfig } from "../config/app-config";
import {
  STATE_COOKIE_NAME,
  generateStateNonce,
  buildStateCookieValue,
  verifyStateCookie,
  verifyOAuthQueryHmac,
} from "../utils/oauth-state";

const router = new Router();
const shopAuth = new ShopAuthService();

/** Strict shop-domain shape — the OAuth redirect targets this host. */
const SHOP_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

/** Matches the state cookie's 10-minute self-expiry. */
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Stable public base URL (decision D5: https://delayguard-api.vercel.app
 * in production). Localhost fallback is for dev only.
 */
function appBaseUrl(): string {
  const url = process.env.SHOPIFY_APP_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

// OAuth initiation: redirect the merchant to Shopify's authorize screen
router.get("/", async(ctx) => {
  try {
    const shop = ctx.query.shop;

    if (!shop || typeof shop !== "string") {
      ctx.status = 400;
      ctx.body = { error: "Shop parameter is required" };
      return;
    }

    if (!SHOP_DOMAIN_RE.test(shop)) {
      ctx.status = 400;
      ctx.body = { error: "Invalid shop domain format" };
      return;
    }

    const nonce = generateStateNonce();
    ctx.cookies.set(
      STATE_COOKIE_NAME,
      buildStateCookieValue(nonce, appConfig.shopify.apiSecret),
      {
        httpOnly: true,
        sameSite: "lax",
        // ctx.secure requires app.proxy=true behind Vercel's TLS proxy —
        // see the WS-A server.ts note in the launch plan.
        secure: ctx.secure,
        path: "/auth",
        maxAge: STATE_COOKIE_MAX_AGE_MS,
      },
    );

    const params = new URLSearchParams({
      client_id: appConfig.shopify.apiKey,
      scope: appConfig.shopify.scopes.join(","),
      redirect_uri: `${appBaseUrl()}/auth/callback`,
      state: nonce,
    });

    ctx.redirect(`https://${shop}/admin/oauth/authorize?${params.toString()}`);
  } catch (error) {
    logger.error("Error initiating OAuth", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to initiate OAuth" };
  }
});

// OAuth callback: Shopify redirects here via GET after merchant approval
router.get("/callback", async(ctx) => {
  try {
    const { shop, code, state } = ctx.query;

    if (!shop || typeof shop !== "string" || !SHOP_DOMAIN_RE.test(shop)) {
      ctx.status = 400;
      ctx.body = { error: "Invalid shop domain format" };
      return;
    }

    if (
      !code ||
      typeof code !== "string" ||
      !state ||
      typeof state !== "string"
    ) {
      ctx.status = 400;
      ctx.body = { error: "Missing code or state parameter" };
      return;
    }

    if (!verifyOAuthQueryHmac(ctx.query, appConfig.shopify.apiSecret)) {
      logger.warn("OAuth callback rejected: invalid query HMAC", { shop });
      ctx.status = 401;
      ctx.body = { error: "Invalid HMAC signature" };
      return;
    }

    const stateCookie = ctx.cookies.get(STATE_COOKIE_NAME);
    if (
      !verifyStateCookie(stateCookie, state, appConfig.shopify.apiSecret)
    ) {
      logger.warn("OAuth callback rejected: state mismatch", { shop });
      ctx.status = 403;
      ctx.body = { error: "OAuth state verification failed" };
      return;
    }

    // State nonce is single-use — clear it before the exchange.
    ctx.cookies.set(STATE_COOKIE_NAME, null, { path: "/auth" });

    let accessToken: string;
    let scope: string;
    try {
      ({ accessToken, scope } = await shopAuth.exchangeCodeForToken(
        shop,
        code,
      ));
    } catch (error) {
      logger.error("OAuth token exchange failed", error as Error, { shop });
      ctx.status = 502;
      ctx.body = { error: "Failed to exchange authorization code" };
      return;
    }

    await shopAuth.upsertShop({ shopDomain: shop, accessToken, scope });

    logger.info(`✅ Shop ${shop} authenticated and stored successfully`);

    // Register the functional webhooks for this shop. The custom
    // authorization-code flow (use_legacy_install_flow=true) forbids
    // app-specific webhook subscriptions in shopify.app.toml, so they are
    // registered per-shop here via the Admin API. BEST-EFFORT: a webhook
    // hiccup must not block the install — log it and still land the
    // merchant in the app. registerWebhooks itself never throws, but we
    // still guard against an unexpected rejection.
    try {
      const result = await registerWebhooks(shop, accessToken);
      if (result.failed.length > 0) {
        logger.warn("Some webhooks failed to register during install", {
          shop,
          registered: result.registered,
          failed: result.failed,
        });
      }
    } catch (error) {
      logger.warn(
        "Webhook registration threw during install (continuing anyway)",
        {
          shop,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Land the merchant back inside the embedded admin app.
    ctx.redirect(`https://${shop}/admin/apps/${appConfig.shopify.apiKey}`);
  } catch (error) {
    logger.error("Error completing OAuth callback", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to complete OAuth" };
  }
});

// Get current shop information
router.get("/shop", async(ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;

    const metadata = await shopAuth.loadShopByDomain(shop);

    if (metadata === null) {
      ctx.status = 404;
      ctx.body = { error: "Shop not found" };
      return;
    }

    ctx.body = metadata;
  } catch (error) {
    logger.error("Error fetching shop information", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch shop information" };
  }
});

export { router as authRoutes };
