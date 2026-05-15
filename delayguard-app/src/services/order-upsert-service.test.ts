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
  // Phase 2.1.c (Financial Breakdown): 3 flat-string fields + 1 nested money-set.
  // Shopify webhook payload always sends shipping as `total_shipping_price_set`;
  // the flat top-level `total_shipping_price` does not exist on order webhooks.
  subtotal_price: "180.00",
  total_tax: "15.50",
  total_discounts: "5.00",
  total_shipping_price_set: {
    shop_money: { amount: "9.49", currency_code: "USD" },
    presentment_money: { amount: "9.49", currency_code: "USD" },
  },
  // Phase 2.1.d (Shipping Address): 6-field subset of Shopify's nested
  // `shipping_address` block — minimum useful set for the §2.1.f alert-card
  // narrative ("delayed package to Toronto, ON"). Drops lat/long (no UI use),
  // shipping name (redundant with orders.customer_name), province/country
  // long-form names (codes are display-sufficient + sortable), company (rare
  // on consumer orders), address2 (deferred until UI plans full mailing-format
  // address). `phone` here is the RECIPIENT's delivery contact — different
  // person than customer.phone on Gift-Buyer orders; stored independently.
  shipping_address: {
    address1: "123 Main St",
    city: "Toronto",
    province_code: "ON",
    country_code: "CA",
    zip: "M5V 3A8",
    phone: "+14165551212",
  },
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
      // Phase 2.1.c: 4 financial-breakdown columns also EXCLUDED-mirrored on UPSERT
      expect(upsertSql).toMatch(/subtotal_price\s*=\s*EXCLUDED\.subtotal_price/i);
      expect(upsertSql).toMatch(/total_tax\s*=\s*EXCLUDED\.total_tax/i);
      expect(upsertSql).toMatch(
        /total_discounts\s*=\s*EXCLUDED\.total_discounts/i,
      );
      expect(upsertSql).toMatch(
        /total_shipping_price\s*=\s*EXCLUDED\.total_shipping_price/i,
      );
      // Phase 2.1.d: 6 shipping_address columns also EXCLUDED-mirrored on UPSERT
      expect(upsertSql).toMatch(
        /shipping_address1\s*=\s*EXCLUDED\.shipping_address1/i,
      );
      expect(upsertSql).toMatch(/shipping_city\s*=\s*EXCLUDED\.shipping_city/i);
      expect(upsertSql).toMatch(
        /shipping_province_code\s*=\s*EXCLUDED\.shipping_province_code/i,
      );
      expect(upsertSql).toMatch(
        /shipping_country_code\s*=\s*EXCLUDED\.shipping_country_code/i,
      );
      expect(upsertSql).toMatch(/shipping_zip\s*=\s*EXCLUDED\.shipping_zip/i);
      expect(upsertSql).toMatch(/shipping_phone\s*=\s*EXCLUDED\.shipping_phone/i);
      expect(upsertSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);

      // v1.19: every persisted column appears in the params array
      expect(upsertParams).toEqual([
        SHOP_ID,
        "1001", // shopify_order_id as string
        "#1001", // order_number
        "Ada Lovelace", // customer_name
        "ada@example.com", // customer_email
        "+15551234567", // customer_phone (BUYER — account contact for our SendGrid/Twilio notifications)
        "5550001", // shopify_customer_id as string (Phase 2.1.a)
        "fulfilled", // status
        199.99, // total_amount (Phase 2.1.b) — parsed from webhook string total_price
        180, // subtotal_price (Phase 2.1.c) — parsed flat string
        15.5, // total_tax (Phase 2.1.c) — parsed flat string
        5, // total_discounts (Phase 2.1.c) — parsed flat string
        9.49, // total_shipping_price (Phase 2.1.c) — from total_shipping_price_set.shop_money.amount
        "123 Main St", // shipping_address1 (Phase 2.1.d) — from shipping_address.address1
        "Toronto", // shipping_city (Phase 2.1.d)
        "ON", // shipping_province_code (Phase 2.1.d) — ISO 3166-2 subdivision code
        "CA", // shipping_country_code (Phase 2.1.d) — ISO 3166-1 alpha-2
        "M5V 3A8", // shipping_zip (Phase 2.1.d)
        "+14165551212", // shipping_phone (Phase 2.1.d) — RECIPIENT's delivery contact, distinct from customer_phone
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

    // Phase 2.1.c — Financial Breakdown (4 order-level columns).
    //
    // Three of four target fields are flat strings on the Shopify Order
    // webhook payload (`subtotal_price` / `total_tax` / `total_discounts`).
    // The fourth — shipping — is NOT a flat field: Shopify exposes it as
    // `total_shipping_price_set.shop_money.amount` (nested money-set,
    // shop_money is the merchant's settlement currency). Each axis needs
    // a present / missing / non-finite case; shipping also needs a
    // missing-money-set case and a missing-shop_money case.
    describe("Phase 2.1.c — financial breakdown capture", () => {
      it("captures subtotal_price as a parsed number when present", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          subtotal_price: "180.00",
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[9]).toBe(180);
      });

      it("persists subtotal_price as null when missing", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          subtotal_price: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[9]).toBeNull();
      });

      it("captures total_tax as a parsed number when present", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_tax: "15.50",
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[10]).toBe(15.5);
      });

      it("persists total_tax as null when missing", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_tax: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[10]).toBeNull();
      });

      it("captures total_discounts as a parsed number when present (including 0.00)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_discounts: "0.00",
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        // Discounts of 0 must persist as 0, NOT null — narrative is "no
        // discount applied" rather than "discount unknown". Verifies the
        // parseTotalPrice 0-vs-null distinction holds.
        expect(upsertParams?.[11]).toBe(0);
      });

      it("persists total_discounts as null when missing", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_discounts: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[11]).toBeNull();
      });

      it("persists any of the 3 flat financial fields as null when non-finite", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          subtotal_price: "not-a-number",
          total_tax: "NaN",
          total_discounts: "",
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[9]).toBeNull();
        expect(upsertParams?.[10]).toBeNull();
        expect(upsertParams?.[11]).toBeNull();
      });

      it("captures total_shipping_price from total_shipping_price_set.shop_money.amount", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_shipping_price_set: {
            shop_money: { amount: "12.34", currency_code: "USD" },
            presentment_money: { amount: "99.99", currency_code: "EUR" },
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        // Persists shop_money (merchant settlement currency), NOT presentment_money.
        // Consistent with 2.1.b precedent — flat `total_price` is shop currency.
        expect(upsertParams?.[12]).toBe(12.34);
      });

      it("persists total_shipping_price as null when the money-set is missing", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_shipping_price_set: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[12]).toBeNull();
      });

      it("persists total_shipping_price as null when shop_money is missing from the money-set", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_shipping_price_set: {
            // Only presentment_money — shop_money absent (degenerate payload
            // shape; defensive narrowing required since money-set is
            // user-controlled webhook input).
            presentment_money: { amount: "9.49", currency_code: "USD" },
          } as unknown as typeof baseOrderPayload.total_shipping_price_set,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[12]).toBeNull();
      });

      it("persists total_shipping_price as null when shop_money.amount is non-finite", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          total_shipping_price_set: {
            shop_money: { amount: "garbage", currency_code: "USD" },
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[12]).toBeNull();
      });

      it("captures all 4 financial fields as null when none are populated (digital-good edge case)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          subtotal_price: undefined,
          total_tax: undefined,
          total_discounts: undefined,
          total_shipping_price_set: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        // Digital-good / free-order shape: total_amount may also be null,
        // but the financial breakdown columns must all be null (not 0) so
        // the UI can distinguish "no data captured" from "captured as zero".
        expect(upsertParams?.[9]).toBeNull();
        expect(upsertParams?.[10]).toBeNull();
        expect(upsertParams?.[11]).toBeNull();
        expect(upsertParams?.[12]).toBeNull();
      });
    });

    // Phase 2.1.d — Shipping Address (6-field subset).
    //
    // Shopify Order webhook sends `shipping_address` as a nested object with
    // ~13 fields; we capture only the 6 that the §2.1.f UI narrative needs:
    // address1 / city / province_code / country_code / zip / phone. Each
    // field is independently optional on the wire (Shopify sometimes sends
    // "" for unset fields, sometimes omits the key entirely), and the entire
    // block can be absent for digital / pickup / non-shippable orders.
    // `parseAddressField` normalizes both shapes to null at write-time so
    // the UI can rely on a single "missing" semantic.
    describe("Phase 2.1.d — shipping address capture", () => {
      it("captures shipping_address1 from shipping_address.address1", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBe("123 Main St");
      });

      it("captures shipping_city from shipping_address.city", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[14]).toBe("Toronto");
      });

      it("captures shipping_province_code from shipping_address.province_code (ISO 3166-2 subdivision)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        // Codes (ON, CA, NY) are display-sufficient + sortable. Long-form
        // names (Ontario, California) are intentionally NOT captured —
        // round-trip via static map at render time.
        expect(upsertParams?.[15]).toBe("ON");
      });

      it("captures shipping_country_code from shipping_address.country_code (ISO 3166-1 alpha-2)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[16]).toBe("CA");
      });

      it("captures shipping_zip from shipping_address.zip (international format preserved)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        // "M5V 3A8" is a Canadian postal code — the embedded space and
        // mixed alphanumeric are part of the canonical format. No
        // normalization applied (Shopify already canonicalizes on entry).
        expect(upsertParams?.[17]).toBe("M5V 3A8");
      });

      it("captures shipping_phone from shipping_address.phone (recipient delivery contact)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, baseOrderPayload);

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[18]).toBe("+14165551212");
      });

      it("persists all 6 shipping fields as null when shipping_address block is missing (digital/pickup order)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: undefined,
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBeNull();
        expect(upsertParams?.[14]).toBeNull();
        expect(upsertParams?.[15]).toBeNull();
        expect(upsertParams?.[16]).toBeNull();
        expect(upsertParams?.[17]).toBeNull();
        expect(upsertParams?.[18]).toBeNull();
      });

      it("persists individual fields as null when omitted from the address block", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: {
            address1: "456 Rural Route",
            city: "Bozeman",
            // province_code, country_code, zip, phone all absent
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBe("456 Rural Route");
        expect(upsertParams?.[14]).toBe("Bozeman");
        expect(upsertParams?.[15]).toBeNull();
        expect(upsertParams?.[16]).toBeNull();
        expect(upsertParams?.[17]).toBeNull();
        expect(upsertParams?.[18]).toBeNull();
      });

      it("normalizes empty-string fields to null (Shopify '' passthrough)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: {
            address1: "",
            city: "",
            province_code: "",
            country_code: "",
            zip: "",
            phone: "",
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        // Shopify sometimes serializes unset fields as "" rather than
        // omitting the key. The UI's "missing data" path must match a
        // single null semantic — collapsing "" → null at write time keeps
        // the read path simple.
        expect(upsertParams?.[13]).toBeNull();
        expect(upsertParams?.[14]).toBeNull();
        expect(upsertParams?.[15]).toBeNull();
        expect(upsertParams?.[16]).toBeNull();
        expect(upsertParams?.[17]).toBeNull();
        expect(upsertParams?.[18]).toBeNull();
      });

      it("normalizes whitespace-only fields to null", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: {
            address1: "   ",
            city: "\t\n",
            province_code: " ",
            country_code: "",
            zip: "  ",
            phone: " ",
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBeNull();
        expect(upsertParams?.[14]).toBeNull();
        expect(upsertParams?.[15]).toBeNull();
        expect(upsertParams?.[16]).toBeNull();
        expect(upsertParams?.[17]).toBeNull();
        expect(upsertParams?.[18]).toBeNull();
      });

      it("defensively narrows non-string field values to null (malformed payload)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: {
            // Webhook payloads are user-controlled — a malformed publisher
            // could send numerics or nulls in string slots. Each field
            // narrows independently via parseAddressField.
            address1: 12345 as unknown as string,
            city: null as unknown as string,
            province_code: undefined as unknown as string,
            country_code: { code: "CA" } as unknown as string,
            zip: ["M5V"] as unknown as string,
            phone: true as unknown as string,
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBeNull();
        expect(upsertParams?.[14]).toBeNull();
        expect(upsertParams?.[15]).toBeNull();
        expect(upsertParams?.[16]).toBeNull();
        expect(upsertParams?.[17]).toBeNull();
        expect(upsertParams?.[18]).toBeNull();
      });

      it("trims leading/trailing whitespace from captured values", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          shipping_address: {
            address1: "  789 Elm Ave  ",
            city: " Vancouver ",
            province_code: "BC",
            country_code: "CA",
            zip: " V6B 1A1 ",
            phone: "+16045551212",
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[13]).toBe("789 Elm Ave");
        expect(upsertParams?.[14]).toBe("Vancouver");
        expect(upsertParams?.[17]).toBe("V6B 1A1");
      });

      it("captures buyer's customer_phone and recipient's shipping_phone independently (Gift-Buyer scenario)", async() => {
        mockShopResolved();
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ id: ORDER_ID }]);

        await service.upsertOrderFromWebhook(SHOP, {
          ...baseOrderPayload,
          // Buyer (account holder) — orders.customer_phone routes our
          // SendGrid/Twilio notifications here.
          customer: {
            ...baseOrderPayload.customer,
            phone: "+15551234567",
          },
          // Recipient (delivery contact) — orders.shipping_phone is the
          // courier handoff. Distinct from buyer on Gift-Buyer orders
          // (segment recognized by Phase 2.1.a deriveSegment rules).
          shipping_address: {
            ...baseOrderPayload.shipping_address,
            phone: "+19998887777",
          },
        });

        const [, upsertParams] = mockQuery.mock.calls[1];
        expect(upsertParams?.[5]).toBe("+15551234567"); // customer_phone (buyer)
        expect(upsertParams?.[18]).toBe("+19998887777"); // shipping_phone (recipient)
      });
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
