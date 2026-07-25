/**
 * Wire-shape mappers — G2 / Phase 2.1.f.
 *
 * The merchant API (src/services/merchant-api-service.ts) returns
 * snake_case rows at the boundary; the UI types (src/types) are
 * camelCase. `ApiClient` intentionally types response bodies as
 * `unknown` (Wave 3.4 typing-hygiene rule), so this module is the single
 * narrowing point between the wire and the Redux store.
 *
 * Every mapper is defensive: malformed rows map to `null` (dropped by
 * the array variants) instead of throwing, so one bad row can never
 * blank the dashboard.
 */
import { AppSettings, DelayAlert, Order, StatsData } from "../types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

/** Postgres returns COUNT()/NUMERIC as strings; ids may be numbers. */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toCount(value: unknown): number {
  return toNumber(value) ?? 0;
}

function toIdString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * delay_alerts.status on the wire is 'pending' | 'sent' | 'failed'
 * (dispatch lifecycle). The UI models merchant workflow instead:
 * 'active' | 'resolved' | 'dismissed'. Anything that isn't an explicit
 * merchant resolution is an active alert.
 */
function mapAlertStatus(value: unknown): DelayAlert["status"] {
  if (value === "resolved" || value === "dismissed") return value;
  return "active";
}

const PRIORITY_LEVELS: ReadonlySet<string> = new Set([
  "Critical",
  "High",
  "Medium",
  "Low",
]);

function mapPriorityLevel(value: unknown): DelayAlert["priorityLevel"] {
  return typeof value === "string" && PRIORITY_LEVELS.has(value)
    ? (value as DelayAlert["priorityLevel"])
    : undefined;
}

/** Map one snake_case AlertRow (plus optional Phase 2.1 columns) to a DelayAlert. */
export function mapAlertRow(row: unknown): DelayAlert | null {
  const record = asRecord(row);
  if (!record) return null;

  const id = toIdString(record.id);
  if (!id) return null;

  const alert: DelayAlert = {
    id,
    // The UI displays "Order #<orderId>" — the human-facing order number
    // is the right value there, not the internal DB id.
    orderId:
      toOptionalString(record.order_number) ??
      toIdString(record.order_id) ??
      id,
    customerName: toOptionalString(record.customer_name) ?? "Unknown customer",
    delayDays: toNumber(record.estimated_delay_days) ?? 0,
    status: mapAlertStatus(record.status),
    createdAt: toOptionalString(record.created_at) ?? "",
  };

  const customerEmail = toOptionalString(record.customer_email);
  if (customerEmail) alert.customerEmail = customerEmail;

  const delayReason = toOptionalString(record.delay_reason);
  if (delayReason) alert.delayReason = delayReason;

  const totalAmount = toNumber(record.total_price);
  if (totalAmount !== undefined) alert.totalAmount = totalAmount;

  const notificationSentAt = toOptionalString(record.notification_sent_at);
  if (notificationSentAt) {
    alert.notificationStatus = {
      emailSent: true,
      emailSentAt: notificationSentAt,
    };
  }

  // Phase 2.1.b — priority score (optional wire columns).
  const priorityScore = toNumber(record.priority_score);
  if (priorityScore !== undefined) alert.priorityScore = priorityScore;
  const priorityLevel = mapPriorityLevel(record.priority_level);
  if (priorityLevel) alert.priorityLevel = priorityLevel;

  // Phase 2.1.c — financial breakdown (optional wire columns).
  const subtotal = toNumber(record.subtotal_price);
  const tax = toNumber(record.total_tax);
  const discounts = toNumber(record.total_discounts);
  const shipping = toNumber(record.total_shipping_price);
  if (
    subtotal !== undefined ||
    tax !== undefined ||
    discounts !== undefined ||
    shipping !== undefined
  ) {
    alert.financialBreakdown = {
      ...(subtotal !== undefined ? { subtotal } : {}),
      ...(shipping !== undefined ? { shipping } : {}),
      ...(tax !== undefined ? { tax } : {}),
      ...(discounts !== undefined ? { discounts } : {}),
    };
  }

  // Phase 2.1.d — shipping destination (optional wire columns).
  const city = toOptionalString(record.shipping_city);
  const provinceCode = toOptionalString(record.shipping_province_code);
  const countryCode = toOptionalString(record.shipping_country_code);
  const zip = toOptionalString(record.shipping_zip);
  if (city || provinceCode || countryCode || zip) {
    alert.shippingDestination = {
      ...(city ? { city } : {}),
      ...(provinceCode ? { provinceCode } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(zip ? { zip } : {}),
    };
  }

  return alert;
}

export function mapAlertRows(rows: unknown): DelayAlert[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(mapAlertRow)
    .filter((alert): alert is DelayAlert => alert !== null);
}

/**
 * orders.fulfillment_status → UI order status. Shopify's canonical
 * values are null/'unfulfilled', 'partial', 'fulfilled'; 'delivered'
 * passes through if a future ingest provides it.
 */
function mapOrderStatus(value: unknown): string {
  if (value === "fulfilled") return "shipped";
  if (value === "delivered") return "delivered";
  return "processing";
}

/** Map one snake_case OrderRow to an Order. */
export function mapOrderRow(row: unknown): Order | null {
  const record = asRecord(row);
  if (!record) return null;

  const id = toIdString(record.id);
  if (!id) return null;

  const order: Order = {
    id,
    orderNumber: toOptionalString(record.order_number) ?? id,
    customerName: toOptionalString(record.customer_name) ?? "Unknown customer",
    status: mapOrderStatus(record.fulfillment_status),
    createdAt: toOptionalString(record.created_at) ?? "",
  };

  const customerEmail = toOptionalString(record.customer_email);
  if (customerEmail) order.customerEmail = customerEmail;

  const totalAmount = toNumber(record.total_price);
  if (totalAmount !== undefined) order.totalAmount = totalAmount;

  return order;
}

export function mapOrderRows(rows: unknown): Order[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(mapOrderRow)
    .filter((order): order is Order => order !== null);
}

/**
 * Overlay a snake_case AppSettingsRow onto the current UI settings.
 * Local-only fields (theme, language, autoResolveDays, …) are preserved
 * — the wire only carries the five persisted columns.
 */
export function mapSettingsRow(row: unknown, base: AppSettings): AppSettings {
  const record = asRecord(row);
  if (!record) return { ...base };

  const settings: AppSettings = { ...base };

  const threshold = toNumber(record.delay_threshold_days);
  if (threshold !== undefined) settings.delayThreshold = threshold;
  if (typeof record.email_enabled === "boolean") {
    settings.emailNotifications = record.email_enabled;
  }
  if (typeof record.sms_enabled === "boolean") {
    settings.smsNotifications = record.sms_enabled;
  }
  const template = toOptionalString(record.notification_template);
  if (template) settings.notificationTemplate = template;

  return settings;
}

/** Serialize UI settings to the PUT /api/settings snake_case body. */
export function settingsToWire(settings: AppSettings): UnknownRecord {
  return {
    delay_threshold_days: settings.delayThreshold,
    email_enabled: settings.emailNotifications,
    sms_enabled: settings.smsNotifications,
    notification_template: settings.notificationTemplate,
  };
}

/**
 * Map the /api/analytics summary (Postgres string counts, possibly `{}`
 * for a fresh shop) to StatsData. Only real, derivable numbers — no
 * fabricated metrics (listing req 4.3.3).
 */
export function mapAnalyticsToStats(data: unknown): StatsData {
  const record = asRecord(data);
  const alerts = asRecord(record?.alerts) ?? {};
  const orders = asRecord(record?.orders) ?? {};

  const totalAlerts = toCount(alerts.total_alerts);

  return {
    totalAlerts,
    activeAlerts: toCount(alerts.pending_alerts),
    resolvedAlerts: toCount(alerts.sent_alerts),
    totalOrders: toCount(orders.total_orders),
    delayedOrders: totalAlerts,
  };
}

/** Extract the shop domain from the /api/shop ShopInfo payload. */
export function mapShopDomain(data: unknown): string | null {
  const record = asRecord(data);
  return record ? (toOptionalString(record.shop_domain) ?? null) : null;
}
