/**
 * Sibling test for RedisConnectionManager.
 *
 * Pattern: SDK-level `jest.mock('ioredis', …)` override (matches Wave 2.3 /
 * monitoring-service.test.ts). The shared __mocks__/ioredis.js lacks the
 * `status` property and the `quit()` method that this service relies on, so
 * we override the manual mock here with a per-file factory that exposes a
 * configurable mock instance.
 */

const mockRedisInstance: {
  status: string;
  on: jest.Mock;
  connect: jest.Mock;
  quit: jest.Mock;
  ping: jest.Mock;
  info: jest.Mock;
} = {
  status: "wait",
  on: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue("OK"),
  ping: jest.fn().mockResolvedValue("PONG"),
  info: jest.fn().mockResolvedValue("redis_version:7.0.0\r\n"),
};

const mockRedisConstructor = jest.fn().mockImplementation(() => {
  // Reset event handler registry on construction — tests rely on counting registrations.
  return mockRedisInstance;
});

jest.mock("ioredis", () => mockRedisConstructor);

const mockEnvGet = jest.fn().mockReturnValue("redis://localhost:6379");
jest.mock("../config/environment", () => ({
  __esModule: true,
  default: { get: mockEnvGet },
}));

import { RedisConnectionManager } from "./redis-connection";

describe("RedisConnectionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisInstance.status = "wait";
    mockRedisInstance.on.mockReturnThis();
    mockRedisInstance.connect.mockResolvedValue(undefined);
    mockRedisInstance.quit.mockResolvedValue("OK");
    mockRedisInstance.ping.mockResolvedValue("PONG");
    mockRedisInstance.info.mockResolvedValue("redis_version:7.0.0\r\n");
    mockEnvGet.mockReturnValue("redis://localhost:6379");
  });

  describe("parseRedisUrl (via constructor)", () => {
    it("parses the default localhost URL into host/port/db", async() => {
      const manager = new RedisConnectionManager();
      await manager.createConnection();

      expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
      const config = mockRedisConstructor.mock.calls[0][0];
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.password).toBeUndefined();
      expect(config.db).toBe(0);
    });

    it("extracts password, custom port, and db index from the URL", async() => {
      mockEnvGet.mockReturnValue("redis://:secret@redis.example.com:6380/3");

      const manager = new RedisConnectionManager();
      await manager.createConnection();

      const config = mockRedisConstructor.mock.calls[0][0];
      expect(config.host).toBe("redis.example.com");
      expect(config.port).toBe(6380);
      expect(config.password).toBe("secret");
      expect(config.db).toBe(3);
    });

    it("defaults the port to 6379 when the URL omits it", async() => {
      mockEnvGet.mockReturnValue("redis://redis.internal");

      const manager = new RedisConnectionManager();
      await manager.createConnection();

      const config = mockRedisConstructor.mock.calls[0][0];
      expect(config.host).toBe("redis.internal");
      expect(config.port).toBe(6379);
    });

    it("throws a wrapped 'Invalid Redis URL' error for malformed URLs", () => {
      mockEnvGet.mockReturnValue("not-a-url");

      expect(() => new RedisConnectionManager()).toThrow(/Invalid Redis URL/);
    });

    it("pins the canonical connection-timing config (regression guard)", async() => {
      const manager = new RedisConnectionManager();
      await manager.createConnection();

      const config = mockRedisConstructor.mock.calls[0][0];
      expect(config.retryDelayOnFailover).toBe(100);
      expect(config.maxRetriesPerRequest).toBe(3);
      expect(config.lazyConnect).toBe(true);
      expect(config.keepAlive).toBe(30000);
      expect(config.connectTimeout).toBe(10000);
      expect(config.commandTimeout).toBe(5000);
    });
  });

  describe("createConnection", () => {
    it("returns the existing client without re-constructing when status is 'ready'", async() => {
      const manager = new RedisConnectionManager();
      mockRedisInstance.status = "ready";
      await manager.createConnection();

      mockRedisConstructor.mockClear();
      await manager.createConnection();

      expect(mockRedisConstructor).not.toHaveBeenCalled();
      expect(mockRedisInstance.connect).toHaveBeenCalledTimes(1); // only the first call
    });

    it("registers all five event handlers (connect / ready / error / close / reconnecting)", async() => {
      const manager = new RedisConnectionManager();
      await manager.createConnection();

      const events = mockRedisInstance.on.mock.calls.map((call) => call[0]);
      expect(events).toEqual([
        "connect",
        "ready",
        "error",
        "close",
        "reconnecting",
      ]);
    });

    it("calls client.connect() after wiring up event handlers", async() => {
      const manager = new RedisConnectionManager();
      await manager.createConnection();

      expect(mockRedisInstance.connect).toHaveBeenCalledTimes(1);
    });

    it("throws a wrapped 'Redis connection failed' error when client.connect() rejects", async() => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const manager = new RedisConnectionManager();

      await expect(manager.createConnection()).rejects.toThrow(
        /Redis connection failed: ECONNREFUSED/,
      );
    });
  });

  describe("getConnection", () => {
    it("reuses the existing client when status is 'ready'", async() => {
      const manager = new RedisConnectionManager();
      mockRedisInstance.status = "ready";
      await manager.createConnection();
      mockRedisConstructor.mockClear();

      const client = await manager.getConnection();

      expect(client).toBe(mockRedisInstance);
      expect(mockRedisConstructor).not.toHaveBeenCalled();
    });

    it("creates a new connection if the client is null", async() => {
      const manager = new RedisConnectionManager();

      const client = await manager.getConnection();

      expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
      expect(client).toBe(mockRedisInstance);
    });

    it("creates a new connection if the client is non-null but not 'ready'", async() => {
      const manager = new RedisConnectionManager();
      mockRedisInstance.status = "end";
      await manager.createConnection();
      mockRedisConstructor.mockClear();

      mockRedisInstance.status = "end";
      await manager.getConnection();

      expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe("closeConnection", () => {
    it("calls client.quit() and discards the reference", async() => {
      const manager = new RedisConnectionManager();
      await manager.createConnection();

      await manager.closeConnection();

      expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
      expect(manager.isAvailable()).toBe(false);
    });

    it("is a no-op when no client was ever created", async() => {
      const manager = new RedisConnectionManager();

      await expect(manager.closeConnection()).resolves.toBeUndefined();
      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });

  describe("testConnection", () => {
    it("returns true when ping resolves to 'PONG'", async() => {
      const manager = new RedisConnectionManager();

      await expect(manager.testConnection()).resolves.toBe(true);
      expect(mockRedisInstance.ping).toHaveBeenCalledTimes(1);
    });

    it("returns false (does NOT throw) when ping rejects", async() => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error("connection lost"));

      const manager = new RedisConnectionManager();

      await expect(manager.testConnection()).resolves.toBe(false);
    });

    it("returns false when ping resolves to something other than 'PONG'", async() => {
      mockRedisInstance.ping.mockResolvedValueOnce("WRONG");

      const manager = new RedisConnectionManager();

      await expect(manager.testConnection()).resolves.toBe(false);
    });
  });

  describe("getInfo", () => {
    it("returns the Redis INFO string from a fresh connection", async() => {
      const manager = new RedisConnectionManager();

      await expect(manager.getInfo()).resolves.toBe("redis_version:7.0.0\r\n");
      expect(mockRedisInstance.info).toHaveBeenCalledTimes(1);
    });

    it("throws a wrapped 'Failed to get Redis info' error when info() rejects", async() => {
      mockRedisInstance.info.mockRejectedValueOnce(new Error("LOADING"));

      const manager = new RedisConnectionManager();

      await expect(manager.getInfo()).rejects.toThrow(
        /Failed to get Redis info: LOADING/,
      );
    });
  });

  describe("isAvailable", () => {
    it("returns true when a client exists with status 'ready'", async() => {
      const manager = new RedisConnectionManager();
      mockRedisInstance.status = "ready";
      await manager.createConnection();

      expect(manager.isAvailable()).toBe(true);
    });

    it("returns false before any connection has been created", () => {
      const manager = new RedisConnectionManager();

      expect(manager.isAvailable()).toBe(false);
    });

    it("returns false when a client exists but status is not 'ready'", async() => {
      const manager = new RedisConnectionManager();
      mockRedisInstance.status = "reconnecting";
      await manager.createConnection();

      expect(manager.isAvailable()).toBe(false);
    });
  });
});
