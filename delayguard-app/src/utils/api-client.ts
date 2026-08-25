import { getSessionToken } from "@shopify/app-bridge/utilities";
import type { ClientApplication } from "@shopify/app-bridge";
import { logger } from "./logger";

/**
 * Authenticated API Client for Shopify Embedded Apps
 *
 * This client automatically:
 * 1. Retrieves session tokens from App Bridge
 * 2. Includes the token in Authorization headers
 * 3. Handles token refresh automatically
 * 4. Returns each response body inside ApiResponse<T> with `data: unknown` —
 *    callers must narrow (`isAlertRow(r.data)`, Zod parse, etc.) per Wave 3.4
 *    typing-hygiene rule. Wire shape is the snake_case MerchantApiService
 *    output; v1.38 camelCase migration is the separate-PR fix.
 *
 * @see https://shopify.dev/docs/apps/auth/oauth/session-tokens
 */

interface ApiClientConfig {
  baseUrl?: string;
  app?: ClientApplication;
}

/**
 * Global installed by the latest CDN-hosted App Bridge
 * (https://cdn.shopify.com/shopifycloud/app-bridge.js — req 2.2.3).
 * `idToken()` is the CDN equivalent of the npm `getSessionToken` util.
 */
interface CdnAppBridgeGlobal {
  idToken?: () => Promise<string>;
}

export interface TestAlertPayload {
  delayType: "warehouse" | "carrier" | "transit";
  channels?: Array<"email" | "sms">;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
}

export interface TestAlertResponse {
  channelsAttempted: Array<"email" | "sms">;
  recipientEmail: string | null;
  recipientPhone: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  count?: number;
}

class ApiClient {
  private baseUrl: string;
  private app: ClientApplication | undefined;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "/api";
    this.app = config.app;
  }

  /**
   * Set the App Bridge instance
   * This must be called before making any authenticated requests
   */
  setApp(app: ClientApplication) {
    this.app = app;
    logger.debug("App Bridge instance set for API client");
  }

  /**
   * Get session token from App Bridge
   * This token is a JWT that proves the request is coming from Shopify
   */
  private async getToken(): Promise<string | null> {
    // Prefer the latest App Bridge CDN global (window.shopify.idToken) —
    // present whenever the app-bridge.js script tag from index.html has
    // loaded. The npm @shopify/app-bridge path below is kept as a
    // fallback so existing behavior is preserved (G1 rule: prefer the
    // CDN global, don't rewrite the working token attachment).
    const cdnShopify = (globalThis as { shopify?: CdnAppBridgeGlobal })
      .shopify;
    if (cdnShopify && typeof cdnShopify.idToken === "function") {
      try {
        const token = await cdnShopify.idToken();
        logger.debug("Session token retrieved from CDN App Bridge");
        return token;
      } catch (error) {
        logger.error(
          "CDN App Bridge idToken() failed; falling back to npm App Bridge",
          error as Error,
        );
        // fall through to the npm App Bridge path
      }
    }

    if (!this.app) {
      logger.warn("App Bridge not initialized. Returning null token.");
      return null;
    }

    try {
      const token = await getSessionToken(this.app);
      logger.debug("Session token retrieved successfully");
      return token;
    } catch (error) {
      logger.error("Failed to get session token", error as Error);
      return null;
    }
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken();
      const url = `${this.baseUrl}${endpoint}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      // Add Authorization header if we have a token
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      logger.debug("Making API request", {
        method: options.method || "GET",
        url,
        hasToken: !!token,
      });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        logger.warn("API request failed", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });

        return {
          success: false,
          error: data.error || data.message || "Request failed",
          code: data.code,
        };
      }

      logger.debug("API request successful", { url });

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      logger.error("API request error", error as Error, { endpoint });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ========== API Methods ==========

  /**
   * GET /api/alerts
   * Fetch all delay alerts for the authenticated shop.
   * Wire shape: snake_case `AlertRow[]` from MerchantApiService — caller narrows.
   */
  async getAlerts() {
    return this.request<unknown[]>("/alerts");
  }

  /**
   * GET /api/orders
   * Fetch orders with optional limit.
   * Wire shape: snake_case `OrderRow[]` from MerchantApiService — caller narrows.
   */
  async getOrders(limit?: number) {
    const query = limit ? `?limit=${limit}` : "";
    return this.request<unknown[]>(`/orders${query}`);
  }

  /**
   * GET /api/settings
   * Fetch app settings for the authenticated shop.
   * Wire shape: snake_case `AppSettingsRow` from MerchantApiService — caller narrows.
   */
  async getSettings() {
    return this.request<unknown>("/settings");
  }

  /**
   * PUT /api/settings
   * Update app settings. Body shape: `UpdateSettingsInput` (caller's responsibility).
   */
  async updateSettings(settings: Record<string, unknown>) {
    return this.request<unknown>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  /**
   * PUT /api/merchant-settings
   * Update merchant contact details (and Phase 2.6 delay-type toggles).
   *
   * Deliberately a SEPARATE call from `updateSettings`: `PUT /api/settings`
   * reads only the four `app_settings` columns and silently ignores contact
   * fields, so routing them there reported success and persisted nothing
   * (LAUNCH_PLAN §6 R12). Body is camelCase — unlike /settings, which is
   * snake_case — matching the route's own parsing.
   */
  async updateMerchantSettings(settings: Record<string, unknown>) {
    return this.request<unknown>("/merchant-settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  /**
   * PUT /api/alerts/:id/status
   * Persist the merchant's triage status for one alert
   * (active | resolved | dismissed). Backs the dashboard resolve/dismiss
   * actions so they survive a reload.
   */
  async updateAlertStatus(
    id: string,
    status: "active" | "resolved" | "dismissed",
  ) {
    return this.request<unknown>(`/alerts/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  /**
   * GET /api/analytics
   * Fetch analytics summary.
   * Wire shape: `AnalyticsSummary` from MerchantApiService — caller narrows.
   */
  async getAnalytics() {
    return this.request<{
      alerts: unknown;
      orders: unknown;
    }>("/analytics");
  }

  /**
   * GET /api/shop
   * Fetch shop information.
   * Wire shape: snake_case `ShopInfo` from MerchantApiService — caller narrows.
   */
  async getShop() {
    return this.request<unknown>("/shop");
  }

  /**
   * POST /api/test-alert
   * Dispatch a sample delay alert to the merchant's configured contact
   * (Phase 2.1.e endpoint; dry-run — no DB write, no queue enqueue).
   */
  async testAlert(payload: TestAlertPayload) {
    return this.request<TestAlertResponse>("/test-alert", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * GET /api/health
   * Check API health (no authentication required).
   */
  async health() {
    return this.request<{ status: string; timestamp: string }>("/health");
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient };
export type { ApiResponse };
