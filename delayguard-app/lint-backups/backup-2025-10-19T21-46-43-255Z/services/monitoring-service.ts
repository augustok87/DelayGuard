import Redis from 'ioredis';
import { Pool } from 'pg';
import { AppConfig } from '../types';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  error?: string;
  details?: any;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: {
      total: number;
      idle: number;
      active: number;
    };
    queryTime: number;
  };
  redis: {
    connected: boolean;
    memory: {
      used: number;
      peak: number;
    };
    operations: {
      commands: number;
      keyspace: number;
    };
  };
  application: {
    uptime: number;
    requests: {
      total: number;
      errors: number;
      successRate: number;
    };
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: any;
}

export class MonitoringService {
  private redis: any;
  private db: Pool;
  private alerts: Map<string, Alert> = new Map();
  private metrics: SystemMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(config: AppConfig) {
    this.redis = new Redis(config.redis.url);
    this.db = new Pool({ connectionString: config.database.url });
  }

  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database health check
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Redis health check
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // External APIs health check
    const apiChecks = await this.checkExternalAPIs();
    checks.push(...apiChecks);

    // Application health check
    const appCheck = await this.checkApplication();
    checks.push(appCheck);

    return checks;
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();
    const uptime = process.uptime();

    // CPU metrics
    const cpuUsage = process.cpuUsage();
    const loadAverage = process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg();

    // Memory metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();

    // Database metrics
    const dbStats = await this.getDatabaseStats();
    const dbQueryTime = await this.measureDatabaseQueryTime();

    // Redis metrics
    const redisStats = await this.getRedisStats();

    // Application metrics
    const appStats = await this.getApplicationStats();

    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to seconds
        loadAverage,
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100),
      },
      database: {
        connections: dbStats,
        queryTime: dbQueryTime,
      },
      redis: {
        connected: this.redis.status === 'ready',
        memory: redisStats.memory,
        operations: redisStats.operations,
      },
      application: {
        uptime,
        requests: appStats.requests,
        responseTime: appStats.responseTime,
      },
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Store in Redis for persistence
    try {
      await this.redis.setex(
        `metrics:system:${timestamp.getTime()}`,
        3600, // 1 hour TTL
        JSON.stringify(metrics),
      );
    } catch (error) {
      // Log error but don't fail the metrics collection
      console.warn('Failed to store metrics in Redis:', error);
    }

    return metrics;
  }

  async checkAlerts(): Promise<Alert[]> {
    const newAlerts: Alert[] = [];
    const rules = await this.getAlertRules();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const value = await this.getMetricValue(rule.metric);
      if (value === null || typeof value !== 'number') continue;

      const shouldAlert = this.evaluateAlertRule(rule, value);
      if (shouldAlert) {
        const alertId = `${rule.id}:${Date.now()}`;
        const existingAlert = this.alerts.get(alertId);

        if (!existingAlert) {
          const alert: Alert = {
            id: alertId,
            ruleId: rule.id,
            severity: rule.severity,
            message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
            value,
            threshold: rule.threshold,
            timestamp: new Date(),
            resolved: false,
            metadata: { rule },
          };

          this.alerts.set(alertId, alert);
          newAlerts.push(alert);

          // Send alert notifications
          await this.sendAlertNotification(alert);
        }
      }
    }

    return newAlerts;
  }

  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    metrics: SystemMetrics | null;
    alerts: Alert[];
  }> {
    const checks = await this.performHealthChecks();
    const metrics = this.metrics[this.metrics.length - 1] || null;
    const alerts = Array.from(this.alerts.values()).filter(a => !a.resolved);

    // Determine overall status
    const unhealthyChecks = checks.filter(c => c.status === 'unhealthy');
    const degradedChecks = checks.filter(c => c.status === 'degraded');
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyChecks.length > 0) {
      status = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      status = 'degraded';
    }

    return { status, checks, metrics, alerts };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await this.db.query('SELECT 1 as health_check');
      const responseTime = Date.now() - start;
      
      return {
        name: 'Database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        details: { query: 'SELECT 1' },
      };
    } catch (error) {
      return {
        name: 'Database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      return {
        name: 'Redis',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        details: { status: this.redis.status },
      };
    } catch (error) {
      return {
        name: 'Redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    const apis = [
      { name: 'ShipEngine', url: 'https://api.shipengine.com/v1/rates' },
      { name: 'SendGrid', url: 'https://api.sendgrid.com/v3/mail/send' },
      { name: 'Twilio', url: 'https://api.twilio.com/2010-04-01/Accounts' },
    ];

    for (const api of apis) {
      const start = Date.now();
      
      try {
        // Simple HEAD request to check availability
        const response = await fetch(api.url, { method: 'HEAD' });
        const responseTime = Date.now() - start;
        
        checks.push({
          name: api.name,
          status: response.ok && responseTime < 5000 ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date(),
          details: { status: response.status },
        });
      } catch (error) {
        checks.push({
          name: api.name,
          status: 'unhealthy',
          responseTime: Date.now() - start,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return checks;
  }

  private async checkApplication(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // Check if application is responsive
      // Add a small delay to simulate actual processing time
      await new Promise(resolve => setTimeout(resolve, 1));
      const responseTime = Date.now() - start;
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / require('os').totalmem()) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (memoryPercentage > 90) {
        status = 'unhealthy';
      } else if (memoryPercentage > 80) {
        status = 'degraded';
      }
      
      return {
        name: 'Application',
        status,
        responseTime,
        lastChecked: new Date(),
        details: {
          uptime: process.uptime(),
          memoryPercentage: Math.round(memoryPercentage),
          nodeVersion: process.version,
        },
      };
    } catch (error) {
      return {
        name: 'Application',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getDatabaseStats(): Promise<{ total: number; idle: number; active: number }> {
    try {
      return {
        total: this.db.totalCount,
        idle: this.db.idleCount,
        active: this.db.totalCount - this.db.idleCount,
      };
    } catch {
      return { total: 0, idle: 0, active: 0 };
    }
  }

  private async measureDatabaseQueryTime(): Promise<number> {
    const start = Date.now();
    try {
      await this.db.query('SELECT 1');
      return Date.now() - start;
    } catch {
      return -1;
    }
  }

  private async getRedisStats(): Promise<{
    memory: { used: number; peak: number };
    operations: { commands: number; keyspace: number };
  }> {
    try {
      const info = await this.redis.info('memory');
      const used = info.match(/used_memory:(\d+)/)?.[1] || '0';
      const peak = info.match(/used_memory_peak:(\d+)/)?.[1] || '0';
      
      const keyspace = await this.redis.dbsize();
      
      return {
        memory: {
          used: Math.round(parseInt(used) / 1024 / 1024), // MB
          peak: Math.round(parseInt(peak) / 1024 / 1024), // MB
        },
        operations: {
          commands: 0, // Would need to track this
          keyspace,
        },
      };
    } catch {
      return {
        memory: { used: 0, peak: 0 },
        operations: { commands: 0, keyspace: 0 },
      };
    }
  }

  private async getApplicationStats(): Promise<{
    requests: { total: number; errors: number; successRate: number };
    responseTime: { average: number; p95: number; p99: number };
  }> {
    // This would typically come from your application metrics
    // For now, return mock data
    return {
      requests: {
        total: 1000,
        errors: 10,
        successRate: 99,
      },
      responseTime: {
        average: 45,
        p95: 120,
        p99: 200,
      },
    };
  }

  private async getAlertRules(): Promise<AlertRule[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM alert_rules WHERE enabled = true ORDER BY severity DESC',
      );
      return result.rows;
    } catch (error) {
      // Return empty array if database query fails
      return [];
    }
  }

  private async getMetricValue(metric: string): Promise<number | boolean | null> {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return null;

    const parts = metric.split('.');
    let value: any = latestMetrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return (typeof value === 'number' || typeof value === 'boolean') ? value : null;
  }

  private evaluateAlertRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'eq': return value === rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lte': return value <= rule.threshold;
      default: return false;
    }
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    // This would integrate with your notification services
    console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Store alert in database
    try {
      await this.db.query(`
        INSERT INTO alerts (id, rule_id, severity, message, value, threshold, timestamp, resolved)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        alert.id,
        alert.ruleId,
        alert.severity,
        alert.message,
        alert.value,
        alert.threshold,
        alert.timestamp,
        alert.resolved,
      ]);
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  async close(): Promise<void> {
    try {
      await Promise.all([
        this.redis.quit(),
        this.db.end(),
      ]);
    } catch (error) {
      // Log error but don't throw
      console.warn('Error closing monitoring service:', error);
    }
  }
}
