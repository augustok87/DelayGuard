/**
 * G2 / Phase 2.1.f — wire-shape mappers.
 *
 * The backend merchant API returns snake_case rows (AlertRow / OrderRow /
 * AppSettingsRow / AnalyticsSummary in merchant-api-service.ts). The UI
 * types are camelCase. These mappers are the single narrowing point
 * between `ApiResponse.data: unknown` and the Redux store.
 */
import {
  mapAlertRow,
  mapAlertRows,
  mapOrderRow,
  mapOrderRows,
  mapSettingsRow,
  settingsToWire,
  mapAnalyticsToStats,
  mapShopDomain,
} from "../../../utils/api-mappers";
import { AppSettings } from "../../../types";

const wireAlert = {
  id: 42,
  order_id: "7",
  status: "pending",
  delay_reason: "CARRIER_DELAY",
  estimated_delay_days: 3,
  notification_sent_at: null,
  created_at: "2026-07-01T10:00:00Z",
  updated_at: "2026-07-01T10:00:00Z",
  order_number: "1001",
  customer_email: "jane@example.com",
  customer_name: "Jane Doe",
  total_price: "384.99",
  order_created_at: "2026-06-28T09:00:00Z",
};

describe("mapAlertRow", () => {
  it("maps a snake_case AlertRow onto a camelCase DelayAlert", () => {
    const alert = mapAlertRow(wireAlert);
    expect(alert).toMatchObject({
      id: "42",
      orderId: "1001",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      delayDays: 3,
      status: "active",
      createdAt: "2026-07-01T10:00:00Z",
      delayReason: "CARRIER_DELAY",
      totalAmount: 384.99,
    });
  });

  it("maps sent/pending/failed statuses to 'active' and passes through resolved/dismissed", () => {
    expect(mapAlertRow({ ...wireAlert, status: "sent" })?.status).toBe("active");
    expect(mapAlertRow({ ...wireAlert, status: "failed" })?.status).toBe("active");
    expect(mapAlertRow({ ...wireAlert, status: "resolved" })?.status).toBe("resolved");
    expect(mapAlertRow({ ...wireAlert, status: "dismissed" })?.status).toBe("dismissed");
  });

  it("marks the email notification as sent when notification_sent_at is set", () => {
    const alert = mapAlertRow({
      ...wireAlert,
      notification_sent_at: "2026-07-01T11:00:00Z",
    });
    expect(alert?.notificationStatus).toEqual({
      emailSent: true,
      emailSentAt: "2026-07-01T11:00:00Z",
    });
  });

  it("leaves notificationStatus undefined when nothing was sent", () => {
    expect(mapAlertRow(wireAlert)?.notificationStatus).toBeUndefined();
  });

  it("tolerates null customer_email and unparseable totals", () => {
    const alert = mapAlertRow({
      ...wireAlert,
      customer_email: null,
      total_price: "not-a-number",
    });
    expect(alert?.customerEmail).toBeUndefined();
    expect(alert?.totalAmount).toBeUndefined();
  });

  it("defaults delayDays to 0 when estimated_delay_days is null", () => {
    expect(mapAlertRow({ ...wireAlert, estimated_delay_days: null })?.delayDays).toBe(0);
  });

  it("returns null for rows that are not objects or lack an id", () => {
    expect(mapAlertRow(null)).toBeNull();
    expect(mapAlertRow("junk")).toBeNull();
    expect(mapAlertRow({ status: "pending" })).toBeNull();
  });

  describe("Phase 2.1 customer-intelligence fields", () => {
    it("maps priority score + level when present", () => {
      const alert = mapAlertRow({
        ...wireAlert,
        priority_score: 78,
        priority_level: "High",
      });
      expect(alert?.priorityScore).toBe(78);
      expect(alert?.priorityLevel).toBe("High");
    });

    it("maps the financial breakdown when present", () => {
      const alert = mapAlertRow({
        ...wireAlert,
        subtotal_price: "350.00",
        total_tax: "24.99",
        total_discounts: "10.00",
        total_shipping_price: "20.00",
      });
      expect(alert?.financialBreakdown).toEqual({
        subtotal: 350,
        tax: 24.99,
        discounts: 10,
        shipping: 20,
      });
    });

    it("maps the shipping destination when present", () => {
      const alert = mapAlertRow({
        ...wireAlert,
        shipping_city: "Denver",
        shipping_province_code: "CO",
        shipping_country_code: "US",
        shipping_zip: "80202",
      });
      expect(alert?.shippingDestination).toEqual({
        city: "Denver",
        provinceCode: "CO",
        countryCode: "US",
        zip: "80202",
      });
    });

    it("omits the 2.1 objects entirely when the columns are absent from the wire row", () => {
      const alert = mapAlertRow(wireAlert);
      expect(alert?.priorityScore).toBeUndefined();
      expect(alert?.priorityLevel).toBeUndefined();
      expect(alert?.financialBreakdown).toBeUndefined();
      expect(alert?.shippingDestination).toBeUndefined();
    });

    it("ignores an unknown priority_level value", () => {
      const alert = mapAlertRow({ ...wireAlert, priority_level: "Extreme" });
      expect(alert?.priorityLevel).toBeUndefined();
    });
  });
});

describe("mapAlertRows", () => {
  it("maps arrays and drops malformed entries", () => {
    const alerts = mapAlertRows([wireAlert, null, { bogus: true }]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("42");
  });

  it("returns [] for non-array input", () => {
    expect(mapAlertRows(undefined as unknown as unknown[])).toEqual([]);
  });
});

const wireOrder = {
  id: 7,
  shopify_order_id: "9999",
  order_number: "1001",
  customer_email: "jane@example.com",
  customer_name: "Jane Doe",
  total_price: "129.50",
  financial_status: "paid",
  fulfillment_status: "fulfilled",
  created_at: "2026-06-28T09:00:00Z",
  updated_at: "2026-06-29T09:00:00Z",
  alert_count: "1",
  last_alert_at: "2026-07-01T10:00:00Z",
};

describe("mapOrderRow", () => {
  it("maps a snake_case OrderRow onto a camelCase Order", () => {
    expect(mapOrderRow(wireOrder)).toMatchObject({
      id: "7",
      orderNumber: "1001",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      status: "shipped",
      createdAt: "2026-06-28T09:00:00Z",
      totalAmount: 129.5,
    });
  });

  it("derives processing status for unfulfilled/partial/null fulfillment", () => {
    expect(mapOrderRow({ ...wireOrder, fulfillment_status: null })?.status).toBe("processing");
    expect(mapOrderRow({ ...wireOrder, fulfillment_status: "partial" })?.status).toBe("processing");
  });

  it("passes a delivered fulfillment through", () => {
    expect(mapOrderRow({ ...wireOrder, fulfillment_status: "delivered" })?.status).toBe("delivered");
  });

  it("returns null for malformed rows", () => {
    expect(mapOrderRow(null)).toBeNull();
    expect(mapOrderRow({ customer_name: "No id" })).toBeNull();
  });
});

describe("mapOrderRows", () => {
  it("maps arrays and drops malformed entries", () => {
    expect(mapOrderRows([wireOrder, 3])).toHaveLength(1);
  });
});

describe("mapSettingsRow / settingsToWire", () => {
  const base: AppSettings = {
    delayThreshold: 2,
    notificationTemplate: "default",
    emailNotifications: true,
    smsNotifications: false,
    autoResolveDays: 7,
    enableAnalytics: true,
    theme: "light",
    language: "en",
  };

  it("overlays wire settings onto the provided base settings", () => {
    const settings = mapSettingsRow(
      {
        delay_threshold_days: 5,
        email_enabled: false,
        sms_enabled: true,
        notification_template: "custom",
        custom_message: null,
      },
      base,
    );
    expect(settings).toMatchObject({
      delayThreshold: 5,
      emailNotifications: false,
      smsNotifications: true,
      notificationTemplate: "custom",
      // untouched local-only fields survive
      autoResolveDays: 7,
      theme: "light",
    });
  });

  it("keeps base values when wire fields are missing", () => {
    const settings = mapSettingsRow({}, base);
    expect(settings).toEqual(base);
  });

  it("returns base for non-object input", () => {
    expect(mapSettingsRow(null, base)).toEqual(base);
  });

  it("serializes UI settings to the snake_case wire shape", () => {
    expect(settingsToWire({ ...base, delayThreshold: 4, smsNotifications: true })).toEqual({
      delay_threshold_days: 4,
      email_enabled: true,
      sms_enabled: true,
      notification_template: "default",
    });
  });
});

describe("mapAnalyticsToStats", () => {
  it("maps Postgres string counts into numeric StatsData", () => {
    const stats = mapAnalyticsToStats({
      alerts: {
        total_alerts: "12",
        sent_alerts: "9",
        pending_alerts: "3",
        failed_alerts: "0",
        alerts_last_30_days: "5",
        alerts_last_7_days: "2",
      },
      orders: {
        total_orders: "104",
        orders_last_30_days: "40",
        orders_last_7_days: "11",
        average_order_value: "88.12",
      },
    });
    expect(stats).toEqual({
      totalAlerts: 12,
      activeAlerts: 3,
      resolvedAlerts: 9,
      totalOrders: 104,
      delayedOrders: 12,
    });
  });

  it("returns zeroed stats for empty analytics objects (fresh shop)", () => {
    const stats = mapAnalyticsToStats({ alerts: {}, orders: {} });
    expect(stats).toEqual({
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      totalOrders: 0,
      delayedOrders: 0,
    });
  });

  it("returns zeroed stats for malformed input", () => {
    expect(mapAnalyticsToStats(null).totalAlerts).toBe(0);
  });
});

describe("mapShopDomain", () => {
  it("extracts shop_domain from ShopInfo", () => {
    expect(mapShopDomain({ shop_domain: "test.myshopify.com" })).toBe("test.myshopify.com");
  });

  it("returns null when absent", () => {
    expect(mapShopDomain({})).toBeNull();
    expect(mapShopDomain(null)).toBeNull();
  });
});
