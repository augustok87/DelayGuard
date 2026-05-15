/**
 * PriorityScoreService sibling test — Phase 2.1.b.
 *
 * Coverage strategy:
 *   - Lookup SQL shape: alert + order + LEFT JOIN customer_intelligence
 *     selects every column the pure-fn needs; alertId is the sole param.
 *   - Churn count SQL shape: COUNT(*) scoped to (o.shop_id,
 *     o.shopify_customer_id) and excludes the alert being scored.
 *   - Guest checkout shortcut: shopify_customer_id IS NULL → skip churn
 *     query (would always return 0 anyway; saves a roundtrip).
 *   - Q3 fallback path: missing customer_intelligence row → segment null
 *     → customerValue 20.
 *   - v1.19 UPDATE every-column param-array assertion.
 *   - Silent-skip on missing alert (no throw, no UPDATE, log line).
 *   - DB-failure propagation at each step.
 *
 * Mocks via the auto-applied __mocks__/pg.js + module-mocking query directly
 * (same pattern as customer-sync-service.test.ts and order-upsert-service.test.ts).
 */
import { PriorityScoreService } from "./priority-score-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;

const ALERT_ID = 4242;
const SHOP_ID = 7;
const SHOPIFY_CUSTOMER_ID = "555000111";

interface AlertLookupRow {
  delay_days: number;
  shop_id: number;
  shopify_customer_id: string | null;
  total_amount: string | null;
  segment: string | null;
}

function mockAlertLookup(overrides: Partial<AlertLookupRow> = {}): void {
  mockQuery.mockResolvedValueOnce([
    {
      delay_days: 7,
      shop_id: SHOP_ID,
      shopify_customer_id: SHOPIFY_CUSTOMER_ID,
      total_amount: "500.00",
      segment: "VIP",
      ...overrides,
    },
  ]);
}

function mockAlertMissing(): void {
  mockQuery.mockResolvedValueOnce([]);
}

function mockChurnCount(count: number): void {
  mockQuery.mockResolvedValueOnce([{ count: String(count) }]);
}

function mockUpdateOk(): void {
  mockQuery.mockResolvedValueOnce([]);
}

describe("PriorityScoreService.scoreAlert", () => {
  let service: PriorityScoreService;

  beforeEach(() => {
    service = new PriorityScoreService();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
  });

  describe("alert lookup", () => {
    it("queries delay_alerts + orders + LEFT JOIN customer_intelligence using alertId as sole param", async() => {
      mockAlertLookup();
      mockChurnCount(2);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      const [lookupSql, lookupParams] = mockQuery.mock.calls[0];
      expect(lookupSql).toMatch(/FROM\s+delay_alerts\s+da/i);
      expect(lookupSql).toMatch(/JOIN\s+orders\s+o\s+ON\s+o\.id\s*=\s*da\.order_id/i);
      // LEFT JOIN — missing customer_intelligence row must return NULL, not exclude alert
      expect(lookupSql).toMatch(/LEFT\s+JOIN\s+customer_intelligence\s+ci/i);
      // Every column the pure-fn input needs is selected
      expect(lookupSql).toMatch(/da\.delay_days/i);
      expect(lookupSql).toMatch(/o\.shop_id/i);
      expect(lookupSql).toMatch(/o\.shopify_customer_id/i);
      expect(lookupSql).toMatch(/o\.total_amount/i);
      expect(lookupSql).toMatch(/ci\.segment/i);
      expect(lookupSql).toMatch(/WHERE\s+da\.id\s*=\s*\$1/i);
      expect(lookupParams).toEqual([ALERT_ID]);
    });

    it("silent-skips when the alert is missing (no throw, no UPDATE, log line)", async() => {
      mockAlertMissing();

      await expect(service.scoreAlert(ALERT_ID)).resolves.toBeUndefined();

      // Exactly one DB call — the lookup. No churn count, no UPDATE.
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        "Alert not found, skipping priority scoring",
        { alertId: ALERT_ID },
      );
    });

    it("propagates DB failures from the lookup", async() => {
      mockQuery.mockRejectedValueOnce(new Error("conn refused"));

      await expect(service.scoreAlert(ALERT_ID)).rejects.toThrow("conn refused");
    });
  });

  describe("churn count", () => {
    it("scopes COUNT(*) to (o.shop_id, o.shopify_customer_id) and excludes the alert being scored", async() => {
      mockAlertLookup();
      mockChurnCount(2);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      const [churnSql, churnParams] = mockQuery.mock.calls[1];
      expect(churnSql).toMatch(/SELECT\s+COUNT\(\*\)/i);
      expect(churnSql).toMatch(/FROM\s+delay_alerts\s+da/i);
      expect(churnSql).toMatch(/JOIN\s+orders\s+o\s+ON\s+o\.id\s*=\s*da\.order_id/i);
      expect(churnSql).toMatch(/WHERE\s+o\.shop_id\s*=\s*\$1/i);
      expect(churnSql).toMatch(/AND\s+o\.shopify_customer_id\s*=\s*\$2/i);
      expect(churnSql).toMatch(/AND\s+da\.id\s*<>\s*\$3/i);
      expect(churnParams).toEqual([SHOP_ID, SHOPIFY_CUSTOMER_ID, ALERT_ID]);
    });

    it("skips churn query for guest checkouts (shopify_customer_id IS NULL)", async() => {
      mockAlertLookup({ shopify_customer_id: null, segment: null });
      // No churn count mock — we expect it to be skipped.
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      // Two DB calls: lookup + UPDATE. No churn count between them.
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const [updateSql] = mockQuery.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE\s+delay_alerts/i);
    });

    it("propagates DB failures from the churn count", async() => {
      mockAlertLookup();
      mockQuery.mockRejectedValueOnce(new Error("count failed"));

      await expect(service.scoreAlert(ALERT_ID)).rejects.toThrow("count failed");
    });
  });

  describe("UPDATE delay_alerts", () => {
    it("writes priority_score + priority_level with v1.19 every-column param assertion", async() => {
      // VIP(40) + $500(30) + 2 delays(20) + 7d(10) = 100 → Critical
      mockAlertLookup({
        delay_days: 7,
        total_amount: "500.00",
        segment: "VIP",
      });
      mockChurnCount(2);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      const [updateSql, updateParams] = mockQuery.mock.calls[2];
      expect(updateSql).toMatch(/UPDATE\s+delay_alerts/i);
      expect(updateSql).toMatch(/SET\s+priority_score\s*=\s*\$1/i);
      expect(updateSql).toMatch(/priority_level\s*=\s*\$2/i);
      expect(updateSql).toMatch(/WHERE\s+id\s*=\s*\$3/i);
      expect(updateParams).toEqual([100, "Critical", ALERT_ID]);
    });

    it("applies Q3 fallback (customerValue=20) when customer_intelligence is missing", async() => {
      // Non-guest customer whose customer-sync hasn't run yet → segment null
      // from LEFT JOIN. orderValue $200(20) + Q3(20) + 0 delays(5) + 1d(2) = 47 → Medium
      mockAlertLookup({
        delay_days: 1,
        total_amount: "200.00",
        segment: null,
      });
      mockChurnCount(0);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      const [, updateParams] = mockQuery.mock.calls[2];
      expect(updateParams).toEqual([47, "Medium", ALERT_ID]);
    });

    it("treats null total_amount as the lowest orderValue band", async() => {
      // Legacy alert OR webhook that omitted total_price.
      // null(5) + Repeat(25) + 0(5) + 1d(2) = 37 → Low
      mockAlertLookup({
        delay_days: 1,
        total_amount: null,
        segment: "Repeat",
      });
      mockChurnCount(0);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      const [, updateParams] = mockQuery.mock.calls[2];
      expect(updateParams).toEqual([37, "Low", ALERT_ID]);
    });

    it("propagates DB failures from the UPDATE", async() => {
      mockAlertLookup();
      mockChurnCount(0);
      mockQuery.mockRejectedValueOnce(new Error("update failed"));

      await expect(service.scoreAlert(ALERT_ID)).rejects.toThrow("update failed");
    });

    it("parses total_amount string from pg numeric correctly", async() => {
      // pg returns NUMERIC columns as strings — service must coerce to number
      // before passing to the pure-fn. $99.99 should land in the $50 band (10).
      mockAlertLookup({
        delay_days: 5,
        total_amount: "99.99",
        segment: "New",
      });
      mockChurnCount(0);
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      // New(30) + $99.99(10) + 0(5) + 5d(8) = 53 → Medium
      const [, updateParams] = mockQuery.mock.calls[2];
      expect(updateParams).toEqual([53, "Medium", ALERT_ID]);
    });
  });

  describe("guest-checkout end-to-end", () => {
    it("scores a $300 guest order with 3d delay: $300(25) + Q3(20) + 0(5) + 3d(5) = 55 Medium", async() => {
      mockAlertLookup({
        delay_days: 3,
        shopify_customer_id: null,
        total_amount: "300.00",
        segment: null,
      });
      // No churn mock — skipped for guest checkout
      mockUpdateOk();

      await service.scoreAlert(ALERT_ID);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const [, updateParams] = mockQuery.mock.calls[1];
      expect(updateParams).toEqual([55, "Medium", ALERT_ID]);
    });
  });
});
