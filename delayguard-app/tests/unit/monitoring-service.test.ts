// Mock the database and Redis modules before importing the service
const mockQuery = jest.fn();
const mockPing = jest.fn();
const mockInfo = jest.fn();
const mockDbsize = jest.fn();
const mockSetex = jest.fn();
const mockGet = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    totalCount: 10,
    idleCount: 8,
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: mockPing,
    info: mockInfo,
    dbsize: mockDbsize,
    setex: mockSetex,
    get: mockGet,
    status: 'ready',
  }));
});

import { MonitoringService } from '@/services/monitoring-service';
import { AppConfig } from '@/types';

const mockConfig: AppConfig = {
  shopify: {
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    scopes: ['read_orders'],
  },
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  shipengine: {
    apiKey: 'test-shipengine-key',
  },
  sendgrid: {
    apiKey: 'test-sendgrid-key',
  },
  twilio: {
    accountSid: 'test-sid',
    authToken: 'test-token',
    phoneNumber: '+1234567890',
  },
};

/**
 * Deterministic stand-in for the wall clock (§6 R21).
 *
 * MonitoringService grades each health check on `Date.now()` deltas, so any
 * test asserting a health STATUS is really asserting how fast the machine is
 * unless the clock is controlled. Returns a handle whose `advance()` moves
 * time by an exact amount, letting a test place a duration on one specific
 * check and leave every other check at zero.
 */
function freezeClock(startMs = 1_700_000_000_000): { advance: (ms: number) => void } {
  let now = startMs;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  return {
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instances with mocked methods
    mockDb = {
      query: mockQuery,
      totalCount: 10,
      idleCount: 8,
    };
    
    mockRedis = {
      ping: mockPing,
      info: mockInfo,
      dbsize: mockDbsize,
      setex: mockSetex,
      get: mockGet,
      status: 'ready',
    };
    
    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // freezeClock() installs a Date.now spy; without this it leaks into the
    // next test and every duration reads 0 there too.
    jest.restoreAllMocks();
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async() => {
      // §6 R21: the health checks grade themselves on REAL elapsed time
      // (Redis is "degraded" at >100 ms), so asserting "everything healthy"
      // against a live clock only passes on a fast, idle machine. It failed on
      // essentially every CI run. Freezing Date.now makes every measured
      // duration 0, so this test asserts what its name claims — that all six
      // checks run and aggregate — instead of how quick the runner is.
      // The threshold logic itself is covered deterministically below.
      freezeClock();

      // Mock database health check
      mockDb.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      // Mock Redis health check
      mockRedis.ping.mockResolvedValue('PONG');
      
      // Mock external API health checks
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 }) // ShipEngine
        .mockResolvedValueOnce({ ok: true, status: 200 }) // SendGrid
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Twilio

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6); // Database, Redis, 3 external APIs, Application

      // Report WHICH check is unhealthy and why (§6 R21).
      expect(
        checks
          .filter(c => c.status !== 'healthy')
          .map(c => `${c.name}=${c.status} rt=${c.responseTime} err=${c.error ?? '-'} details=${JSON.stringify(c.details ?? {})}`),
      ).toEqual([]);
    });

    it('should detect unhealthy services', async() => {
      // Mock database failure
      mockQuery.mockRejectedValue(new Error('Connection failed'));
      
      // Mock Redis failure
      mockPing.mockRejectedValue(new Error('Connection failed'));
      
      // Mock external API failures
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error')) // ShipEngine
        .mockRejectedValueOnce(new Error('Network error')) // SendGrid
        .mockRejectedValueOnce(new Error('Network error')); // Twilio

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6);
      const dbCheck = checks.find(c => c.name === 'Database');
      const redisCheck = checks.find(c => c.name === 'Redis');
      const apiChecks = checks.filter(c => ['ShipEngine', 'SendGrid', 'Twilio'].includes(c.name));
      
      expect(dbCheck?.status).toBe('unhealthy');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(apiChecks.every(check => check.status === 'unhealthy')).toBe(true);
    });

    it('should detect degraded services', async() => {
      // Mock database and Redis with normal responses
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6);
      const dbCheck = checks.find(c => c.name === 'Database');
      const redisCheck = checks.find(c => c.name === 'Redis');
      const appCheck = checks.find(c => c.name === 'Application');
      
      // Verify all checks are defined
      expect(dbCheck).toBeDefined();
      expect(redisCheck).toBeDefined();
      expect(appCheck).toBeDefined();
      
      // Verify checks have response times
      expect(dbCheck?.responseTime).toBeGreaterThanOrEqual(0);
      expect(redisCheck?.responseTime).toBeGreaterThanOrEqual(0);
      expect(appCheck?.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async() => {
      // Mock database stats
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      // Mock Redis stats
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');

      const metrics = await monitoringService.collectSystemMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.arrayContaining([expect.any(Number)]),
        },
        memory: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
        database: {
          connections: {
            total: 10,
            idle: 8,
            active: 2,
          },
          queryTime: expect.any(Number),
        },
        redis: {
          connected: true,
          memory: {
            used: expect.any(Number),
            peak: expect.any(Number),
          },
          operations: {
            commands: expect.any(Number),
            keyspace: 100,
          },
        },
        application: {
          uptime: expect.any(Number),
          requests: {
            total: expect.any(Number),
            errors: expect.any(Number),
            successRate: expect.any(Number),
          },
          responseTime: {
            average: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number),
          },
        },
      });
    });
  });

  describe('checkAlerts', () => {
    // LAUNCH_PLAN.md decision D2: internal alerts/alert_rules persistence is
    // cut from launch scope. checkAlerts must not read alert_rules from the
    // database nor INSERT INTO alerts — the tables are not in runMigrations().
    it('does not read alert_rules or persist alerts to the database (D2)', async() => {
      // Mock database and Redis for collectSystemMetrics
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');

      // Collect metrics first to populate the metrics array
      await monitoringService.collectSystemMetrics();

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toEqual([]);
      const sqlCalls = mockQuery.mock.calls.map((call) => String(call[0]));
      for (const sql of sqlCalls) {
        expect(sql).not.toMatch(/alert_rules/i);
        expect(sql).not.toMatch(/INSERT\s+INTO\s+alerts/i);
      }
    });

    it('should not generate alerts when metrics are within thresholds', async() => {
      // Mock low memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0,
      })) as any;

      // Mock total memory
      const os = require('os');
      os.totalmem = jest.fn(() => 1000 * 1024 * 1024); // 1GB

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('getSystemStatus', () => {
    it('should return overall system status', async() => {
      // Mock healthy checks
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      // Collect metrics first
      await monitoringService.collectSystemMetrics();

      const status = await monitoringService.getSystemStatus();

      expect(status).toMatchObject({
        status: expect.stringMatching(/healthy|degraded/), // Can be either depending on system state
        checks: expect.any(Array),
        metrics: expect.any(Object),
        alerts: expect.any(Array),
      });
    });

    it('should return degraded status when some checks fail', async() => {
      // §6 R21: this used to sleep a real 150 ms to push Redis past its
      // threshold, which meant the OTHER checks were still racing the runner's
      // real clock and could tip the aggregate to unhealthy on CI. Now the
      // stub clock advances by exactly 150 ms inside the Redis ping and by
      // nothing anywhere else, so Redis is degraded and every other check is
      // healthy — by construction, on any machine.
      const clock = freezeClock();
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockImplementation(async() => {
        clock.advance(150);
        return 'PONG';
      });
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');
      
      // Mock external APIs to be healthy
      global.fetch = jest.fn().mockImplementation((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          url,
        });
      });

      // Collect metrics first
      await monitoringService.collectSystemMetrics();

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('degraded');
    });

    it('reports Redis healthy when it answers inside its threshold', async() => {
      // The other half of the contract: proves the degraded result above comes
      // from the threshold and not from something incidental. Neither test can
      // pass if `responseTime < 100` is dropped from checkRedis.
      const clock = freezeClock();
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockImplementation(async() => {
        clock.advance(99);
        return 'PONG';
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();

      const redis = checks.find(c => c.name === 'Redis');
      expect(redis?.status).toBe('healthy');
      expect(redis?.responseTime).toBe(99);
    });

    it('should return unhealthy status when critical checks fail', async() => {
      // Mock critical failures
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      mockPing.mockRejectedValue(new Error('Redis connection failed'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async() => {
      mockQuery.mockRejectedValue(new Error('Database error'));
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();
      const dbCheck = checks.find(check => check.name === 'Database');

      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database error');
    });

    it('should handle Redis errors gracefully', async() => {
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockRejectedValue(new Error('Redis error'));
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();
      const redisCheck = checks.find(check => check.name === 'Redis');

      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis error');
    });

    it('should handle external API errors gracefully', async() => {
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'));

      const checks = await monitoringService.performHealthChecks();
      const apiChecks = checks.filter(check => 
        ['ShipEngine', 'SendGrid', 'Twilio'].includes(check.name),
      );

      expect(apiChecks.every(check => check.status === 'unhealthy')).toBe(true);
    });
  });
});
