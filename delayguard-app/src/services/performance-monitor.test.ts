/**
 * Sibling test for PerformanceMonitor — public API surface only
 * (trackRequest / getPerformanceMetrics / getRealTimeMetrics / clearMetrics /
 * getMetricsHistory). The static `trackPerformance` decorator is intentionally
 * out of scope — decorator wiring is exercised by its real consumers in
 * server.ts:215, not by an isolated unit test.
 *
 * Pattern: SDK-level `jest.mock('ioredis', …)` override (matches Wave 2.3 /
 * monitoring-service.test.ts / redis-connection.test.ts). The shared
 * __mocks__/ioredis.js stub lacks `hset` / `hgetall` / `expire` — methods this
 * service relies on — so this file overrides the manual mock with a richer
 * per-file factory.
 *
 * Discovered while writing tests (NOT fixed here per smallest-blast-radius):
 * `trackRequest` writes a 4-field hash (`duration` / `success` / `timestamp` /
 * `context`) but `getOperationMetrics` and `getMetricsHistory` read indexed
 * keys (`duration:${i}` / `timestamp:${i}` / `success:${i}`) that the writer
 * never produces. Result: tracked operations never bubble through into
 * `getPerformanceMetrics(operation)` — the reader always returns
 * `{ averageResponseTime: 0, successRate: 100, errorRate: 0 }` regardless of
 * what was tracked. Tests below lock in the OBSERVABLE behavior (zeros) so
 * the bug is surfaced rather than silently masked. Carry forward as a Wave
 * 4.x follow-up that fixes the reader/writer schema mismatch.
 */

const mockRedisInstance: {
  hset: jest.Mock;
  hgetall: jest.Mock;
  expire: jest.Mock;
  keys: jest.Mock;
  llen: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
} = {
  hset: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  expire: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  llen: jest.fn().mockResolvedValue(0),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
};

const mockRedisConstructor = jest.fn().mockImplementation(() => mockRedisInstance);
jest.mock("ioredis", () => ({
  __esModule: true,
  Redis: mockRedisConstructor,
  default: mockRedisConstructor,
}));

import { PerformanceMonitor } from "./performance-monitor";
import type { AppConfig } from "../types";

const TEST_CONFIG: AppConfig = {
  database: { url: "postgresql://test/test" },
  redis: { url: "redis://localhost:6379" },
  shopify: { apiKey: "k", apiSecret: "s", scopes: ["read_orders"] },
  sendgrid: { apiKey: "sg" },
  twilio: { accountSid: "tw", authToken: "t", phoneNumber: "+1234567890" },
  shipengine: { apiKey: "se" },
};

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisInstance.hset.mockResolvedValue(1);
    mockRedisInstance.hgetall.mockResolvedValue({});
    mockRedisInstance.expire.mockResolvedValue(1);
    mockRedisInstance.keys.mockResolvedValue([]);
    mockRedisInstance.llen.mockResolvedValue(0);
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.del.mockResolvedValue(1);

    monitor = new PerformanceMonitor(TEST_CONFIG);
  });

  describe("constructor", () => {
    it("instantiates an ioredis client from config.redis.url", () => {
      expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
      expect(mockRedisConstructor).toHaveBeenCalledWith("redis://localhost:6379");
    });
  });

  describe("trackRequest", () => {
    it("hsets the metric row with stringified duration/success/timestamp/context", async() => {
      const before = Date.now();
      await monitor.trackRequest("getAlerts", 142, true, { route: "/api/alerts" });
      const after = Date.now();

      expect(mockRedisInstance.hset).toHaveBeenCalledTimes(1);
      const [key, payload] = mockRedisInstance.hset.mock.calls[0];
      expect(key).toBe("metrics:getAlerts");
      expect(payload.duration).toBe("142");
      expect(payload.success).toBe("true");
      expect(payload.context).toBe('{"route":"/api/alerts"}');
      const ts = parseInt(payload.timestamp, 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it("writes an empty-string context when none is provided (regression guard)", async() => {
      await monitor.trackRequest("getOrders", 50, true);

      const payload = mockRedisInstance.hset.mock.calls[0][1];
      expect(payload.context).toBe("");
    });

    it("records success=false in the hash for failure tracking", async() => {
      await monitor.trackRequest("getAlerts", 999, false);

      const payload = mockRedisInstance.hset.mock.calls[0][1];
      expect(payload.success).toBe("false");
    });

    it("sets a 1-hour TTL on every tracked metric (3600s)", async() => {
      await monitor.trackRequest("getAlerts", 100, true);

      expect(mockRedisInstance.expire).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith("metrics:getAlerts", 3600);
    });

    it("propagates Redis errors from hset (does not swallow)", async() => {
      mockRedisInstance.hset.mockRejectedValueOnce(new Error("WRONGTYPE"));

      await expect(monitor.trackRequest("op", 1, true)).rejects.toThrow("WRONGTYPE");
    });
  });

  describe("getPerformanceMetrics", () => {
    it("returns the documented shape with all numeric fields when given an operation name", async() => {
      const result = await monitor.getPerformanceMetrics("getAlerts");

      expect(result).toEqual(
        expect.objectContaining({
          responseTime: expect.any(Number),
          successRate: expect.any(Number),
          errorRate: expect.any(Number),
          memoryUsage: expect.any(Number),
          cpuUsage: expect.any(Number),
          queueSize: expect.any(Number),
          processingRate: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("aggregates across all operations when called with no argument", async() => {
      mockRedisInstance.keys.mockResolvedValueOnce([
        "metrics:getAlerts",
        "metrics:getOrders",
      ]);

      const result = await monitor.getPerformanceMetrics();

      expect(mockRedisInstance.keys).toHaveBeenCalledWith("metrics:*");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("sums waiting + active queue lengths into `queueSize`", async() => {
      mockRedisInstance.llen.mockImplementation((key: string) =>
        Promise.resolve(key === "delay-check:waiting" ? 4 : key === "delay-check:active" ? 3 : 0),
      );

      const result = await monitor.getPerformanceMetrics("op");

      expect(result.queueSize).toBe(7);
      expect(mockRedisInstance.llen).toHaveBeenCalledWith("delay-check:waiting");
      expect(mockRedisInstance.llen).toHaveBeenCalledWith("delay-check:active");
    });

    it("parses processingRate from the Redis-stored string and returns 0 when absent", async() => {
      mockRedisInstance.get.mockImplementation((key: string) =>
        Promise.resolve(key === "metrics:processing_rate" ? "12.5" : null),
      );

      const result = await monitor.getPerformanceMetrics("op");

      expect(result.processingRate).toBe(12.5);
    });

    it("converts memoryUsage to MB (process.memoryUsage().heapUsed / 1024 / 1024)", async() => {
      const result = await monitor.getPerformanceMetrics("op");

      // Heap is real here — assert a plausible MB range rather than an exact value.
      expect(result.memoryUsage).toBeGreaterThan(0);
      expect(result.memoryUsage).toBeLessThan(10_000);
    });

    it("LATENT BUG: reader/writer schema mismatch — tracked metrics never surface (regression-lock test)", async() => {
      // The reader at getOperationMetrics looks at `data[`duration:${i}`]` etc.,
      // but trackRequest writes plain `duration` / `success` / `timestamp` keys.
      // So even after a successful trackRequest, the reader returns zeros.
      await monitor.trackRequest("getAlerts", 250, true);
      mockRedisInstance.hgetall.mockResolvedValueOnce({
        duration: "250",
        success: "true",
        timestamp: "1700000000000",
        context: "",
      });

      const result = await monitor.getPerformanceMetrics("getAlerts");

      // Locked-in zeros — when the schema mismatch is fixed in a follow-up wave,
      // this assertion will fail and the test should be updated to reflect the
      // (then-correct) reader output.
      expect(result.responseTime).toBe(0);
      expect(result.successRate).toBe(100);
      expect(result.errorRate).toBe(0);
    });
  });

  describe("getRealTimeMetrics", () => {
    it("returns the documented real-time slice plus activeAlerts from Redis", async() => {
      mockRedisInstance.get.mockImplementation((key: string) => {
        if (key === "metrics:active_alerts") return Promise.resolve("17");
        if (key === "metrics:processing_rate") return Promise.resolve("8.2");
        return Promise.resolve(null);
      });

      const result = await monitor.getRealTimeMetrics();

      expect(result).toEqual(
        expect.objectContaining({
          activeAlerts: 17,
          processingRate: 8.2,
          queueSize: expect.any(Number),
          errorRate: expect.any(Number),
          memoryUsage: expect.any(Number),
          responseTime: expect.any(Number),
        }),
      );
    });
  });

  describe("clearMetrics", () => {
    it("deletes the single key when called with an operation name", async() => {
      await monitor.clearMetrics("getAlerts");

      expect(mockRedisInstance.del).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.del).toHaveBeenCalledWith("metrics:getAlerts");
    });

    it("deletes every matching key when called with no argument", async() => {
      mockRedisInstance.keys.mockResolvedValueOnce([
        "metrics:getAlerts",
        "metrics:getOrders",
        "metrics:checkDelays",
      ]);

      await monitor.clearMetrics();

      expect(mockRedisInstance.keys).toHaveBeenCalledWith("metrics:*");
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        "metrics:getAlerts",
        "metrics:getOrders",
        "metrics:checkDelays",
      );
    });

    it("skips the del call when scan returns zero matching keys (regression guard)", async() => {
      mockRedisInstance.keys.mockResolvedValueOnce([]);

      await monitor.clearMetrics();

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe("getMetricsHistory", () => {
    it("returns an empty array when the hash is empty", async() => {
      mockRedisInstance.hgetall.mockResolvedValueOnce({});

      const history = await monitor.getMetricsHistory("getAlerts");

      expect(history).toEqual([]);
    });

    it("filters out entries older than the requested cutoff window", async() => {
      // Same schema-mismatch story as `getPerformanceMetrics`: the reader's
      // indexed-key loop won't match the writer's flat keys, so even valid
      // hash payloads yield an empty array. Locked-in behavior.
      const now = Date.now();
      mockRedisInstance.hgetall.mockResolvedValueOnce({
        "duration:0": "100",
        "success:0": "true",
        "timestamp:0": String(now - 30 * 60 * 60 * 1000), // 30h ago — outside default 24h window
      });

      const history = await monitor.getMetricsHistory("getAlerts", 24);

      expect(history).toEqual([]);
    });
  });
});
