import { MonitoringService } from '../../../src/services/monitoring-service';
import { AppConfig } from '../../../src/types';

// Mock the dependencies
const mockRedisInstance = {
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  setex: jest.fn().mockResolvedValue('OK'),
};

const mockPoolInstance = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPoolInstance),
}));

/**
 * Deterministic stand-in for the wall clock (§6 R21) — mirrors the helper in
 * tests/unit/monitoring-service.test.ts. MonitoringService grades every health
 * check on `Date.now()` deltas, so a test asserting a health STATUS is really
 * asserting how fast the machine is unless the clock is controlled.
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
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      database: {
        url: 'postgresql://test:test@localhost:5432/test',
      },
      redis: {
        url: 'redis://localhost:6379',
      },
      shopify: {
        apiKey: 'test',
        apiSecret: 'test',
        scopes: ['read_orders'],
      },
      sendgrid: {
        apiKey: 'test',
      },
      twilio: {
        accountSid: 'test',
        authToken: 'test',
        phoneNumber: '+1234567890',
      },
      shipengine: {
        apiKey: 'test',
      },
    };

    // Reset mocks before each test
    mockRedisInstance.ping = jest.fn().mockResolvedValue('PONG');
    mockPoolInstance.query = jest.fn().mockResolvedValue({ rows: [] });

    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(() => {
    // freezeClock() installs a Date.now spy; without this it leaks into the
    // next test and every measured duration reads 0 there too.
    jest.restoreAllMocks();
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async() => {
      // §6 R21. Two hidden dependencies made this the last red test on CI.
      //
      // 1. The health checks grade themselves on REAL elapsed time — Redis is
      //    "degraded" past 100 ms — so asserting "all healthy" against a live
      //    clock asserts how fast the runner is. freezeClock() makes every
      //    measured duration exactly 0.
      // 2. It never stubbed `fetch`, so it passed only because
      //    tests/setup/jest.setup.ts installs a global one. That is the hazard
      //    CLAUDE.md already records: checkExternalAPIs reaches the public
      //    internet without it, and the test's name claims coverage it does
      //    not own. Stub it here so the test states its own preconditions.
      freezeClock();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const healthChecks = await monitoringService.performHealthChecks();

      expect(healthChecks).toHaveLength(6); // database, redis, 3 external APIs, application

      // Report WHICH check is unhealthy and why. `every(...) === true` fails
      // with "expected true, received false" and names nothing, which cost two
      // blind CI round-trips (§6 R21).
      expect(
        healthChecks
          .filter(c => c.status !== 'healthy')
          .map(c => `${c.name}=${c.status} rt=${c.responseTime} err=${c.error ?? '-'} details=${JSON.stringify(c.details ?? {})}`),
      ).toEqual([]);
    });

    it('measures heap against the V8 heap limit, not total system memory (§6 R21)', async() => {
      // CI produced `memoryPercentage: 124` — impossible as a share of system
      // memory, and it made the Application check report "unhealthy" on a
      // perfectly healthy process. Cause: heapUsed / os.totalmem(), which
      // compares a V8 heap number against a system (or cgroup-limited) total.
      // On a constrained runner the denominator can be SMALLER than the heap
      // the process legitimately holds.
      //
      // This is not merely a test problem: /monitoring calls
      // performHealthChecks in production, so a Vercel function could report
      // itself unhealthy on a meaningless ratio.
      //
      // The right denominator for "is this app running out of heap" is V8's
      // heap_size_limit, which bounds the result by construction.
      freezeClock();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      // A process holding 2 GB of heap on a box that reports only 1 GB total —
      // exactly the shape CI hit.
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 2_400_000_000,
        heapTotal: 2_200_000_000,
        heapUsed: 2_000_000_000,
        external: 0,
        arrayBuffers: 0,
      } as NodeJS.MemoryUsage);
      jest.spyOn(require('os'), 'totalmem').mockReturnValue(1_000_000_000);
      jest
        .spyOn(require('v8'), 'getHeapStatistics')
        .mockReturnValue({ heap_size_limit: 8_000_000_000 } as never);

      const checks = await monitoringService.performHealthChecks();
      const app = checks.find(c => c.name === 'Application');

      // 2 GB of an 8 GB heap limit = 25%, healthy. The old formula gave 200%.
      expect((app?.details as { memoryPercentage: number }).memoryPercentage).toBe(25);
      expect(app?.status).toBe('healthy');
    });

    it('still reports unhealthy when the heap really is nearly exhausted', async() => {
      // The other half: the fix must not make the check unfailable.
      freezeClock();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 4_000_000_000,
        heapTotal: 3_900_000_000,
        heapUsed: 3_800_000_000,
        external: 0,
        arrayBuffers: 0,
      } as NodeJS.MemoryUsage);
      jest
        .spyOn(require('v8'), 'getHeapStatistics')
        .mockReturnValue({ heap_size_limit: 4_000_000_000 } as never);

      const checks = await monitoringService.performHealthChecks();
      const app = checks.find(c => c.name === 'Application');

      expect(app?.status).toBe('unhealthy'); // 95% of the heap limit
    });

    it('should detect unhealthy services', async() => {
      // Mock Redis connection failure
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Connection failed');
    });

    it('should detect degraded services', async() => {
      // Mock slow database response
      mockPoolInstance.query = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 2000)),
      );

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('degraded');
      expect(dbCheck?.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async() => {
      const metrics = await monitoringService.collectSystemMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('redis');
      expect(metrics).toHaveProperty('application');

      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
    });
  });

  describe('checkAlerts', () => {
    // LAUNCH_PLAN.md decision D2: internal alerts/alert_rules persistence is
    // cut from launch scope. checkAlerts must not read alert_rules from the
    // database nor INSERT INTO alerts — the tables are not in runMigrations().
    it('does not read alert_rules or persist alerts to the database (D2)', async() => {
      // Even with metrics collected there are no DB-backed rules to evaluate.
      await monitoringService.collectSystemMetrics();

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toEqual([]);
      const sqlCalls = (mockPoolInstance.query as jest.Mock).mock.calls.map(
        (call) => String(call[0]),
      );
      for (const sql of sqlCalls) {
        expect(sql).not.toMatch(/alert_rules/i);
        expect(sql).not.toMatch(/INSERT\s+INTO\s+alerts/i);
      }
    });

    it('should not generate alerts when metrics are within thresholds', async() => {
      // Mock normal memory usage
      const originalProcess = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 10, // 10MB
        heapTotal: 1024 * 1024 * 5,
        heapUsed: 1024 * 1024 * 3,
        external: 1024 * 1024 * 2,
        arrayBuffers: 1024 * 1024 * 1,
      }) as any;

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);

      // Restore original function
      process.memoryUsage = originalProcess;
    });
  });

  describe('getSystemStatus', () => {
    it('should return overall system status', async() => {
      const status = await monitoringService.getSystemStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('checks');
      expect(status.status).toMatch(/healthy|degraded|unhealthy/);
      expect(Array.isArray(status.checks)).toBe(true);
    });

    it('should return degraded status when some checks fail', async() => {
      // Mock one service failure
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Redis unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy'); // Redis failure should make it unhealthy, not degraded
    });

    it('should return unhealthy status when critical checks fail', async() => {
      // Mock database failure
      mockPoolInstance.query = jest.fn().mockRejectedValue(new Error('Database unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async() => {
      mockPoolInstance.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database connection failed');
    });

    it('should handle Redis errors gracefully', async() => {
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis connection failed');
    });

    it('should handle external API errors gracefully', async() => {
      // Mock fetch to simulate external API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('External API unavailable'));

      const healthChecks = await monitoringService.performHealthChecks();

      const apiChecks = healthChecks.filter(check => check.name === 'ShipEngine' || check.name === 'SendGrid' || check.name === 'Twilio');
      expect(apiChecks.length).toBeGreaterThan(0);
      expect(apiChecks.some(check => check.status === 'unhealthy')).toBe(true);
    });
  });
});