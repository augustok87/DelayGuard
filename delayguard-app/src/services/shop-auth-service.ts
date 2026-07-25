/**
 * Shop authentication service
 *
 * Centralises all DB writes/reads tied to the OAuth lifecycle so the
 * route handlers stay thin (parse → service → respond). Backend rule
 * (.claude/rules/backend.md): business logic and SQL belong here, not
 * in route handlers.
 *
 * Surface:
 *   - exchangeCodeForToken(shopDomain, code)
 *       OAuth code → access-token exchange against Shopify's
 *       /admin/oauth/access_token endpoint (WS-C C3).
 *   - upsertShop({ shopDomain, accessToken, scope })
 *       Idempotent install / re-auth: writes the shop row, then seeds
 *       default app_settings on first install (no-op on conflict).
 *   - loadShopByDomain(shopDomain)
 *       Returns public shop metadata (NOT the access token) for the
 *       /auth/shop endpoint. Token reads belong in a future service
 *       extracted from middleware/shopify-session.ts.
 */

import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { appConfig } from "../config/app-config";

export interface ShopMetadata {
  shopDomain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertShopInput {
  shopDomain: string;
  accessToken: string;
  /** Comma-separated scope string as supplied by the Shopify session. */
  scope: string;
}

interface ShopMetadataRow {
  shop_domain: string;
  created_at: Date;
  updated_at: Date;
}

function parseScope(scope: string): string[] {
  return scope
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export interface TokenExchangeResult {
  accessToken: string;
  /** Comma-separated scope string as granted by Shopify. */
  scope: string;
}

export class ShopAuthService {
  /**
   * Exchange the OAuth authorization `code` for a permanent offline
   * access token. NOTE (C5, post-launch deadline 2027-01-01): expiring
   * offline tokens (`expiring=1` + refresh-token rotation) are mandatory
   * for all public apps from Jan 1, 2027 — see LAUNCH_PLAN.md C5.
   */
  async exchangeCodeForToken(
    shopDomain: string,
    code: string,
  ): Promise<TokenExchangeResult> {
    try {
      const response = await fetch(
        `https://${shopDomain}/admin/oauth/access_token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: appConfig.shopify.apiKey,
            client_secret: appConfig.shopify.apiSecret,
            code,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `OAuth token exchange failed: ${response.status} ${response.statusText}`,
        );
      }

      const json = (await response.json()) as {
        access_token?: string;
        scope?: string;
      };
      if (!json.access_token) {
        throw new Error("OAuth token exchange returned no access_token");
      }

      return { accessToken: json.access_token, scope: json.scope ?? "" };
    } catch (error) {
      logger.error(
        "OAuth token exchange failed",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async upsertShop({
    shopDomain,
    accessToken,
    scope,
  }: UpsertShopInput): Promise<void> {
    const scopeArray = parseScope(scope);

    try {
      await query(
        `INSERT INTO shops (shop_domain, access_token, scope)
         VALUES ($1, $2, $3)
         ON CONFLICT (shop_domain)
         DO UPDATE SET
           access_token = EXCLUDED.access_token,
           scope = EXCLUDED.scope,
           updated_at = CURRENT_TIMESTAMP`,
        [shopDomain, accessToken, scopeArray],
      );

      await query(
        `INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled, notification_template)
         SELECT id, 2, true, false, 'default'
         FROM shops
         WHERE shop_domain = $1
         ON CONFLICT (shop_id) DO NOTHING`,
        [shopDomain],
      );
    } catch (error) {
      logger.error(
        "Failed to persist shop auth record",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async loadShopByDomain(shopDomain: string): Promise<ShopMetadata | null> {
    try {
      const rows = await query<ShopMetadataRow>(
        "SELECT shop_domain, created_at, updated_at FROM shops WHERE shop_domain = $1",
        [shopDomain],
      );

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        shopDomain: row.shop_domain,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error(
        "Failed to load shop metadata",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }
}
