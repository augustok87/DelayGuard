/**
 * Merchant API service
 *
 * Centralises every SQL query that previously lived inline in
 * routes/api.ts for the merchant-facing API surface (/alerts, /orders,
 * /settings, /analytics, /shop, /merchant-settings). Backend rule
 * (.claude/rules/backend.md): business logic and SQL belong in services,
 * routes stay thin (parse → service → respond).
 *
 * Wire-shape contract: snake_case AT THE BOUNDARY for the historical
 * endpoints. The frontend dashboard hook destructures specific
 * snake_case fields from /analytics
 * (useDashboardData.ts:106-114) and the existing route-level tests
 * (tests/unit/routes/api-routes.test.ts) assert snake_case response
 * bodies. A blanket camelCase migration is out of scope for Wave 2.1 —
 * to land here it would need to ship in lockstep with consumer updates.
 * /merchant-settings is the one exception: it was already camelCase on
 * the wire when introduced in Phase 2.6, so we preserve that.
 *
 * Error model:
 *   - ShopNotFoundError → routes map to 404 (consistent contract; the
 *     pre-refactor handlers were inconsistent: some returned 200-empty,
 *     some 200 silent no-op, some 404).
 *   - MerchantApiValidationError → routes map to 400 (preserves the
 *     pre-existing INVALID_THRESHOLD / INVALID_EMAIL / INVALID_PHONE
 *     error codes the frontend already knows).
 *   - Other thrown errors bubble to the route, which logs + returns 500.
 */

import { query } from "../database/connection";
import { logger } from "../utils/logger";

export class ShopNotFoundError extends Error {
  public readonly shopDomain: string;
  constructor(shopDomain: string) {
    super(`Shop not found: ${shopDomain}`);
    this.name = "ShopNotFoundError";
    this.shopDomain = shopDomain;
  }
}

export class AlertNotFoundError extends Error {
  public readonly alertId: string;
  constructor(alertId: string) {
    super(`Alert not found: ${alertId}`);
    this.name = "AlertNotFoundError";
    this.alertId = alertId;
  }
}

export type AlertStatus = "active" | "resolved" | "dismissed";
const ALERT_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "resolved",
  "dismissed",
]);

export class MerchantApiValidationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "MerchantApiValidationError";
    this.code = code;
  }
}

export interface AlertRow {
  id: string;
  order_id: string;
  status: string;
  delay_reason: string | null;
  estimated_delay_days: number | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string;
  total_price: string;
  order_created_at: string;
  // Phase 2.1.b — priority (denormalized on delay_alerts)
  priority_score: string | null;
  priority_level: string | null;
  // Phase 2.1.c — financial breakdown (order-level)
  subtotal_price: string | null;
  total_tax: string | null;
  total_discounts: string | null;
  total_shipping_price: string | null;
  // Phase 2.1.d — shipping address (order-level)
  shipping_city: string | null;
  shipping_province_code: string | null;
  shipping_country_code: string | null;
  shipping_zip: string | null;
}

export interface OrderRow {
  id: string;
  shopify_order_id: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string;
  total_price: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  alert_count: string;
  last_alert_at: string | null;
}

export interface AppSettingsRow {
  delay_threshold_days: number;
  email_enabled: boolean;
  sms_enabled: boolean;
  notification_template: string;
  custom_message: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface AlertStats {
  total_alerts: string;
  sent_alerts: string;
  pending_alerts: string;
  failed_alerts: string;
  alerts_last_30_days: string;
  alerts_last_7_days: string;
}

export interface OrderStats {
  total_orders: string;
  orders_last_30_days: string;
  orders_last_7_days: string;
  average_order_value: string | null;
}

export interface AnalyticsSummary {
  alerts: AlertStats | Record<string, never>;
  orders: OrderStats | Record<string, never>;
}

export interface ShopInfo {
  shop_domain: string;
  shopify_shop_id: string | null;
  shop_name: string | null;
  email: string | null;
  plan_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MerchantSettings {
  merchantEmail: string | null;
  merchantPhone: string | null;
  merchantName: string | null;
  warehouseDelaysEnabled: boolean;
  carrierDelaysEnabled: boolean;
  transitDelaysEnabled: boolean;
}

export interface UpdateSettingsInput {
  delay_threshold_days?: number;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  notification_template?: string;
  custom_message?: string | null;
}

export interface UpdateMerchantSettingsInput {
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantName?: string | null;
  warehouseDelaysEnabled?: boolean;
  carrierDelaysEnabled?: boolean;
  transitDelaysEnabled?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SETTINGS_DEFAULTS = {
  delay_threshold_days: 2,
  email_enabled: true,
  sms_enabled: false,
  notification_template: "default",
} as const;

export class MerchantApiService {
  private async resolveShopId(shopDomain: string): Promise<string> {
    const rows = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shopDomain],
    );
    if (rows.length === 0) {
      throw new ShopNotFoundError(shopDomain);
    }
    return rows[0].id;
  }

  async getAlerts(shopDomain: string): Promise<AlertRow[]> {
    try {
      const shopId = await this.resolveShopId(shopDomain);
      return await query<AlertRow>(
        `SELECT
           da.id,
           da.order_id,
           da.status,
           da.delay_reason,
           da.estimated_delay_days,
           da.notification_sent_at,
           da.created_at,
           da.updated_at,
           o.order_number,
           o.customer_email,
           o.customer_name,
           o.total_price,
           o.created_at as order_created_at,
           da.priority_score,
           da.priority_level,
           o.subtotal_price,
           o.total_tax,
           o.total_discounts,
           o.total_shipping_price,
           o.shipping_city,
           o.shipping_province_code,
           o.shipping_country_code,
           o.shipping_zip
         FROM delay_alerts da
         JOIN orders o ON da.order_id = o.id
         WHERE o.shop_id = $1
         ORDER BY da.created_at DESC
         LIMIT 100`,
        [shopId],
      );
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch alerts",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async getOrders(shopDomain: string, limit: number): Promise<OrderRow[]> {
    try {
      const shopId = await this.resolveShopId(shopDomain);
      return await query<OrderRow>(
        `SELECT
           o.id,
           o.shopify_order_id,
           o.order_number,
           o.customer_email,
           o.customer_name,
           o.total_price,
           o.financial_status,
           o.fulfillment_status,
           o.created_at,
           o.updated_at,
           COUNT(da.id) as alert_count,
           MAX(da.created_at) as last_alert_at
         FROM orders o
         LEFT JOIN delay_alerts da ON da.order_id = o.id
         WHERE o.shop_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $2`,
        [shopId, limit],
      );
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch orders",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async getSettings(shopDomain: string): Promise<AppSettingsRow> {
    try {
      const shopId = await this.resolveShopId(shopDomain);
      const rows = await query<AppSettingsRow>(
        `SELECT
           delay_threshold_days,
           email_enabled,
           sms_enabled,
           notification_template,
           custom_message,
           created_at,
           updated_at
         FROM app_settings
         WHERE shop_id = $1`,
        [shopId],
      );

      if (rows.length > 0) return rows[0];

      // Seed defaults idempotently; matches pre-refactor INSERT shape.
      await query(
        `INSERT INTO app_settings (
           shop_id,
           delay_threshold_days,
           email_enabled,
           sms_enabled,
           notification_template
         )
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (shop_id) DO NOTHING`,
        [
          shopId,
          SETTINGS_DEFAULTS.delay_threshold_days,
          SETTINGS_DEFAULTS.email_enabled,
          SETTINGS_DEFAULTS.sms_enabled,
          SETTINGS_DEFAULTS.notification_template,
        ],
      );

      return {
        delay_threshold_days: SETTINGS_DEFAULTS.delay_threshold_days,
        email_enabled: SETTINGS_DEFAULTS.email_enabled,
        sms_enabled: SETTINGS_DEFAULTS.sms_enabled,
        notification_template: SETTINGS_DEFAULTS.notification_template,
        custom_message: null,
      };
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch settings",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async updateSettings(
    shopDomain: string,
    input: UpdateSettingsInput,
  ): Promise<void> {
    // Validate BEFORE resolving the shop so a malformed body fails fast.
    if (input.delay_threshold_days !== undefined) {
      const threshold = Number(input.delay_threshold_days);
      if (!Number.isFinite(threshold) || threshold < 1 || threshold > 30) {
        throw new MerchantApiValidationError(
          "delay_threshold_days must be between 1 and 30",
          "INVALID_THRESHOLD",
        );
      }
    }

    try {
      const shopId = await this.resolveShopId(shopDomain);
      await query(
        `UPDATE app_settings
         SET
           delay_threshold_days = COALESCE($1, delay_threshold_days),
           email_enabled = COALESCE($2, email_enabled),
           sms_enabled = COALESCE($3, sms_enabled),
           notification_template = COALESCE($4, notification_template),
           custom_message = COALESCE($5, custom_message),
           updated_at = CURRENT_TIMESTAMP
         WHERE shop_id = $6`,
        [
          input.delay_threshold_days,
          input.email_enabled,
          input.sms_enabled,
          input.notification_template,
          input.custom_message,
          shopId,
        ],
      );
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to update settings",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async getAnalytics(shopDomain: string): Promise<AnalyticsSummary> {
    try {
      const shopId = await this.resolveShopId(shopDomain);

      const alertRows = await query<AlertStats>(
        `SELECT
           COUNT(*) as total_alerts,
           COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_alerts,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_alerts,
           COUNT(CASE WHEN da.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as alerts_last_30_days,
           COUNT(CASE WHEN da.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as alerts_last_7_days
         FROM delay_alerts da
         JOIN orders o ON da.order_id = o.id
         WHERE o.shop_id = $1`,
        [shopId],
      );

      const orderRows = await query<OrderStats>(
        `SELECT
           COUNT(*) as total_orders,
           COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
           COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as orders_last_7_days,
           AVG(o.total_price::numeric) as average_order_value
         FROM orders o
         WHERE o.shop_id = $1`,
        [shopId],
      );

      return {
        alerts: alertRows[0] ?? {},
        orders: orderRows[0] ?? {},
      };
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch analytics",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async getShop(shopDomain: string): Promise<ShopInfo> {
    try {
      const rows = await query<ShopInfo>(
        // B6: shopify_shop_id / shop_name / plan_name are NOT columns on
        // `shops` and never have been — selecting them made /api/shop 500.
        // They are part of the ShopInfo contract but nothing populates
        // them (they would need a shop.json fetch at install), so they are
        // reported as NULL rather than silently dropped from the response.
        // `email` is served from the real merchant_email column.
        `SELECT
           shop_domain,
           NULL::text AS shopify_shop_id,
           NULL::text AS shop_name,
           merchant_email AS email,
           NULL::text AS plan_name,
           created_at,
           updated_at
         FROM shops
         WHERE shop_domain = $1`,
        [shopDomain],
      );
      if (rows.length === 0) {
        throw new ShopNotFoundError(shopDomain);
      }
      return rows[0];
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch shop",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async getMerchantSettings(shopDomain: string): Promise<MerchantSettings> {
    try {
      const shopRows = await query<{
        merchant_email: string | null;
        merchant_phone: string | null;
        merchant_name: string | null;
      }>(
        `SELECT merchant_email, merchant_phone, merchant_name
         FROM shops
         WHERE shop_domain = $1`,
        [shopDomain],
      );

      if (shopRows.length === 0) {
        throw new ShopNotFoundError(shopDomain);
      }

      const shop = shopRows[0];

      const settingsRows = await query<{
        warehouse_delays_enabled: boolean;
        carrier_delays_enabled: boolean;
        transit_delays_enabled: boolean;
      }>(
        `SELECT warehouse_delays_enabled, carrier_delays_enabled, transit_delays_enabled
         FROM app_settings
         WHERE shop_id = (SELECT id FROM shops WHERE shop_domain = $1)`,
        [shopDomain],
      );

      // Default to TRUE when app_settings has no row — matches the schema DEFAULTs.
      const settings = settingsRows[0] ?? {
        warehouse_delays_enabled: true,
        carrier_delays_enabled: true,
        transit_delays_enabled: true,
      };

      return {
        merchantEmail: shop.merchant_email,
        merchantPhone: shop.merchant_phone,
        merchantName: shop.merchant_name,
        warehouseDelaysEnabled: settings.warehouse_delays_enabled,
        carrierDelaysEnabled: settings.carrier_delays_enabled,
        transitDelaysEnabled: settings.transit_delays_enabled,
      };
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to fetch merchant settings",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  async updateMerchantSettings(
    shopDomain: string,
    input: UpdateMerchantSettingsInput,
  ): Promise<void> {
    // Validate inputs BEFORE resolving the shop — fail fast on bad payloads.
    if (
      input.merchantEmail !== undefined &&
      input.merchantEmail !== null &&
      typeof input.merchantEmail === "string" &&
      !EMAIL_REGEX.test(input.merchantEmail)
    ) {
      throw new MerchantApiValidationError(
        "Invalid email format",
        "INVALID_EMAIL",
      );
    }
    if (
      input.merchantPhone !== undefined &&
      input.merchantPhone !== null &&
      typeof input.merchantPhone === "string"
    ) {
      const digits = input.merchantPhone.replace(/\D/g, "");
      if (digits.length < 10) {
        throw new MerchantApiValidationError(
          "Invalid phone format - must contain at least 10 digits",
          "INVALID_PHONE",
        );
      }
    }

    try {
      const shopId = await this.resolveShopId(shopDomain);

      const hasContactUpdates =
        input.merchantEmail !== undefined ||
        input.merchantPhone !== undefined ||
        input.merchantName !== undefined;

      if (hasContactUpdates) {
        await query(
          `UPDATE shops
           SET
             merchant_email = COALESCE($1, merchant_email),
             merchant_phone = COALESCE($2, merchant_phone),
             merchant_name = COALESCE($3, merchant_name),
             updated_at = CURRENT_TIMESTAMP
           WHERE shop_domain = $4`,
          [
            input.merchantEmail,
            input.merchantPhone,
            input.merchantName,
            shopDomain,
          ],
        );
      }

      const hasToggleUpdates =
        input.warehouseDelaysEnabled !== undefined ||
        input.carrierDelaysEnabled !== undefined ||
        input.transitDelaysEnabled !== undefined;

      if (hasToggleUpdates) {
        await query(
          `UPDATE app_settings
           SET
             warehouse_delays_enabled = COALESCE($1, warehouse_delays_enabled),
             carrier_delays_enabled = COALESCE($2, carrier_delays_enabled),
             transit_delays_enabled = COALESCE($3, transit_delays_enabled),
             updated_at = CURRENT_TIMESTAMP
           WHERE shop_id = $4`,
          [
            input.warehouseDelaysEnabled,
            input.carrierDelaysEnabled,
            input.transitDelaysEnabled,
            shopId,
          ],
        );
      }
    } catch (error) {
      if (error instanceof ShopNotFoundError) throw error;
      logger.error(
        "Failed to update merchant settings",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain },
      );
      throw error;
    }
  }

  /**
   * Persist the merchant's triage status for one alert. Multi-tenant safe:
   * the UPDATE is scoped through orders.shop_id so a shop can never mutate
   * another shop's alert. Throws AlertNotFoundError (routes → 404) when the
   * id doesn't exist or belongs to another shop, so a cross-tenant probe is
   * indistinguishable from a missing id.
   */
  async updateAlertStatus(
    shopDomain: string,
    alertId: string,
    status: AlertStatus,
  ): Promise<void> {
    // Validate BEFORE resolving the shop so a bad body fails fast.
    if (!ALERT_STATUSES.has(status)) {
      throw new MerchantApiValidationError(
        "status must be one of: active, resolved, dismissed",
        "INVALID_STATUS",
      );
    }

    try {
      const shopId = await this.resolveShopId(shopDomain);
      const rows = await query<{ id: string }>(
        `UPDATE delay_alerts
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND order_id IN (SELECT id FROM orders WHERE shop_id = $3)
         RETURNING id`,
        [status, alertId, shopId],
      );
      if (rows.length === 0) {
        throw new AlertNotFoundError(alertId);
      }
    } catch (error) {
      if (
        error instanceof ShopNotFoundError ||
        error instanceof AlertNotFoundError
      ) {
        throw error;
      }
      logger.error(
        "Failed to update alert status",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain, alertId },
      );
      throw error;
    }
  }
}
