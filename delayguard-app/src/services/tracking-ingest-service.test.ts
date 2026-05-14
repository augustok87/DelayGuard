/**
 * TrackingIngestService tests
 *
 * TDD-first per .claude/rules/tests.md. Owns the three-step composition
 * previously glued together inside webhooks.ts processFulfillment:
 *   1. ShipEngine getTrackingInfo() HTTP call
 *   2. tracking_events UPSERT loop
 *   3. orders ETA + tracking_status + last_tracking_update UPDATE
 *
 * v1.19 hot zone — last_tracking_update is the column the v1.19 incident
 * was originally about. Every UPDATE/INSERT below carries an explicit
 * every-column param-array assertion.
 *
 * Behavior contract preserved from the pre-refactor route: ShipEngine
 * failure must NOT propagate. The route's outer flow still 200s and
 * still enqueues the delay-check job. This is intentional — tracking
 * data is nice-to-have; the delay-check worker will re-fetch it later.
 */
import { TrackingIngestService } from "./tracking-ingest-service";
import { CarrierService } from "./carrier-service";
import { query } from "../database/connection";
import { logger } from "../utils/logger";
import type { TrackingInfo } from "../types";

jest.mock("../database/connection");
jest.mock("../utils/logger");
jest.mock("./carrier-service");

const mockQuery = query as jest.MockedFunction<typeof query>;
const MockedCarrierService = CarrierService as jest.MockedClass<
  typeof CarrierService
>;

const ORDER_ID = 9001;
const TRACKING_NUMBER = "1Z999AA10123456784";
const CARRIER_CODE = "ups";

const sampleTrackingInfo: TrackingInfo = {
  trackingNumber: TRACKING_NUMBER,
  carrierCode: CARRIER_CODE,
  status: "IN_TRANSIT",
  estimatedDeliveryDate: "2026-05-20T12:00:00Z",
  originalEstimatedDeliveryDate: "2026-05-18T12:00:00Z",
  events: [
    {
      id: "evt-1",
      timestamp: "2026-05-14T08:00:00Z",
      status: "IN_TRANSIT",
      description: "Departed facility",
      location: "Louisville, KY",
    },
    {
      id: "evt-2",
      timestamp: "2026-05-15T14:00:00Z",
      status: "IN_TRANSIT",
      description: "Arrived at destination facility",
      location: "Brooklyn, NY",
    },
  ],
};

describe("TrackingIngestService", () => {
  let service: TrackingIngestService;
  let getTrackingInfoMock: jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
    MockedCarrierService.mockReset();
    getTrackingInfoMock = jest.fn();
    MockedCarrierService.mockImplementation(
      () =>
        ({
          getTrackingInfo: getTrackingInfoMock,
        }) as unknown as CarrierService,
    );
    service = new TrackingIngestService();
  });

  describe("ingestTracking — happy path", () => {
    beforeEach(() => {
      getTrackingInfoMock.mockResolvedValue(sampleTrackingInfo);
    });

    it("calls ShipEngine with the tracking number and carrier code", async() => {
      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      expect(getTrackingInfoMock).toHaveBeenCalledWith(
        TRACKING_NUMBER,
        CARRIER_CODE,
      );
    });

    it("upserts each tracking event with every column populated (v1.19)", async() => {
      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      // 2 events + 1 final orders UPDATE = 3 query calls
      expect(mockQuery).toHaveBeenCalledTimes(3);

      const [event0Sql, event0Params] = mockQuery.mock.calls[0];
      expect(event0Sql).toMatch(/INSERT\s+INTO\s+tracking_events/i);
      expect(event0Sql).toMatch(
        /ON\s+CONFLICT\s*\(\s*order_id\s*,\s*timestamp\s*\)/i,
      );
      expect(event0Sql).toMatch(/status\s*=\s*EXCLUDED\.status/i);
      expect(event0Sql).toMatch(/description\s*=\s*EXCLUDED\.description/i);
      expect(event0Sql).toMatch(/location\s*=\s*EXCLUDED\.location/i);
      expect(event0Sql).toMatch(/carrier_status\s*=\s*EXCLUDED\.carrier_status/i);
      expect(event0Sql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);

      // v1.19 every-column assertion — event 0
      expect(event0Params).toEqual([
        ORDER_ID,
        "2026-05-14T08:00:00Z",
        "IN_TRANSIT",
        "Departed facility",
        "Louisville, KY",
        CARRIER_CODE,
      ]);

      // event 1
      const [, event1Params] = mockQuery.mock.calls[1];
      expect(event1Params).toEqual([
        ORDER_ID,
        "2026-05-15T14:00:00Z",
        "IN_TRANSIT",
        "Arrived at destination facility",
        "Brooklyn, NY",
        CARRIER_CODE,
      ]);
    });

    it("passes location=null when the event has no location field", async() => {
      getTrackingInfoMock.mockResolvedValue({
        ...sampleTrackingInfo,
        events: [
          {
            id: "evt-no-loc",
            timestamp: "2026-05-14T08:00:00Z",
            status: "IN_TRANSIT",
            description: "Departed facility",
            // no location
          },
        ],
      });

      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      const [, eventParams] = mockQuery.mock.calls[0];
      expect(eventParams?.[4]).toBeNull();
    });

    it("UPDATEs orders with every ETA column populated including last_tracking_update (v1.19)", async() => {
      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      // Final query is the orders UPDATE
      const lastCallIndex = mockQuery.mock.calls.length - 1;
      const [updateSql, updateParams] = mockQuery.mock.calls[lastCallIndex];

      expect(updateSql).toMatch(/UPDATE\s+orders\s+SET/i);
      expect(updateSql).toMatch(/original_eta\s*=\s*\$1/i);
      expect(updateSql).toMatch(/current_eta\s*=\s*\$2/i);
      expect(updateSql).toMatch(/tracking_status\s*=\s*\$3/i);
      expect(updateSql).toMatch(/last_tracking_update\s*=\s*\$4/i);
      expect(updateSql).toMatch(/updated_at\s*=\s*CURRENT_TIMESTAMP/i);
      expect(updateSql).toMatch(/WHERE\s+id\s*=\s*\$5/i);

      // v1.19 every-column assertion — including the bug-incident column
      // last_tracking_update derives from the MOST RECENT event timestamp
      // (events sorted desc by timestamp).
      expect(updateParams).toEqual([
        "2026-05-18T12:00:00Z", // original_eta
        "2026-05-20T12:00:00Z", // current_eta
        "IN_TRANSIT", // tracking_status
        "2026-05-15T14:00:00Z", // last_tracking_update (most recent event)
        ORDER_ID,
      ]);
    });

    it("derives last_tracking_update from the most recent event regardless of input order", async() => {
      // Same events but pre-sorted ascending. The derived last_tracking_update
      // should still be the latest one.
      getTrackingInfoMock.mockResolvedValue({
        ...sampleTrackingInfo,
        events: [
          {
            id: "evt-a",
            timestamp: "2026-05-12T08:00:00Z",
            status: "ACCEPTED",
            description: "Picked up",
          },
          {
            id: "evt-b",
            timestamp: "2026-05-15T14:00:00Z",
            status: "IN_TRANSIT",
            description: "Arrived",
          },
          {
            id: "evt-c",
            timestamp: "2026-05-13T20:00:00Z",
            status: "IN_TRANSIT",
            description: "In transit",
          },
        ],
      });

      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      const lastCallIndex = mockQuery.mock.calls.length - 1;
      const [, updateParams] = mockQuery.mock.calls[lastCallIndex];
      expect(updateParams?.[3]).toBe("2026-05-15T14:00:00Z");
    });

    it("uses null ETAs when ShipEngine returns no estimated delivery dates", async() => {
      getTrackingInfoMock.mockResolvedValue({
        ...sampleTrackingInfo,
        estimatedDeliveryDate: undefined,
        originalEstimatedDeliveryDate: undefined,
      });

      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      const lastCallIndex = mockQuery.mock.calls.length - 1;
      const [, updateParams] = mockQuery.mock.calls[lastCallIndex];
      expect(updateParams?.[0]).toBeNull();
      expect(updateParams?.[1]).toBeNull();
    });
  });

  describe("ingestTracking — no events branch", () => {
    it("skips the event-upsert loop AND uses null last_tracking_update when events is empty", async() => {
      getTrackingInfoMock.mockResolvedValue({
        ...sampleTrackingInfo,
        events: [],
      });

      await service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE);

      // Only the orders UPDATE fires — no event inserts
      expect(mockQuery).toHaveBeenCalledTimes(1);

      const [, updateParams] = mockQuery.mock.calls[0];
      expect(updateParams?.[3]).toBeNull(); // last_tracking_update
    });
  });

  describe("ingestTracking — ShipEngine failure (bug-shaped test, behavior preserved)", () => {
    it("swallows ShipEngine errors so the caller still 200s and still enqueues the job", async() => {
      getTrackingInfoMock.mockRejectedValue(
        new Error("ShipEngine 503 Service Unavailable"),
      );

      // Must NOT throw — preserves the pre-refactor "tracking is nice-to-have" semantic
      await expect(
        service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE),
      ).resolves.toBeUndefined();

      // No DB writes happened on the failure path
      expect(mockQuery).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("ShipEngine"),
        expect.any(Error),
        expect.objectContaining({
          orderId: ORDER_ID,
          trackingNumber: TRACKING_NUMBER,
          carrierCode: CARRIER_CODE,
        }),
      );
    });
  });

  describe("ingestTracking — DB failure after successful ShipEngine fetch", () => {
    it("propagates a DB failure on the event UPSERT (route should NOT 200 if persistence breaks)", async() => {
      getTrackingInfoMock.mockResolvedValue(sampleTrackingInfo);
      mockQuery.mockReset();
      mockQuery.mockRejectedValueOnce(new Error("tracking_events constraint"));

      await expect(
        service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE),
      ).rejects.toThrow("tracking_events constraint");
      expect(logger.error).toHaveBeenCalled();
    });

    it("propagates a DB failure on the orders ETA UPDATE", async() => {
      getTrackingInfoMock.mockResolvedValue(sampleTrackingInfo);
      mockQuery.mockReset();
      // Both event upserts succeed
      mockQuery.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce([]);
      // The final orders UPDATE fails
      mockQuery.mockRejectedValueOnce(new Error("orders UPDATE deadlock"));

      await expect(
        service.ingestTracking(ORDER_ID, TRACKING_NUMBER, CARRIER_CODE),
      ).rejects.toThrow("orders UPDATE deadlock");
    });
  });
});
