/**
 * MerchantApiService tests
 *
 * TDD-first per .claude/rules/tests.md.
 *
 * Coverage strategy per Wave 2.1 spec:
 *   - happy path
 *   - shop-not-found (typed ShopNotFoundError → routes map to 404)
 *   - multi-tenant guard (assert WHERE filter scopes by resolved shop_id)
 *   - DB-failure propagation
 *   - v1.19 field-population rule for every UPDATE/INSERT (every column
 *     in the SQL parameter array asserted)
 *
 * Wire-shape contract: snake_case at the boundary for the existing
 * endpoints (alerts/orders/settings/analytics/shop). /merchant-settings
 * is camelCase because it already was — preserved.
 */

import {
  MerchantApiService,
  ShopNotFoundError,
  MerchantApiValidationError,
  AlertNotFoundError,
} from "./merchant-api-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;
const RESOLVED_SHOP_ID = "shop-42";
const SHOP = "test-shop.myshopify.com";

// Stand-in for the first SELECT id FROM shops query inside resolveShopId.
function mockShopResolved(id: string = RESOLVED_SHOP_ID): void {
  mockQuery.mockResolvedValueOnce([{ id }]);
}

function mockShopMissing(): void {
  mockQuery.mockResolvedValueOnce([]);
}

describe("MerchantApiService", () => {
  let service: MerchantApiService;

  beforeEach(() => {
    service = new MerchantApiService();
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([]);
  });

  describe("resolveShopId (implicit, via every method)", () => {
    it("issues a single shop-id lookup with shop_domain as the only param", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // alerts query

      await service.getAlerts(SHOP);

      const [resolveSql, resolveParams] = mockQuery.mock.calls[0];
      expect(resolveSql).toMatch(/SELECT\s+id\s+FROM\s+shops/i);
      expect(resolveSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(resolveParams).toEqual([SHOP]);
    });

    it("throws ShopNotFoundError carrying the shop domain when no row matches", async() => {
      mockShopMissing();

      await expect(service.getAlerts(SHOP)).rejects.toBeInstanceOf(
        ShopNotFoundError,
      );
      // Only the resolve call should have happened — no downstream query
      expect(mockQuery).toHaveBeenCalledTimes(1);

      mockShopMissing();
      await expect(service.getAlerts(SHOP)).rejects.toMatchObject({
        shopDomain: SHOP,
      });
    });

    it("propagates a database failure on the resolve query (bubbles to 500)", async() => {
      mockQuery.mockRejectedValueOnce(new Error("pool exhausted"));

      await expect(service.getAlerts(SHOP)).rejects.toThrow("pool exhausted");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getAlerts", () => {
    it("scopes the SELECT to the resolved shop_id and returns the rows verbatim (snake_case)", async() => {
      const alerts = [
        {
          id: "alert-1",
          order_id: "order-1",
          status: "sent",
          delay_reason: "carrier delay",
          estimated_delay_days: 2,
          notification_sent_at: "2026-05-10T12:00:00.000Z",
          created_at: "2026-05-09T08:00:00.000Z",
          updated_at: "2026-05-09T08:00:00.000Z",
          order_number: "1001",
          customer_email: "buyer@example.com",
          customer_name: "Buyer One",
          total_price: "99.99",
          order_created_at: "2026-05-01T00:00:00.000Z",
        },
      ];

      mockShopResolved();
      mockQuery.mockResolvedValueOnce(alerts);

      const result = await service.getAlerts(SHOP);

      const [alertsSql, alertsParams] = mockQuery.mock.calls[1];
      // Multi-tenant guard: WHERE filter must scope by the resolved shop_id
      expect(alertsSql).toMatch(/FROM\s+delay_alerts/i);
      expect(alertsSql).toMatch(/JOIN\s+orders/i);
      expect(alertsSql).toMatch(/WHERE\s+o\.shop_id\s*=\s*\$1/i);
      expect(alertsSql).toMatch(/ORDER BY\s+da\.created_at\s+DESC/i);
      expect(alertsSql).toMatch(/LIMIT\s+100/i);
      expect(alertsParams).toEqual([RESOLVED_SHOP_ID]);

      // Wire shape preserved (snake_case at the boundary)
      expect(result).toEqual(alerts);
    });

    it("selects the Phase 2.1 intelligence columns (priority + financial + shipping address), field by field", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);

      await service.getAlerts(SHOP);

      const [alertsSql] = mockQuery.mock.calls[1];
      const sql = alertsSql as string;

      // Priority score (Phase 2.1.b) — denormalized on delay_alerts
      expect(sql).toMatch(/da\.priority_score/);
      expect(sql).toMatch(/da\.priority_level/);
      // Financial breakdown (Phase 2.1.c) — order-level columns
      expect(sql).toMatch(/o\.subtotal_price/);
      expect(sql).toMatch(/o\.total_tax/);
      expect(sql).toMatch(/o\.total_discounts/);
      expect(sql).toMatch(/o\.total_shipping_price/);
      // Shipping address (Phase 2.1.d) — order-level columns
      expect(sql).toMatch(/o\.shipping_city/);
      expect(sql).toMatch(/o\.shipping_province_code/);
      expect(sql).toMatch(/o\.shipping_country_code/);
      expect(sql).toMatch(/o\.shipping_zip/);
    });

    it("returns the intelligence fields verbatim (wire shape flows to api-mappers)", async() => {
      const alerts = [
        {
          id: "alert-2",
          order_id: "order-2",
          status: "active",
          delay_reason: "warehouse delay",
          estimated_delay_days: 3,
          notification_sent_at: null,
          created_at: "2026-07-20T08:00:00.000Z",
          updated_at: "2026-07-20T08:00:00.000Z",
          order_number: "1002",
          customer_email: "buyer2@example.com",
          customer_name: "Buyer Two",
          total_price: "149.99",
          order_created_at: "2026-07-15T00:00:00.000Z",
          priority_score: "87.5",
          priority_level: "high",
          subtotal_price: "120.00",
          total_tax: "12.00",
          total_discounts: "5.00",
          total_shipping_price: "22.99",
          shipping_city: "Austin",
          shipping_province_code: "TX",
          shipping_country_code: "US",
          shipping_zip: "78701",
        },
      ];

      mockShopResolved();
      mockQuery.mockResolvedValueOnce(alerts);

      const result = await service.getAlerts(SHOP);
      expect(result).toEqual(alerts);
    });

    it("returns an empty array when the shop has no alerts", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.getAlerts(SHOP);
      expect(result).toEqual([]);
    });

    it("propagates a DB failure from the alerts query", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("connection refused"));

      await expect(service.getAlerts(SHOP)).rejects.toThrow(
        "connection refused",
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("updateAlertStatus", () => {
    it("rejects an out-of-enum status with a validation error BEFORE touching the DB", async() => {
      await expect(
        service.updateAlertStatus(SHOP, "42", "bogus" as never),
      ).rejects.toBeInstanceOf(MerchantApiValidationError);
      // No query at all — fails fast before resolveShopId
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("scopes the UPDATE to the resolved shop_id (multi-tenant guard) and writes status + updated_at", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([{ id: "42" }]); // UPDATE ... RETURNING id

      await service.updateAlertStatus(SHOP, "42", "resolved");

      const [updateSql, updateParams] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+delay_alerts/i);
      expect(updateSql).toMatch(/SET[\s\S]*status\s*=\s*\$1/i);
      expect(updateSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
      // Cross-tenant guard: the row must belong to an order owned by this shop
      expect(updateSql).toMatch(/shop_id\s*=\s*\$3/i);
      expect(updateParams).toEqual(["resolved", "42", RESOLVED_SHOP_ID]);
    });

    it("accepts every allowed status value", async() => {
      for (const status of ["active", "resolved", "dismissed"] as const) {
        mockQuery.mockReset();
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([{ id: "7" }]);
        await expect(
          service.updateAlertStatus(SHOP, "7", status),
        ).resolves.toBeUndefined();
      }
    });

    it("throws AlertNotFoundError when no row matches (wrong shop or missing id)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // UPDATE affected nothing

      await expect(
        service.updateAlertStatus(SHOP, "999", "resolved"),
      ).rejects.toBeInstanceOf(AlertNotFoundError);
    });

    it("propagates a DB failure and logs", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("deadlock detected"));

      await expect(
        service.updateAlertStatus(SHOP, "42", "dismissed"),
      ).rejects.toThrow("deadlock detected");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getOrders", () => {
    it("scopes by shop_id, applies the limit param, and returns rows verbatim", async() => {
      const orders = [
        {
          id: "order-1",
          shopify_order_id: "gid://shopify/Order/1",
          order_number: "1001",
          customer_email: "buyer@example.com",
          customer_name: "Buyer One",
          total_price: "120.00",
          financial_status: "paid",
          fulfillment_status: "fulfilled",
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-02T00:00:00.000Z",
          alert_count: "2",
          last_alert_at: "2026-05-02T00:00:00.000Z",
        },
      ];

      mockShopResolved();
      mockQuery.mockResolvedValueOnce(orders);

      const result = await service.getOrders(SHOP, 25);

      const [ordersSql, ordersParams] = mockQuery.mock.calls[1];
      expect(ordersSql).toMatch(/FROM\s+orders\s+o/i);
      expect(ordersSql).toMatch(/LEFT\s+JOIN\s+delay_alerts/i);
      expect(ordersSql).toMatch(/WHERE\s+o\.shop_id\s*=\s*\$1/i);
      expect(ordersSql).toMatch(/GROUP\s+BY\s+o\.id/i);
      expect(ordersSql).toMatch(/LIMIT\s+\$2/i);
      expect(ordersParams).toEqual([RESOLVED_SHOP_ID, 25]);

      expect(result).toEqual(orders);
    });

    it("propagates a DB failure from the orders query", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("timeout"));

      await expect(service.getOrders(SHOP, 50)).rejects.toThrow("timeout");
    });
  });

  describe("getSettings", () => {
    const existingRow = {
      delay_threshold_days: 3,
      email_enabled: true,
      sms_enabled: false,
      notification_template: "custom",
      custom_message: "Hi!",
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-05-01"),
    };

    it("returns the existing settings row when one exists (snake_case)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([existingRow]);

      const result = await service.getSettings(SHOP);

      const [readSql, readParams] = mockQuery.mock.calls[1];
      expect(readSql).toMatch(/SELECT[\s\S]+FROM\s+app_settings/i);
      expect(readSql).toMatch(/WHERE\s+shop_id\s*=\s*\$1/i);
      expect(readParams).toEqual([RESOLVED_SHOP_ID]);
      expect(result).toEqual(existingRow);
      // Only 2 queries total: resolve + read; no defaults INSERT
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("seeds defaults via INSERT … ON CONFLICT and returns the defaulted shape when no row exists", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // read miss
      mockQuery.mockResolvedValueOnce([]); // seed insert

      const result = await service.getSettings(SHOP);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      const [insertSql, insertParams] = mockQuery.mock.calls[2];
      expect(insertSql).toMatch(/INSERT\s+INTO\s+app_settings/i);
      expect(insertSql).toMatch(
        /\(\s*shop_id,\s*delay_threshold_days,\s*email_enabled,\s*sms_enabled,\s*notification_template\s*\)/i,
      );
      expect(insertSql).toMatch(/ON\s+CONFLICT\s*\(\s*shop_id\s*\)\s*DO\s+NOTHING/i);
      // v1.19 field-population: every persisted default in params
      expect(insertParams).toEqual([
        RESOLVED_SHOP_ID,
        2,
        true,
        false,
        "default",
      ]);

      // Default shape on the wire — matches pre-refactor route behavior
      // (no created_at/updated_at in the default payload)
      expect(result).toEqual({
        delay_threshold_days: 2,
        email_enabled: true,
        sms_enabled: false,
        notification_template: "default",
        custom_message: null,
      });
    });
  });

  describe("updateSettings", () => {
    it("UPDATEs every column via COALESCE, scoped to the resolved shop_id, with every column in the params array (v1.19)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);

      await service.updateSettings(SHOP, {
        delay_threshold_days: 5,
        email_enabled: true,
        sms_enabled: false,
        notification_template: "custom",
        custom_message: "Hello",
      });

      const [updateSql, updateParams] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+app_settings/i);
      expect(updateSql).toMatch(
        /delay_threshold_days\s*=\s*COALESCE\(\$1,\s*delay_threshold_days\)/i,
      );
      expect(updateSql).toMatch(/email_enabled\s*=\s*COALESCE\(\$2/i);
      expect(updateSql).toMatch(/sms_enabled\s*=\s*COALESCE\(\$3/i);
      expect(updateSql).toMatch(/notification_template\s*=\s*COALESCE\(\$4/i);
      expect(updateSql).toMatch(/custom_message\s*=\s*COALESCE\(\$5/i);
      expect(updateSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
      expect(updateSql).toMatch(/WHERE\s+shop_id\s*=\s*\$6/i);

      // v1.19: every column explicitly present in the param array
      expect(updateParams).toEqual([
        5,
        true,
        false,
        "custom",
        "Hello",
        RESOLVED_SHOP_ID,
      ]);
    });

    it("passes undefined through for partial updates (relies on COALESCE)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);

      await service.updateSettings(SHOP, { email_enabled: false });

      const [, updateParams] = mockQuery.mock.calls[1];
      expect(updateParams).toEqual([
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        RESOLVED_SHOP_ID,
      ]);
    });

    it("rejects delay_threshold_days < 1 with INVALID_THRESHOLD before resolving the shop", async() => {
      await expect(
        service.updateSettings(SHOP, { delay_threshold_days: 0 }),
      ).rejects.toMatchObject({
        name: "MerchantApiValidationError",
        code: "INVALID_THRESHOLD",
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects delay_threshold_days > 30 with INVALID_THRESHOLD", async() => {
      await expect(
        service.updateSettings(SHOP, { delay_threshold_days: 100 }),
      ).rejects.toBeInstanceOf(MerchantApiValidationError);
    });

    it("rejects non-numeric delay_threshold_days with INVALID_THRESHOLD", async() => {
      await expect(
        service.updateSettings(SHOP, {
          delay_threshold_days: "not a number" as unknown as number,
        }),
      ).rejects.toMatchObject({ code: "INVALID_THRESHOLD" });
    });

    it("throws ShopNotFoundError when the shop is missing (no UPDATE attempted)", async() => {
      mockShopMissing();
      await expect(
        service.updateSettings(SHOP, { delay_threshold_days: 5 }),
      ).rejects.toBeInstanceOf(ShopNotFoundError);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("propagates a DB failure from the UPDATE", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("deadlock"));
      await expect(
        service.updateSettings(SHOP, { delay_threshold_days: 5 }),
      ).rejects.toThrow("deadlock");
    });
  });

  describe("getAnalytics", () => {
    it("issues two stat queries scoped by shop_id and returns the wire-shape envelope", async() => {
      const alertStats = {
        total_alerts: "10",
        sent_alerts: "8",
        pending_alerts: "2",
        failed_alerts: "0",
        alerts_last_30_days: "5",
        alerts_last_7_days: "1",
      };
      const orderStats = {
        total_orders: "100",
        orders_last_30_days: "20",
        orders_last_7_days: "5",
        average_order_value: "85.50",
      };

      mockShopResolved();
      mockQuery
        .mockResolvedValueOnce([alertStats])
        .mockResolvedValueOnce([orderStats]);

      const result = await service.getAnalytics(SHOP);

      const [alertSql, alertParams] = mockQuery.mock.calls[1];
      const [orderSql, orderParams] = mockQuery.mock.calls[2];
      expect(alertSql).toMatch(/FROM\s+delay_alerts/i);
      expect(alertSql).toMatch(/JOIN\s+orders/i);
      expect(alertSql).toMatch(/WHERE\s+o\.shop_id\s*=\s*\$1/i);
      expect(alertParams).toEqual([RESOLVED_SHOP_ID]);

      expect(orderSql).toMatch(/FROM\s+orders/i);
      expect(orderSql).toMatch(/WHERE\s+o\.shop_id\s*=\s*\$1/i);
      expect(orderParams).toEqual([RESOLVED_SHOP_ID]);

      expect(result).toEqual({ alerts: alertStats, orders: orderStats });
    });

    it("returns empty-object envelopes when both stat queries return no rows", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getAnalytics(SHOP);

      expect(result).toEqual({ alerts: {}, orders: {} });
    });
  });

  describe("getShop", () => {
    it("returns a typed snake_case ShopInfo when the shop exists", async() => {
      const row = {
        shop_domain: SHOP,
        shopify_shop_id: "gid://shopify/Shop/1",
        shop_name: "Test Shop",
        email: "owner@test.com",
        plan_name: "basic",
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-05-01"),
      };
      mockQuery.mockResolvedValueOnce([row]);

      const result = await service.getShop(SHOP);

      const [shopSql, shopParams] = mockQuery.mock.calls[0];
      // getShop does NOT call resolveShopId (it IS the lookup); single query
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(shopSql).toMatch(/SELECT[\s\S]+FROM\s+shops/i);
      expect(shopSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(shopParams).toEqual([SHOP]);
      expect(result).toEqual(row);
    });

    it("throws ShopNotFoundError when the shop is missing", async() => {
      mockQuery.mockResolvedValueOnce([]);
      await expect(service.getShop(SHOP)).rejects.toBeInstanceOf(
        ShopNotFoundError,
      );
    });

    it("propagates a DB failure", async() => {
      mockQuery.mockRejectedValueOnce(new Error("connection lost"));
      await expect(service.getShop(SHOP)).rejects.toThrow("connection lost");
    });
  });

  describe("getMerchantSettings", () => {
    it("returns merchant contact + delay-type toggles in camelCase (boundary contract preserved)", async() => {
      // Reads merchant fields from shops, then toggles from app_settings.
      mockQuery
        .mockResolvedValueOnce([
          {
            merchant_email: "merchant@test.com",
            merchant_phone: "+15551234567",
            merchant_name: "Merchant One",
          },
        ])
        .mockResolvedValueOnce([
          {
            warehouse_delays_enabled: true,
            carrier_delays_enabled: false,
            transit_delays_enabled: true,
          },
        ]);

      const result = await service.getMerchantSettings(SHOP);

      expect(result).toEqual({
        merchantEmail: "merchant@test.com",
        merchantPhone: "+15551234567",
        merchantName: "Merchant One",
        warehouseDelaysEnabled: true,
        carrierDelaysEnabled: false,
        transitDelaysEnabled: true,
      });

      // Boundary contract: NO snake_case keys leak
      expect(result).not.toHaveProperty("merchant_email");
      expect(result).not.toHaveProperty("warehouse_delays_enabled");

      const [shopSql, shopParams] = mockQuery.mock.calls[0];
      expect(shopSql).toMatch(/FROM\s+shops/i);
      expect(shopSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(shopParams).toEqual([SHOP]);

      const [settingsSql] = mockQuery.mock.calls[1];
      expect(settingsSql).toMatch(/FROM\s+app_settings/i);
      expect(settingsSql).toMatch(
        /WHERE\s+shop_id\s*=\s*\(SELECT\s+id\s+FROM\s+shops\s+WHERE\s+shop_domain\s*=\s*\$1\)/i,
      );
    });

    it("defaults all toggles to TRUE when app_settings has no row for the shop", async() => {
      mockQuery
        .mockResolvedValueOnce([
          {
            merchant_email: null,
            merchant_phone: null,
            merchant_name: null,
          },
        ])
        .mockResolvedValueOnce([]); // no app_settings row

      const result = await service.getMerchantSettings(SHOP);

      expect(result).toEqual({
        merchantEmail: null,
        merchantPhone: null,
        merchantName: null,
        warehouseDelaysEnabled: true,
        carrierDelaysEnabled: true,
        transitDelaysEnabled: true,
      });
    });

    it("throws ShopNotFoundError when the shops row is missing", async() => {
      mockQuery.mockResolvedValueOnce([]);
      await expect(service.getMerchantSettings(SHOP)).rejects.toBeInstanceOf(
        ShopNotFoundError,
      );
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateMerchantSettings", () => {
    it("validates merchantEmail format and rejects with INVALID_EMAIL before touching the DB", async() => {
      await expect(
        service.updateMerchantSettings(SHOP, { merchantEmail: "not-an-email" }),
      ).rejects.toMatchObject({
        name: "MerchantApiValidationError",
        code: "INVALID_EMAIL",
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("validates merchantPhone digit count and rejects with INVALID_PHONE", async() => {
      await expect(
        service.updateMerchantSettings(SHOP, { merchantPhone: "555-12" }),
      ).rejects.toMatchObject({ code: "INVALID_PHONE" });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("throws ShopNotFoundError when shop missing (no UPDATEs attempted)", async() => {
      mockShopMissing();
      await expect(
        service.updateMerchantSettings(SHOP, {
          merchantEmail: "ok@ok.com",
        }),
      ).rejects.toBeInstanceOf(ShopNotFoundError);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("UPDATEs only the shops row when only merchant contact fields are provided, with every column in params (v1.19)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // shops UPDATE

      await service.updateMerchantSettings(SHOP, {
        merchantEmail: "merchant@test.com",
        merchantPhone: "+15551234567",
        merchantName: "Merchant One",
      });

      expect(mockQuery).toHaveBeenCalledTimes(2); // resolve + shops UPDATE
      const [updateSql, updateParams] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+shops/i);
      expect(updateSql).toMatch(
        /merchant_email\s*=\s*COALESCE\(\$1,\s*merchant_email\)/i,
      );
      expect(updateSql).toMatch(/merchant_phone\s*=\s*COALESCE\(\$2/i);
      expect(updateSql).toMatch(/merchant_name\s*=\s*COALESCE\(\$3/i);
      expect(updateSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
      expect(updateSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$4/i);
      // v1.19: every column in the params array
      expect(updateParams).toEqual([
        "merchant@test.com",
        "+15551234567",
        "Merchant One",
        SHOP,
      ]);
    });

    it("UPDATEs only app_settings when only delay-type toggles are provided, scoped to the resolved shop_id (v1.19)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // app_settings UPDATE

      await service.updateMerchantSettings(SHOP, {
        warehouseDelaysEnabled: false,
        carrierDelaysEnabled: true,
        transitDelaysEnabled: false,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+app_settings/i);
      expect(updateSql).toMatch(
        /warehouse_delays_enabled\s*=\s*COALESCE\(\$1,\s*warehouse_delays_enabled\)/i,
      );
      expect(updateSql).toMatch(/carrier_delays_enabled\s*=\s*COALESCE\(\$2/i);
      expect(updateSql).toMatch(/transit_delays_enabled\s*=\s*COALESCE\(\$3/i);
      expect(updateSql).toMatch(/WHERE\s+shop_id\s*=\s*\$4/i);
      // v1.19: every column in the params array, scoped by resolved shop_id
      expect(updateParams).toEqual([false, true, false, RESOLVED_SHOP_ID]);
    });

    it("UPDATEs both shops and app_settings when fields from both groups are provided", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // shops UPDATE
      mockQuery.mockResolvedValueOnce([]); // app_settings UPDATE

      await service.updateMerchantSettings(SHOP, {
        merchantEmail: "merchant@test.com",
        warehouseDelaysEnabled: false,
      });

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery.mock.calls[1][0]).toMatch(/UPDATE\s+shops/i);
      expect(mockQuery.mock.calls[2][0]).toMatch(/UPDATE\s+app_settings/i);
    });

    it("no-ops when neither field group is provided (resolves shop but skips UPDATEs)", async() => {
      mockShopResolved();
      await service.updateMerchantSettings(SHOP, {});
      // Only the resolve call should have happened
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("propagates a DB failure from the shops UPDATE", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("constraint violation"));
      await expect(
        service.updateMerchantSettings(SHOP, { merchantEmail: "ok@ok.com" }),
      ).rejects.toThrow("constraint violation");
    });
  });
});
