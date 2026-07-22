/**
 * CustomerSyncService tests — Phase 2.1.a.
 *
 * TDD-first per .claude/rules/tests.md. Covers the ingestion path that
 * runs from the BullMQ customer-sync processor for each fulfilled-order
 * webhook:
 *
 *   shopDomain + shopifyOrderId
 *     → resolve shop (id + access_token)
 *     → look up orders.shopify_customer_id
 *     → fetch customer from Shopify (fetchCustomerById)
 *     → deriveSegment
 *     → UPSERT customer_intelligence
 *
 * Silent-skip semantics match the webhook-side services (Wave 2.2):
 *   - missing shop, missing order, guest (shopify_customer_id IS NULL),
 *     and customer-404-from-Shopify all return without throwing,
 *     because retries here are pointless and the BullMQ job would
 *     thrash on missing data.
 *   - DB failures and Shopify 401/5xx DO propagate so BullMQ's
 *     attempts:3 retry runs.
 *
 * v1.19 every-column param-array assertion on the UPSERT
 * (.claude/rules/backend.md field-population rule).
 */
import { CustomerSyncService } from "./customer-sync-service";
import { query } from "../database/connection";
import { fetchCustomerById } from "./shopify-service";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("./shopify-service");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockFetchCustomerById = fetchCustomerById as jest.MockedFunction<
  typeof fetchCustomerById
>;

const SHOP = "test-shop.myshopify.com";
const SHOP_ID = "shop-42";
const ACCESS_TOKEN = "shpat_xyz";
const SHOPIFY_ORDER_ID = "1001";
const SHOPIFY_CUSTOMER_ID = "gid://shopify/Customer/5550001";

function mockShopResolved(): void {
  mockQuery.mockResolvedValueOnce([
    { id: SHOP_ID, access_token: ACCESS_TOKEN },
  ]);
}

function mockOrderHasCustomer(
  shopifyCustomerId: string | null = SHOPIFY_CUSTOMER_ID,
): void {
  mockQuery.mockResolvedValueOnce([
    { shopify_customer_id: shopifyCustomerId },
  ]);
}

function buildCustomerData(overrides = {}): {
  shopifyCustomerId: string;
  email: string | null;
  numberOfOrders: number;
  amountSpent: number;
  customerSince: Date;
  lastOrderAt: Date | null;
  emailMarketingSubscribed: boolean;
} {
  return {
    shopifyCustomerId: SHOPIFY_CUSTOMER_ID,
    email: "ada@example.com",
    numberOfOrders: 7,
    amountSpent: 1250.5,
    customerSince: new Date("2024-01-15T10:30:00.000Z"),
    lastOrderAt: new Date("2026-05-10T08:00:00.000Z"),
    emailMarketingSubscribed: true,
    ...overrides,
  };
}

describe("CustomerSyncService.syncCustomerForOrder", () => {
  let service: CustomerSyncService;

  beforeEach(() => {
    service = new CustomerSyncService();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
    mockFetchCustomerById.mockReset();
  });

  it("silent-skips when the shop is not found (returns void, no Shopify call, no UPSERT)", async() => {
    mockQuery.mockResolvedValueOnce([]); // shop miss

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockFetchCustomerById).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
      expect.objectContaining({ shopDomain: SHOP }),
    );
  });

  it("silent-skips when the order is not found", async() => {
    mockShopResolved();
    mockQuery.mockResolvedValueOnce([]); // order miss

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchCustomerById).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
      expect.objectContaining({ shopifyOrderId: SHOPIFY_ORDER_ID }),
    );
  });

  it("silent-skips guest checkouts (orders.shopify_customer_id IS NULL)", async() => {
    mockShopResolved();
    mockOrderHasCustomer(null);

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchCustomerById).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("guest"),
      expect.objectContaining({ shopifyOrderId: SHOPIFY_ORDER_ID }),
    );
  });

  it("silent-skips when Shopify reports the customer does not exist (fetchCustomerById returns null)", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(null);

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    expect(mockFetchCustomerById).toHaveBeenCalledTimes(1);
    // No UPSERT — only the 2 reads (shop + order)
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("looks up the shop with the canonical SELECT id, access_token shape", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(buildCustomerData());
    mockQuery.mockResolvedValueOnce([]); // UPSERT

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    const [resolveSql, resolveParams] = mockQuery.mock.calls[0];
    expect(resolveSql).toMatch(/SELECT\s+id,\s*access_token\s+FROM\s+shops/i);
    expect(resolveSql).toMatch(/WHERE\s+shop_domain\s*=\s*\$1/i);
    expect(resolveParams).toEqual([SHOP]);
  });

  it("looks up the order with the multi-tenant guard scoping on resolved shop_id", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(buildCustomerData());
    mockQuery.mockResolvedValueOnce([]);

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    const [orderSql, orderParams] = mockQuery.mock.calls[1];
    expect(orderSql).toMatch(/SELECT\s+shopify_customer_id\s+FROM\s+orders/i);
    expect(orderSql).toMatch(/WHERE\s+shop_id\s*=\s*\$1/i);
    expect(orderSql).toMatch(/AND\s+shopify_order_id\s*=\s*\$2/i);
    expect(orderParams).toEqual([SHOP_ID, SHOPIFY_ORDER_ID]);
  });

  it("calls fetchCustomerById with the shopDomain + accessToken + shopify_customer_id from the order row", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(buildCustomerData());
    mockQuery.mockResolvedValueOnce([]);

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    expect(mockFetchCustomerById).toHaveBeenCalledWith(
      SHOP,
      ACCESS_TOKEN,
      SHOPIFY_CUSTOMER_ID,
    );
  });

  it("issues the customer_intelligence UPSERT with v1.19 every-column param assertion", async() => {
    // Pin "now" so daysSinceLastOrder is deterministic
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T08:00:00.000Z"));

    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(buildCustomerData());
    mockQuery.mockResolvedValueOnce([]); // UPSERT

    try {
      await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

      const [upsertSql, upsertParams] = mockQuery.mock.calls[2];
      expect(upsertSql).toMatch(/INSERT\s+INTO\s+customer_intelligence/i);
      expect(upsertSql).toMatch(
        /ON\s+CONFLICT\s*\(\s*shop_id\s*,\s*shopify_customer_id\s*\)/i,
      );
      expect(upsertSql).toMatch(
        /orders_count\s*=\s*EXCLUDED\.orders_count/i,
      );
      expect(upsertSql).toMatch(/total_spent\s*=\s*EXCLUDED\.total_spent/i);
      expect(upsertSql).toMatch(
        /customer_since\s*=\s*EXCLUDED\.customer_since/i,
      );
      expect(upsertSql).toMatch(/last_order_at\s*=\s*EXCLUDED\.last_order_at/i);
      expect(upsertSql).toMatch(/segment\s*=\s*EXCLUDED\.segment/i);
      expect(upsertSql).toMatch(
        /accepts_marketing\s*=\s*EXCLUDED\.accepts_marketing/i,
      );
      expect(upsertSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);

      // v1.19: every persisted column appears in the params array.
      // 7 orders + $1250.50 LTV = VIP per deriveSegment precedence rule #1.
      expect(upsertParams).toEqual([
        SHOP_ID,
        SHOPIFY_CUSTOMER_ID,
        7,
        1250.5,
        new Date("2024-01-15T10:30:00.000Z"),
        new Date("2026-05-10T08:00:00.000Z"),
        "VIP",
        true,
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("derives At-Risk for a 2+-order customer past the 90-day lapse cutoff", async() => {
    // Now = 2026-05-15, lastOrderAt = 100 days earlier → past 90-day cutoff
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T00:00:00.000Z"));
    const lastOrderAt = new Date("2026-02-04T00:00:00.000Z"); // 100 days ago

    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(
      buildCustomerData({
        numberOfOrders: 3,
        amountSpent: 500,
        lastOrderAt,
      }),
    );
    mockQuery.mockResolvedValueOnce([]);

    try {
      await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);
      const [, upsertParams] = mockQuery.mock.calls[2];
      expect(upsertParams?.[6]).toBe("At-Risk");
    } finally {
      jest.useRealTimers();
    }
  });

  it("derives New (large daysSinceLastOrder default) when the customer has no lastOrderAt yet", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(
      buildCustomerData({
        numberOfOrders: 1,
        amountSpent: 30,
        lastOrderAt: null,
        emailMarketingSubscribed: true,
      }),
    );
    mockQuery.mockResolvedValueOnce([]);

    await service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID);

    const [, upsertParams] = mockQuery.mock.calls[2];
    expect(upsertParams?.[5]).toBeNull(); // last_order_at column
    expect(upsertParams?.[6]).toBe("New");
  });

  it("propagates DB failures on the customer_intelligence UPSERT (BullMQ retries up to attempts:3)", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockResolvedValueOnce(buildCustomerData());
    mockQuery.mockRejectedValueOnce(new Error("upsert failed"));

    await expect(
      service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID),
    ).rejects.toThrow("upsert failed");
    expect(logger.error).toHaveBeenCalled();
  });

  it("propagates Shopify failures (401/5xx) so BullMQ retries take over", async() => {
    mockShopResolved();
    mockOrderHasCustomer();
    mockFetchCustomerById.mockRejectedValueOnce(
      new Error("Unauthorized: Invalid access token for test-shop"),
    );

    await expect(
      service.syncCustomerForOrder(SHOP, SHOPIFY_ORDER_ID),
    ).rejects.toThrow(/Unauthorized/);
    expect(logger.error).toHaveBeenCalled();
  });
});
