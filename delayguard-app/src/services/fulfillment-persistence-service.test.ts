/**
 * FulfillmentPersistenceService tests
 *
 * TDD-first per .claude/rules/tests.md. Pure persistence — no ShipEngine.
 *
 * Coverage strategy per Wave 2.2 spec:
 *   - happy path with v1.19 every-column param-array assertion on the
 *     fulfillments UPSERT
 *   - DB-failure propagation
 *   - tracking_info field destructuring (number / company / url) for the
 *     three columns that come from it
 */
import { FulfillmentPersistenceService } from "./fulfillment-persistence-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";

jest.mock("../database/connection");
jest.mock("../utils/logger");

const mockQuery = query as jest.MockedFunction<typeof query>;

const ORDER_ID = 12345;

const baseFulfillment = {
  id: 5001,
  order_id: 1001,
  tracking_info: {
    number: "1Z999AA10123456784",
    company: "UPS",
    url: "https://wwwapps.ups.com/etracking/tracking.cgi?tracknum=1Z999AA10123456784",
  },
  status: "in_transit",
};

describe("FulfillmentPersistenceService", () => {
  let service: FulfillmentPersistenceService;

  beforeEach(() => {
    service = new FulfillmentPersistenceService();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
  });

  describe("upsertFulfillment", () => {
    it("issues a fulfillments UPSERT with the canonical ON CONFLICT clause", async() => {
      await service.upsertFulfillment(ORDER_ID, baseFulfillment);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [upsertSql] = mockQuery.mock.calls[0];

      expect(upsertSql).toMatch(/INSERT\s+INTO\s+fulfillments/i);
      expect(upsertSql).toMatch(
        /ON\s+CONFLICT\s*\(\s*order_id\s*,\s*shopify_fulfillment_id\s*\)/i,
      );
      expect(upsertSql).toMatch(
        /tracking_number\s*=\s*EXCLUDED\.tracking_number/i,
      );
      expect(upsertSql).toMatch(/carrier_code\s*=\s*EXCLUDED\.carrier_code/i);
      expect(upsertSql).toMatch(/tracking_url\s*=\s*EXCLUDED\.tracking_url/i);
      expect(upsertSql).toMatch(/status\s*=\s*EXCLUDED\.status/i);
      expect(upsertSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
    });

    it("persists every column populated from the fulfillment payload (v1.19)", async() => {
      await service.upsertFulfillment(ORDER_ID, baseFulfillment);

      const [, upsertParams] = mockQuery.mock.calls[0];

      // v1.19 every-column assertion against the SQL parameter array
      expect(upsertParams).toEqual([
        ORDER_ID, // order_id (internal)
        "5001", // shopify_fulfillment_id (string)
        "1Z999AA10123456784", // tracking_number
        "UPS", // carrier_code
        baseFulfillment.tracking_info.url, // tracking_url
        "in_transit", // status
      ]);
    });

    it("defaults status to 'pending' when fulfillment.status is missing", async() => {
      await service.upsertFulfillment(ORDER_ID, {
        ...baseFulfillment,
        status: undefined,
      });

      const [, upsertParams] = mockQuery.mock.calls[0];
      expect(upsertParams?.[5]).toBe("pending");
    });

    it("nulls out tracking columns when tracking_info is absent", async() => {
      await service.upsertFulfillment(ORDER_ID, {
        id: 5001,
        order_id: 1001,
        // no tracking_info, no status
      });

      const [, upsertParams] = mockQuery.mock.calls[0];
      expect(upsertParams?.[2]).toBeUndefined(); // tracking_number
      expect(upsertParams?.[3]).toBeUndefined(); // carrier_code
      expect(upsertParams?.[4]).toBeUndefined(); // tracking_url
      expect(upsertParams?.[5]).toBe("pending");
    });

    it("scopes the upsert to the supplied internal order_id, not the Shopify order_id", async() => {
      await service.upsertFulfillment(ORDER_ID, baseFulfillment);

      const [, upsertParams] = mockQuery.mock.calls[0];
      // Param[0] is the internal order_id (multi-tenant safe — resolved upstream)
      expect(upsertParams?.[0]).toBe(ORDER_ID);
      // The shopify order_id from the payload (1001) does NOT appear here
      expect(upsertParams).not.toContain(1001);
      expect(upsertParams).not.toContain("1001");
    });

    it("propagates DB failures (Shopify will retry on non-2xx)", async() => {
      mockQuery.mockRejectedValueOnce(new Error("constraint violation"));

      await expect(
        service.upsertFulfillment(ORDER_ID, baseFulfillment),
      ).rejects.toThrow("constraint violation");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
