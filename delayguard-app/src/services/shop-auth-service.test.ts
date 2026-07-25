/**
 * ShopAuthService tests
 *
 * TDD-first per .claude/rules/tests.md.
 *
 * v1.19 field-population rule (.claude/rules/backend.md): every column
 * written must have an explicit assertion on the SQL parameter array,
 * not just a return-value or 200-response check.
 */

import { ShopAuthService, type ShopMetadata } from "./shop-auth-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("ShopAuthService", () => {
  let service: ShopAuthService;

  beforeEach(() => {
    service = new ShopAuthService();
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([]);
  });

  describe("upsertShop", () => {
    const validInput = {
      shopDomain: "test-shop.myshopify.com",
      accessToken: "shpat_abc123",
      scope: "read_orders,write_orders,read_fulfillments",
    };

    it("issues an INSERT … ON CONFLICT upsert with every shop column populated", async() => {
      await service.upsertShop(validInput);

      expect(mockQuery).toHaveBeenCalled();
      const [shopSql, shopParams] = mockQuery.mock.calls[0];

      // SQL shape: upsert against shops with conflict on shop_domain
      expect(shopSql).toMatch(/INSERT\s+INTO\s+shops/i);
      expect(shopSql).toMatch(/shop_domain/);
      expect(shopSql).toMatch(/access_token/);
      expect(shopSql).toMatch(/scope/);
      expect(shopSql).toMatch(/ON\s+CONFLICT\s*\(\s*shop_domain\s*\)/i);
      expect(shopSql).toMatch(/access_token\s*=\s*EXCLUDED\.access_token/i);
      expect(shopSql).toMatch(/scope\s*=\s*EXCLUDED\.scope/i);
      expect(shopSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);

      // v1.19 field-population: every persisted column must be in the params array
      expect(shopParams).toEqual([
        "test-shop.myshopify.com",
        "shpat_abc123",
        ["read_orders", "write_orders", "read_fulfillments"],
      ]);
      expect(Array.isArray(shopParams?.[2])).toBe(true);
    });

    it("rotates the access_token and refreshes scope when called for an existing shop", async() => {
      // First call: initial install
      await service.upsertShop(validInput);
      // Second call: re-auth with new token + expanded scope
      await service.upsertShop({
        shopDomain: "test-shop.myshopify.com",
        accessToken: "shpat_rotated_xyz",
        scope: "read_orders,write_orders,read_fulfillments,write_fulfillments",
      });

      // Both upserts hit the shops INSERT (call 0 and call 2; calls 1+3 are app_settings)
      const firstShopParams = mockQuery.mock.calls[0][1];
      const secondShopParams = mockQuery.mock.calls[2][1];

      expect(firstShopParams).toEqual([
        "test-shop.myshopify.com",
        "shpat_abc123",
        ["read_orders", "write_orders", "read_fulfillments"],
      ]);
      expect(secondShopParams).toEqual([
        "test-shop.myshopify.com",
        "shpat_rotated_xyz",
        [
          "read_orders",
          "write_orders",
          "read_fulfillments",
          "write_fulfillments",
        ],
      ]);
    });

    it("creates default app_settings for the shop with every column explicitly defaulted", async() => {
      await service.upsertShop(validInput);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const [settingsSql, settingsParams] = mockQuery.mock.calls[1];

      // SQL shape: derive shop_id from the just-upserted shop, idempotent on shop_id
      expect(settingsSql).toMatch(/INSERT\s+INTO\s+app_settings/i);
      expect(settingsSql).toMatch(/shop_id/);
      expect(settingsSql).toMatch(/delay_threshold_days/);
      expect(settingsSql).toMatch(/email_enabled/);
      expect(settingsSql).toMatch(/sms_enabled/);
      expect(settingsSql).toMatch(/notification_template/);
      expect(settingsSql).toMatch(/SELECT\s+id,\s*2,\s*true,\s*false,\s*'default'/i);
      expect(settingsSql).toMatch(/FROM\s+shops\s+WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(settingsSql).toMatch(/ON\s+CONFLICT\s*\(\s*shop_id\s*\)\s*DO\s+NOTHING/i);

      expect(settingsParams).toEqual(["test-shop.myshopify.com"]);
    });

    it("trims whitespace and drops empty entries when splitting the comma-separated scope", async() => {
      await service.upsertShop({
        shopDomain: "edge-shop.myshopify.com",
        accessToken: "shpat_edge",
        scope: "  read_orders ,, write_orders  ,  ",
      });

      const shopParams = mockQuery.mock.calls[0][1];
      expect(shopParams?.[2]).toEqual(["read_orders", "write_orders"]);
    });

    it("handles a single-scope token (no comma) by storing a one-element array", async() => {
      await service.upsertShop({
        shopDomain: "minimal-shop.myshopify.com",
        accessToken: "shpat_minimal",
        scope: "read_orders",
      });

      const shopParams = mockQuery.mock.calls[0][1];
      expect(shopParams?.[2]).toEqual(["read_orders"]);
    });

    it("propagates a database failure from the shop upsert and does not run the app_settings insert", async() => {
      mockQuery.mockReset();
      mockQuery.mockRejectedValueOnce(new Error("connection refused"));

      await expect(service.upsertShop(validInput)).rejects.toThrow(
        "connection refused",
      );
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it("propagates a database failure from the app_settings insert", async() => {
      mockQuery.mockReset();
      mockQuery
        .mockResolvedValueOnce([]) // shops upsert ok
        .mockRejectedValueOnce(new Error("FK constraint")); // app_settings fails

      await expect(service.upsertShop(validInput)).rejects.toThrow(
        "FK constraint",
      );
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("exchangeCodeForToken", () => {
    let mockFetch: jest.Mock;

    beforeEach(() => {
      mockFetch = jest.fn();
      global.fetch = mockFetch as unknown as typeof fetch;
    });

    it("POSTs the code with client credentials to Shopify's access_token endpoint", async() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async() => ({
          access_token: "shpat_new_token",
          scope: "read_orders,read_customers",
        }),
      });

      const result = await service.exchangeCodeForToken(
        "test-shop.myshopify.com",
        "auth-code-123",
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "https://test-shop.myshopify.com/admin/oauth/access_token",
      );
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual({
        client_id: "test_api_key",
        client_secret: "test_api_secret",
        code: "auth-code-123",
      });

      expect(result).toEqual({
        accessToken: "shpat_new_token",
        scope: "read_orders,read_customers",
      });
    });

    it("throws on a non-OK response from Shopify", async() => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(
        service.exchangeCodeForToken("test-shop.myshopify.com", "bad-code"),
      ).rejects.toThrow(/token exchange failed/i);
      expect(logger.error).toHaveBeenCalled();
    });

    it("throws when the response body lacks an access_token", async() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async() => ({ scope: "read_orders" }),
      });

      await expect(
        service.exchangeCodeForToken("test-shop.myshopify.com", "code"),
      ).rejects.toThrow(/token exchange/i);
    });
  });

  describe("loadShopByDomain", () => {
    it("returns a typed ShopMetadata record (camelCase) when the shop exists", async() => {
      const created = new Date("2024-01-15T10:00:00Z");
      const updated = new Date("2024-06-01T12:30:00Z");
      mockQuery.mockResolvedValueOnce([
        {
          shop_domain: "found-shop.myshopify.com",
          created_at: created,
          updated_at: updated,
        },
      ]);

      const result = await service.loadShopByDomain("found-shop.myshopify.com");

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+shop_domain,\s*created_at,\s*updated_at/i);
      expect(sql).toMatch(/FROM\s+shops/i);
      expect(sql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
      expect(params).toEqual(["found-shop.myshopify.com"]);

      // Boundary-typed contract: camelCase, no snake_case leak
      const expected: ShopMetadata = {
        shopDomain: "found-shop.myshopify.com",
        createdAt: created,
        updatedAt: updated,
      };
      expect(result).toEqual(expected);
      expect(result).not.toHaveProperty("shop_domain");
      expect(result).not.toHaveProperty("created_at");
      expect(result).not.toHaveProperty("updated_at");
      expect(result).not.toHaveProperty("access_token");
    });

    it("returns null when no row matches the shop domain", async() => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.loadShopByDomain(
        "missing-shop.myshopify.com",
      );

      expect(result).toBeNull();
    });

    it("propagates a database failure cleanly to the caller", async() => {
      mockQuery.mockRejectedValueOnce(new Error("pool exhausted"));

      await expect(
        service.loadShopByDomain("broken-shop.myshopify.com"),
      ).rejects.toThrow("pool exhausted");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
