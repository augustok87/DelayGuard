/**
 * OrderUpsertService tests
 *
 * TDD-first per .claude/rules/tests.md.
 *
 * Coverage strategy per Wave 2.2 spec:
 *   - happy path with v1.19 every-column param-array assertions on each
 *     UPDATE/INSERT (.claude/rules/backend.md field-population rule)
 *   - silent-skip on shop-not-found (NO throw, NO downstream DB calls,
 *     route stays 200) — distinct from the api.ts ShopNotFoundError→404
 *     contract because Shopify retries on non-2xx
 *   - multi-tenant guard (assert WHERE filter scopes by resolved shop_id)
 *   - DB-failure propagation
 */
import { OrderUpsertService } from "./order-upsert-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;

const SHOP = "test-shop.myshopify.com";
const SHOP_ID = "shop-42";
const ACCESS_TOKEN = "shpat_xyz";
const ORDER_ID = "order-77";

function mockShopResolved(
  id: string = SHOP_ID,
  accessToken: string = ACCESS_TOKEN,
): void {
  mockQuery.mockResolvedValueOnce([{ id, access_token: accessToken }]);
}

function mockShopResolvedNoToken(id: string = SHOP_ID): void {
  // For markOrderAsPaid / findOrderId, only `id` is selected
  mockQuery.mockResolvedValueOnce([{ id }]);
}

function mockShopMissing(): void {
  mockQuery.mockResolvedValueOnce([]);
}

const baseOrderPayload = {
  id: 1001,
  name: "#1001",
  customer: {
    id: 5550001,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: "+15551234567",
  },
  fulfillment_status: "fulfilled",
  total_price: "199.99",
};

describe("OrderUpsertService", () => {
  let service: OrderUpsertService;

  beforeEach(() => {
    service = new OrderUpsertService();
    // mockReset (not just clearAllMocks) so queued mockResolvedValueOnce
    // entries from earlier tests don't bleed across — same pattern Wave 2.1
    // adopted after the api-routes test bleed surfaced.
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
  });

  describe("upsertOrderFromWebhook", () => {
    it("resolves shop with shop_domain as the sole param, selecting id + access_token", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]); // UPSERT returns nothing
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]); // re-read orderId

      await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      const [resolveSql, resolveParams] = mockQuery.mock.calls[0];
      expect(resolveSql).toMatch(/SELECT\s+id,\s*access_token\s+FROM\s+shops/i);
      expect(resolveSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(resolveParams).toEqual([SHOP]);
    });

    it("silent-skips when the shop is not found (returns null, no downstream DB, no throw)", async() => {
      mockShopMissing();

      const result = await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        expect.objectContaining({ shopDomain: SHOP }),
      );
    });

    it("issues the orders UPSERT with every column populated (v1.19 field-population)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      const [upsertSql, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertSql).toMatch(/INSERT\s+INTO\s+orders/i);
      expect(upsertSql).toMatch(
        /ON\s+CONFLICT\s*\(\s*shop_id\s*,\s*shopify_order_id\s*\)/i,
      );
      expect(upsertSql).toMatch(/order_number\s*=\s*EXCLUDED\.order_number/i);
      expect(upsertSql).toMatch(/customer_name\s*=\s*EXCLUDED\.customer_name/i);
      expect(upsertSql).toMatch(/customer_email\s*=\s*EXCLUDED\.customer_email/i);
      expect(upsertSql).toMatch(/customer_phone\s*=\s*EXCLUDED\.customer_phone/i);
      expect(upsertSql).toMatch(
        /shopify_customer_id\s*=\s*EXCLUDED\.shopify_customer_id/i,
      );
      expect(upsertSql).toMatch(/status\s*=\s*EXCLUDED\.status/i);
      expect(upsertSql).toMatch(/total_amount\s*=\s*EXCLUDED\.total_amount/i);
      expect(upsertSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);

      // v1.19: every persisted column appears in the params array
      expect(upsertParams).toEqual([
        SHOP_ID,
        "1001", // shopify_order_id as string
        "#1001", // order_number
        "Ada Lovelace", // customer_name
        "ada@example.com", // customer_email
        "+15551234567", // customer_phone
        "5550001", // shopify_customer_id as string (Phase 2.1.a)
        "fulfilled", // status
        199.99, // total_amount (Phase 2.1.b) — parsed from webhook string total_price
      ]);
    });

    it("composes customer_name from first + last when both present", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[3]).toBe("Ada Lovelace");
    });

    it("falls back to first_name when last_name is missing", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        customer: { first_name: "Ada" },
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[3]).toBe("Ada");
    });

    it("falls back to 'Unknown' when the customer block is absent (guest checkout)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        customer: undefined,
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[3]).toBe("Unknown");
      expect(upsertParams?.[4]).toBeUndefined();
      expect(upsertParams?.[5]).toBeUndefined();
      // Phase 2.1.a: shopify_customer_id is null for guest checkouts —
      // CustomerSyncService skips guests on this null signal.
      expect(upsertParams?.[6]).toBeNull();
    });

    it("persists shopify_customer_id as a string when present (Phase 2.1.a guest signal)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[6]).toBe("5550001");
    });

    it("persists shopify_customer_id as null when customer.id is missing but customer block exists", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        customer: {
          first_name: "Anonymous",
          email: "anon@example.com",
        },
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[6]).toBeNull();
    });

    it("captures webhook.total_price as a parsed number on total_amount (Phase 2.1.b)", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        total_price: "459.50",
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[8]).toBe(459.5);
    });

    it("persists total_amount as null when total_price is missing", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        total_price: undefined,
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[8]).toBeNull();
    });

    it("defaults status to 'unfulfilled' when fulfillment_status is missing", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      await service.upsertOrderFromWebhook(SHOP, {
        ...baseOrderPayload,
        fulfillment_status: undefined,
      });

      const [, upsertParams] = mockQuery.mock.calls[1];
      expect(upsertParams?.[7]).toBe("unfulfilled");
    });

    it("re-reads the persisted orderId with the multi-tenant guard scoping on shop_id", async() => {
      mockShopResolved();
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      const result = await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

      const [reSelectSql, reSelectParams] = mockQuery.mock.calls[2];
      expect(reSelectSql).toMatch(/SELECT\s+id\s+FROM\s+orders/i);
      expect(reSelectSql).toMatch(/WHERE\s+shop_id\s*=\s*\$1/i);
      expect(reSelectSql).toMatch(/AND\s+shopify_order_id\s*=\s*\$2/i);
      // Guard scopes on resolved shop_id (NOT on raw shopDomain string)
      expect(reSelectParams).toEqual([SHOP_ID, "1001"]);
      expect(result).toEqual({ orderId: ORDER_ID, accessToken: ACCESS_TOKEN });
    });

    it("propagates a DB failure on the orders UPSERT (Shopify will retry)", async() => {
      mockShopResolved();
      mockQuery.mockRejectedValueOnce(new Error("upsert failed"));

      await expect(
        service.upsertOrderFromWebhook(SHOP, baseOrderPayload),
      ).rejects.toThrow("upsert failed");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("markOrderAsPaid", () => {
    it("silent-skips on shop-not-found (returns false, no UPDATE, no throw)", async() => {
      mockShopMissing();

      const result = await service.markOrderAsPaid(SHOP, baseOrderPayload);

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        expect.objectContaining({ shopDomain: SHOP }),
      );
    });

    it("issues the orders status UPDATE with every column populated (v1.19)", async() => {
      mockShopResolvedNoToken();
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.markOrderAsPaid(SHOP, baseOrderPayload);

      const [updateSql, updateParams] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+orders\s+SET/i);
      expect(updateSql).toMatch(/status\s*=\s*\$1/i);
      expect(updateSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
      expect(updateSql).toMatch(/WHERE\s+shop_id\s*=\s*\$2/i);
      expect(updateSql).toMatch(/AND\s+shopify_order_id\s*=\s*\$3/i);

      // v1.19 every-column assertion
      expect(updateParams).toEqual(["paid", SHOP_ID, "1001"]);
      expect(result).toBe(true);
    });

    it("multi-tenant guard scopes on resolved shop_id, not shop_domain string", async() => {
      mockShopResolvedNoToken("scoped-shop-99");
      mockQuery.mockResolvedValueOnce([]);

      await service.markOrderAsPaid(SHOP, baseOrderPayload);

      const [, updateParams] = mockQuery.mock.calls[1];
      expect(updateParams?.[1]).toBe("scoped-shop-99");
      expect(updateParams).not.toContain(SHOP);
    });

    it("propagates a DB failure on the UPDATE (Shopify will retry)", async() => {
      mockShopResolvedNoToken();
      mockQuery.mockRejectedValueOnce(new Error("update failed"));

      await expect(
        service.markOrderAsPaid(SHOP, baseOrderPayload),
      ).rejects.toThrow("update failed");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("findOrderId", () => {
    it("silent-skips on shop-not-found (returns null, no order lookup, no throw)", async() => {
      mockShopMissing();

      const result = await service.findOrderId(SHOP, "2002");

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        expect.objectContaining({ shopDomain: SHOP }),
      );
    });

    it("silent-skips on order-not-found (returns null, no throw)", async() => {
      mockShopResolvedNoToken();
      mockQuery.mockResolvedValueOnce([]); // order miss

      const result = await service.findOrderId(SHOP, "2002");

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        expect.objectContaining({ shopifyOrderId: "2002" }),
      );
    });

    it("returns the orderId with the WHERE filter scoping on resolved shop_id", async() => {
      mockShopResolvedNoToken();
      mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

      const result = await service.findOrderId(SHOP, "2002");

      const [orderSql, orderParams] = mockQuery.mock.calls[1];
      expect(orderSql).toMatch(/SELECT\s+id\s+FROM\s+orders/i);
      expect(orderSql).toMatch(/WHERE\s+shop_id\s*=\s*\$1/i);
      expect(orderSql).toMatch(/AND\s+shopify_order_id\s*=\s*\$2/i);
      expect(orderParams).toEqual([SHOP_ID, "2002"]);
      expect(result).toBe(ORDER_ID);
    });

    it("propagates a DB failure on the order lookup", async() => {
      mockShopResolvedNoToken();
      mockQuery.mockRejectedValueOnce(new Error("select failed"));

      await expect(service.findOrderId(SHOP, "2002")).rejects.toThrow(
        "select failed",
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
