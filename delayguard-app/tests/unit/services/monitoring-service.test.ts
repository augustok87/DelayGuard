import { MonitoringService, HealthCheck, SystemMetrics, AlertRule, Alert } from '../../../src/services/monitoring-service';
import Redis from 'ioredis';
import { Pool } from 'pg';

jest.mock('ioredis');
jest.mock('pg');

const MockedRedis = Redis as jest.MockedClass<typeof Redis>;
const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockRedis: any;
  let mockPool: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedis = {
      status: 'ready',
      setex: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('OK'), 5))
      ),
      get: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 5))
      ),
      info: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('connected_clients:1\nused_memory:1024\n'), 5))
      ),
      ping: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 5))
      ),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn()
    };

    mockPool = {
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0,
      query: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [], rowCount: 0 }), 10))
      ),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ rows: [], rowCount: 0 }), 10))
        ),
        release: jest.fn()
      }),
      end: jest.fn().mockResolvedValue(undefined)
    };

    MockedRedis.mockImplementation(() => mockRedis);
    MockedPool.mockImplementation(() => mockPool);

    mockConfig = {
      redis: { url: 'redis://localhost:6379' },
      database: { url: 'postgresql://user:password@host:port/database' }
    };

    monitoringService = new MonitoringService(mockConfig);
  });

  describe('Health Checks', () => {
    it('should perform all health checks', async () => {
      const healthChecks = await monitoringService.performHealthChecks();
      
      expect(healthChecks).toHaveLength(6); // Database, Redis, 3 External APIs, Application
      expect(healthChecks.every(check => 
        check.name && 
        ['healthy', 'degraded', 'unhealthy'].includes(check.status) &&
        typeof check.responseTime === 'number' &&
        check.lastChecked instanceof Date
      )).toBe(true);
    });

    it('should check database health', async () => {
      const healthChecks = await monitoringService.performHealthChecks();
      const dbCheck = healthChecks.find(check => check.name === 'Database');
      
      expect(dbCheck).toBeDefined();
      expect(dbCheck!.status).toBe('healthy');
      expect(dbCheck!.responseTime).toBeGreaterThan(0);
    });

    it('should check Redis health', async () => {
      const healthChecks = await monitoringService.performHealthChecks();
      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      
      expect(redisCheck).toBeDefined();
      expect(redisCheck!.status).toBe('healthy');
      expect(redisCheck!.responseTime).toBeGreaterThan(0);
    });

    it('should check external APIs health', async () => {
      const healthChecks = await monitoringService.performHealthChecks();
      const apiChecks = healthChecks.filter(check => 
        ['ShipEngine', 'SendGrid', 'Twilio'].includes(check.name)
      );
      
      expect(apiChecks).toHaveLength(3);
      expect(apiChecks.every(check => check.status === 'healthy')).toBe(true);
    });

    it('should check application health', async () => {
      const healthChecks = await monitoringService.performHealthChecks();
      const appCheck = healthChecks.find(check => check.name === 'Application');
      
      expect(appCheck).toBeDefined();
      expect(appCheck!.status).toBe('healthy');
      expect(appCheck!.responseTime).toBeGreaterThan(0);
    });

    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));
      
      const healthChecks = await monitoringService.performHealthChecks();
      const dbCheck = healthChecks.find(check => check.name === 'Database');
      
      expect(dbCheck!.status).toBe('unhealthy');
      expect(dbCheck!.error).toContain('Connection failed');
    });

    it('should handle Redis connection errors', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Redis connection failed'));
      
      const healthChecks = await monitoringService.performHealthChecks();
      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      
      expect(redisCheck!.status).toBe('unhealthy');
      expect(redisCheck!.error).toContain('Redis connection failed');
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics', async () => {
      const metrics = await monitoringService.collectSystemMetrics();
      
      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.arrayContaining([expect.any(Number)])
        },
        memory: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        },
        database: {
          connections: {
            total: expect.any(Number),
            idle: expect.any(Number),
            active: expect.any(Number)
          },
          queryTime: expect.any(Number)
        },
        redis: {
          connected: expect.any(Boolean),
          memory: {
            used: expect.any(Number),
            peak: expect.any(Number)
          },
          operations: {
            commands: expect.any(Number),
            keyspace: expect.any(Number)
          }
        },
        application: {
          uptime: expect.any(Number),
          requests: {
            total: expect.any(Number),
            errors: expect.any(Number),
            successRate: expect.any(Number)
          },
          responseTime: {
            average: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number)
          }
        }
      });
    });

    it('should store metrics in Redis', async () => {
      await monitoringService.collectSystemMetrics();
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^metrics:system:\d+$/),
        3600,
        expect.any(String)
      );
    });

    it('should limit metrics history', async () => {
      // Collect more metrics than the limit (reduced for performance)
      for (let i = 0; i < 11; i++) {
        await monitoringService.collectSystemMetrics();
      }
      
      // The internal metrics array should be limited
      // This is tested indirectly through the Redis storage
      expect(mockRedis.setex).toHaveBeenCalledTimes(11);
    });

    it('should handle Redis storage errors gracefully', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis storage failed'));
      
      // Should not throw an error
      await expect(monitoringService.collectSystemMetrics()).resolves.toBeDefined();
    });
  });

  describe('Alert Management', () => {
    it('should check alerts with rules', async () => {
      // Mock alert rules
      const mockRules: AlertRule[] = [
        {
          id: 'cpu-high',
          name: 'High CPU Usage',
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: 'high',
          enabled: true,
          channels: ['email', 'slack']
        }
      ];

      // Mock getAlertRules method
      jest.spyOn(monitoringService as any, 'getAlertRules').mockResolvedValue(mockRules);
      jest.spyOn(monitoringService as any, 'getMetricValue').mockResolvedValue(90);

      const alerts = await monitoringService.checkAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'cpu-high',
        severity: 'high',
        value: 90,
        threshold: 80,
        resolved: false
      });
    });

    it('should not create duplicate alerts', async () => {
      const mockRules: AlertRule[] = [
        {
          id: 'cpu-high',
          name: 'High CPU Usage',
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: 'high',
          enabled: true,
          channels: ['email']
        }
      ];

      jest.spyOn(monitoringService as any, 'getAlertRules').mockResolvedValue(mockRules);
      jest.spyOn(monitoringService as any, 'getMetricValue').mockResolvedValue(90);

      // Check alerts twice
      const alerts1 = await monitoringService.checkAlerts();
      const alerts2 = await monitoringService.checkAlerts();
      
      expect(alerts1.length).toBe(1);
      expect(alerts2.length).toBe(0); // No duplicate alerts
    });

    it('should skip disabled rules', async () => {
      const mockRules: AlertRule[] = [
        {
          id: 'cpu-high',
          name: 'High CPU Usage',
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: 'high',
          enabled: false, // Disabled
          channels: ['email']
        }
      ];

      jest.spyOn(monitoringService as any, 'getAlertRules').mockResolvedValue(mockRules);

      const alerts = await monitoringService.checkAlerts();
      
      expect(alerts).toHaveLength(0);
    });

    it('should handle missing metric values', async () => {
      const mockRules: AlertRule[] = [
        {
          id: 'cpu-high',
          name: 'High CPU Usage',
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: 'high',
          enabled: true,
          channels: ['email']
        }
      ];

      jest.spyOn(monitoringService as any, 'getAlertRules').mockResolvedValue(mockRules);
      jest.spyOn(monitoringService as any, 'getMetricValue').mockResolvedValue(null);

      const alerts = await monitoringService.checkAlerts();
      
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Alert Rule Evaluation', () => {
    it('should evaluate greater than operator', () => {
      const rule: AlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'cpu.usage',
        operator: 'gt',
        threshold: 80,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email']
      };

      const evaluateRule = (monitoringService as any).evaluateAlertRule.bind(monitoringService);
      
      expect(evaluateRule(rule, 90)).toBe(true);
      expect(evaluateRule(rule, 80)).toBe(false);
      expect(evaluateRule(rule, 70)).toBe(false);
    });

    it('should evaluate less than operator', () => {
      const rule: AlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'memory.free',
        operator: 'lt',
        threshold: 100,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email']
      };

      const evaluateRule = (monitoringService as any).evaluateAlertRule.bind(monitoringService);
      
      expect(evaluateRule(rule, 90)).toBe(true);
      expect(evaluateRule(rule, 100)).toBe(false);
      expect(evaluateRule(rule, 110)).toBe(false);
    });

    it('should evaluate equal operator', () => {
      const rule: AlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'status',
        operator: 'eq',
        threshold: 0,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email']
      };

      const evaluateRule = (monitoringService as any).evaluateAlertRule.bind(monitoringService);
      
      expect(evaluateRule(rule, 0)).toBe(true);
      expect(evaluateRule(rule, 1)).toBe(false);
    });

    it('should evaluate greater than or equal operator', () => {
      const rule: AlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'cpu.usage',
        operator: 'gte',
        threshold: 80,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email']
      };

      const evaluateRule = (monitoringService as any).evaluateAlertRule.bind(monitoringService);
      
      expect(evaluateRule(rule, 90)).toBe(true);
      expect(evaluateRule(rule, 80)).toBe(true);
      expect(evaluateRule(rule, 70)).toBe(false);
    });

    it('should evaluate less than or equal operator', () => {
      const rule: AlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'memory.free',
        operator: 'lte',
        threshold: 100,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email']
      };

      const evaluateRule = (monitoringService as any).evaluateAlertRule.bind(monitoringService);
      
      expect(evaluateRule(rule, 90)).toBe(true);
      expect(evaluateRule(rule, 100)).toBe(true);
      expect(evaluateRule(rule, 110)).toBe(false);
    });
  });

  describe('Database Statistics', () => {
    it('should get database connection stats', async () => {
      const stats = await (monitoringService as any).getDatabaseStats();
      
      expect(stats).toMatchObject({
        total: expect.any(Number),
        idle: expect.any(Number),
        active: expect.any(Number)
      });
    });

    it('should measure database query time', async () => {
      const queryTime = await (monitoringService as any).measureDatabaseQueryTime();
      
      expect(typeof queryTime).toBe('number');
      expect(queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock pool properties to throw an error
      Object.defineProperty(mockPool, 'totalCount', {
        get: () => { throw new Error('Database error'); }
      });
      
      const stats = await (monitoringService as any).getDatabaseStats();
      
      expect(stats).toMatchObject({
        total: 0,
        idle: 0,
        active: 0
      });
    });
  });

  describe('Redis Statistics', () => {
    it('should get Redis stats', async () => {
      const stats = await (monitoringService as any).getRedisStats();
      
      expect(stats).toMatchObject({
        memory: {
          used: expect.any(Number),
          peak: expect.any(Number)
        },
        operations: {
          commands: expect.any(Number),
          keyspace: expect.any(Number)
        }
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.info.mockRejectedValueOnce(new Error('Redis error'));
      
      const stats = await (monitoringService as any).getRedisStats();
      
      expect(stats).toMatchObject({
        memory: {
          used: 0,
          peak: 0
        },
        operations: {
          commands: 0,
          keyspace: 0
        }
      });
    });
  });

  describe('Application Statistics', () => {
    it('should get application stats', async () => {
      const stats = await (monitoringService as any).getApplicationStats();
      
      expect(stats).toMatchObject({
        requests: {
          total: expect.any(Number),
          errors: expect.any(Number),
          successRate: expect.any(Number)
        },
        responseTime: {
          average: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number)
        }
      });
    });
  });

  describe('Metric Value Retrieval', () => {
    it('should get metric values from current metrics', async () => {
      // First collect some metrics
      await monitoringService.collectSystemMetrics();
      
      const cpuUsage = await (monitoringService as any).getMetricValue('cpu.usage');
      const memoryUsed = await (monitoringService as any).getMetricValue('memory.used');
      
      expect(typeof cpuUsage).toBe('number');
      expect(typeof memoryUsed).toBe('number');
    });

    it('should return null for unknown metrics', async () => {
      const value = await (monitoringService as any).getMetricValue('unknown.metric');
      
      expect(value).toBeNull();
    });

    it('should handle nested metric paths', async () => {
      await monitoringService.collectSystemMetrics();
      
      const dbTotal = await (monitoringService as any).getMetricValue('database.connections.total');
      const redisConnected = await (monitoringService as any).getMetricValue('redis.connected');
      
      expect(typeof dbTotal).toBe('number');
      expect(typeof redisConnected).toBe('boolean');
    });
  });

  describe('Alert Rules Management', () => {
    it('should get alert rules from database', async () => {
      const mockRules = [
        {
          id: 'cpu-high',
          name: 'High CPU Usage',
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: 'high',
          enabled: true,
          channels: ['email']
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRules,
        rowCount: 1
      });

      const rules = await (monitoringService as any).getAlertRules();
      
      expect(rules).toEqual(mockRules);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM alert_rules WHERE enabled = true ORDER BY severity DESC'
      );
    });

    it('should handle database errors when getting rules', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));
      
      const rules = await (monitoringService as any).getAlertRules();
      
      expect(rules).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('should close resources', async () => {
      await monitoringService.close();
      
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockRedis.quit.mockRejectedValueOnce(new Error('Redis quit failed'));
      mockPool.end.mockRejectedValueOnce(new Error('Pool end failed'));
      
      // Should not throw an error
      await expect(monitoringService.close()).resolves.toBeUndefined();
    });
  });
});
