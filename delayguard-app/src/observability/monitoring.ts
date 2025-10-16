/**
 * Comprehensive Monitoring and Alerting System
 * Provides real-time monitoring, alerting, and health checks for DelayGuard
 */

import { delayGuardMetrics, withSpan, getTracer } from './tracing';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

export interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number[];
  };
  database: {
    connections: number;
    maxConnections: number;
    slowQueries: number;
  };
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
  };
  queue: {
    size: number;
    processing: number;
    failed: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, checkFn: () => Promise<HealthCheck>) {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];
    
    for (const [name, checkFn] of this.checks) {
      try {
        const tracer = getTracer('monitoring');
        const span = tracer.startSpan(`health.${name}`);
        const result = await withSpan(span, async() => {
          return await checkFn();
        });
        results.push(result);
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  }> {
    const checks = await this.runAllChecks();
    
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0) {
      status = 'degraded';
    }

    return { status, checks, summary };
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async() => {
      const start = Date.now();
      try {
        // Import database connection
        const { query } = await import('../database/connection');
        await query('SELECT 1');
        const responseTime = Date.now() - start;
        
        return {
          name: 'database',
          status: responseTime > 1000 ? 'degraded' : 'healthy',
          responseTime,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date(),
        };
      }
    });

    // Redis health check
    this.registerCheck('redis', async() => {
      const start = Date.now();
      try {
        // Import Redis connection
        const { redis } = await import('../queue/setup');
        await redis.ping();
        const responseTime = Date.now() - start;
        
        return {
          name: 'redis',
          status: responseTime > 500 ? 'degraded' : 'healthy',
          responseTime,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date(),
        };
      }
    });

    // External API health checks
    this.registerCheck('shopify-api', async() => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://api.shopify.com/health', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - start;
        
        return {
          name: 'shopify-api',
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'shopify-api',
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date(),
        };
      }
    });

    this.registerCheck('shipengine-api', async() => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://api.shipengine.com/health', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - start;
        
        return {
          name: 'shipengine-api',
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'shipengine-api',
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date(),
        };
      }
    });
  }
}

/**
 * System Metrics Service
 */
export class SystemMetricsService {
  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const tracer = getTracer('monitoring');
    const span = tracer.startSpan('system.metrics');
    return withSpan(span, async() => {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Database metrics
      const dbMetrics = await this.getDatabaseMetrics();
      
      // Redis metrics
      const redisMetrics = await this.getRedisMetrics();
      
      // Queue metrics
      const queueMetrics = await this.getQueueMetrics();

      return {
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        cpu: {
          usage: cpuUsage.user + cpuUsage.system,
          load: process.platform === 'win32' ? [] : require('os').loadavg(),
        },
        database: dbMetrics,
        redis: redisMetrics,
        queue: queueMetrics,
      };
    });
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics() {
    try {
      const { query } = await import('../database/connection');
      const result = await query(`
        SELECT 
          count(*) as connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
          count(*) FILTER (WHERE state = 'active' AND query_start < now() - interval '5 minutes') as slow_queries
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      const row = result.rows[0];
      return {
        connections: parseInt(row.connections),
        maxConnections: parseInt(row.max_connections),
        slowQueries: parseInt(row.slow_queries),
      };
    } catch (error) {
      return {
        connections: 0,
        maxConnections: 0,
        slowQueries: 0,
      };
    }
  }

  /**
   * Get Redis metrics
   */
  private async getRedisMetrics() {
    try {
      const { redis } = await import('../queue/setup');
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      
      return {
        connected: true,
        memory: parseInt(info.split('\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0'),
        keys: parseInt(keyspace.split('\n').find(line => line.startsWith('db0:'))?.split(':')[1]?.split(',')[0] || '0'),
      };
    } catch (error) {
      return {
        connected: false,
        memory: 0,
        keys: 0,
      };
    }
  }

  /**
   * Get queue metrics
   */
  private async getQueueMetrics() {
    try {
      const { delayCheckQueue, notificationQueue } = await import('../queue/setup');
      const [delayWaiting, delayActive, delayFailed] = await Promise.all([
        delayCheckQueue.getWaiting(),
        delayCheckQueue.getActive(),
        delayCheckQueue.getFailed(),
      ]);
      
      const [notifWaiting, notifActive, notifFailed] = await Promise.all([
        notificationQueue.getWaiting(),
        notificationQueue.getActive(),
        notificationQueue.getFailed(),
      ]);
      
      const waiting = [...delayWaiting, ...notifWaiting];
      const active = [...delayActive, ...notifActive];
      const failed = [...delayFailed, ...notifFailed];
      
      return {
        size: waiting.length,
        processing: active.length,
        failed: failed.length,
      };
    } catch (error) {
      return {
        size: 0,
        processing: 0,
        failed: 0,
      };
    }
  }
}

/**
 * Alerting Service
 */
export class AlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: Array<{
    ruleId: string;
    triggered: Date;
    resolved?: Date;
    message: string;
  }> = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
  }

  /**
   * Check all alert rules
   */
  async checkAlerts(): Promise<Array<{
    rule: AlertRule;
    triggered: boolean;
    message: string;
  }>> {
    const results = [];
    
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      try {
        const triggered = await this.evaluateRule(rule);
        if (triggered) {
          const message = this.generateAlertMessage(rule);
          results.push({ rule, triggered, message });
          
          // Record alert
          this.alertHistory.push({
            ruleId,
            triggered: new Date(),
            message,
          });
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${ruleId}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    // Check cooldown
    if (rule.lastTriggered) {
      const cooldownMs = rule.cooldown * 60 * 1000;
      if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
        return false;
      }
    }

    // Evaluate condition based on rule type
    switch (rule.condition) {
      case 'error_rate_high':
        return await this.checkErrorRate(rule.threshold);
      case 'response_time_high':
        return await this.checkResponseTime(rule.threshold);
      case 'memory_usage_high':
        return await this.checkMemoryUsage(rule.threshold);
      case 'queue_size_large':
        return await this.checkQueueSize(rule.threshold);
      case 'database_connections_high':
        return await this.checkDatabaseConnections(rule.threshold);
      default:
        return false;
    }
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(_threshold: number): Promise<boolean> {
    // This would integrate with your metrics system
    // For now, return false as placeholder
    return false;
  }

  /**
   * Check response time
   */
  private async checkResponseTime(_threshold: number): Promise<boolean> {
    // This would integrate with your metrics system
    // For now, return false as placeholder
    return false;
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(threshold: number): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    return percentage > threshold;
  }

  /**
   * Check queue size
   */
  private async checkQueueSize(threshold: number): Promise<boolean> {
    try {
      const { delayCheckQueue, notificationQueue } = await import('../queue/setup');
      const [delayWaiting, notifWaiting] = await Promise.all([
        delayCheckQueue.getWaiting(),
        notificationQueue.getWaiting(),
      ]);
      const waiting = [...delayWaiting, ...notifWaiting];
      return waiting.length > threshold;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check database connections
   */
  private async checkDatabaseConnections(threshold: number): Promise<boolean> {
    try {
      const { query } = await import('../database/connection');
      const result = await query('SELECT count(*) as connections FROM pg_stat_activity WHERE state = \'active\'');
      const connections = parseInt(result.rows[0].connections);
      return connections > threshold;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule): string {
    return `Alert: ${rule.name} - Threshold exceeded (${rule.threshold})`;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules() {
    // High error rate
    this.addRule({
      id: 'error_rate_high',
      name: 'High Error Rate',
      condition: 'error_rate_high',
      threshold: 5, // 5% error rate
      severity: 'critical',
      enabled: true,
      cooldown: 15, // 15 minutes
    });

    // High response time
    this.addRule({
      id: 'response_time_high',
      name: 'High Response Time',
      condition: 'response_time_high',
      threshold: 2000, // 2 seconds
      severity: 'warning',
      enabled: true,
      cooldown: 10, // 10 minutes
    });

    // High memory usage
    this.addRule({
      id: 'memory_usage_high',
      name: 'High Memory Usage',
      condition: 'memory_usage_high',
      threshold: 80, // 80%
      severity: 'warning',
      enabled: true,
      cooldown: 5, // 5 minutes
    });

    // Large queue size
    this.addRule({
      id: 'queue_size_large',
      name: 'Large Queue Size',
      condition: 'queue_size_large',
      threshold: 1000, // 1000 jobs
      severity: 'warning',
      enabled: true,
      cooldown: 10, // 10 minutes
    });

    // High database connections
    this.addRule({
      id: 'database_connections_high',
      name: 'High Database Connections',
      condition: 'database_connections_high',
      threshold: 80, // 80% of max connections
      severity: 'critical',
      enabled: true,
      cooldown: 5, // 5 minutes
    });
  }
}

/**
 * Monitoring Service - Main orchestrator
 */
export class MonitoringService {
  private healthCheckService: HealthCheckService;
  private metricsService: SystemMetricsService;
  private alertingService: AlertingService;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.healthCheckService = new HealthCheckService();
    this.metricsService = new SystemMetricsService();
    this.alertingService = new AlertingService();
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 60000) { // Default 1 minute
    this.intervalId = setInterval(async() => {
      await this.runMonitoringCycle();
    }, intervalMs);
    
    console.log('Monitoring service started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    console.log('Monitoring service stopped');
  }

  /**
   * Run a complete monitoring cycle
   */
  async runMonitoringCycle() {
    try {
      // Run health checks
      const health = await this.healthCheckService.getSystemHealth();
      
      // Get system metrics
      const metrics = await this.metricsService.getSystemMetrics();
      
      // Check alerts
      const alerts = await this.alertingService.checkAlerts();
      
      // Process alerts
      for (const alert of alerts) {
        if (alert.triggered) {
          await this.handleAlert(alert);
        }
      }
      
      // Update metrics
      delayGuardMetrics.updateQueueSize('delay-check', metrics.queue.size);
      
      console.log(`Monitoring cycle completed - Health: ${health.status}, Alerts: ${alerts.length}`);
      
    } catch (error) {
      console.error('Error in monitoring cycle:', error);
    }
  }

  /**
   * Handle triggered alerts
   */
  private async handleAlert(alert: { rule: AlertRule; triggered: boolean; message: string }) {
    console.log(`ALERT: ${alert.message}`);
    
    // Here you would integrate with your alerting system
    // e.g., send to PagerDuty, Slack, email, etc.
    
    // For now, just log the alert
    console.log(`Alert triggered: ${alert.rule.name} (${alert.rule.severity})`);
  }

  /**
   * Get current system status
   */
  async getSystemStatus() {
    const health = await this.healthCheckService.getSystemHealth();
    const metrics = await this.metricsService.getSystemMetrics();
    
    return {
      health,
      metrics,
      timestamp: new Date(),
    };
  }
}

// Export singleton instances
export const healthCheckService = new HealthCheckService();
export const metricsService = new SystemMetricsService();
export const alertingService = new AlertingService();
export const monitoringService = new MonitoringService();
