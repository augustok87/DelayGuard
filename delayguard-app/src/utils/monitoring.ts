/* eslint-disable @typescript-eslint/no-explicit-any */
// Comprehensive monitoring utility with dynamic metric collection
import { query } from "../database/connection";
import { logger } from "../utils/logger";

interface ErrorMetrics {
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
  severity: "low" | "medium" | "high" | "critical";
  shopDomain?: string;
  userId?: string;
}

interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  shopDomain?: string;
}

interface AlertThresholds {
  errorRate: number; // errors per minute
  responseTime: number; // milliseconds
  queueSize: number; // number of pending jobs
  memoryUsage: number; // percentage
}

class MonitoringService {
  private errorCounts: Map<string, number> = new Map();
  private performanceMetrics: PerformanceMetrics[] = [];
  private alertThresholds: AlertThresholds;

  constructor() {
    this.alertThresholds = {
      errorRate: 10, // 10 errors per minute
      responseTime: 5000, // 5 seconds
      queueSize: 100, // 100 pending jobs
      memoryUsage: 80, // 80% memory usage
    };
  }

  // Error tracking
  async trackError(
    error: Error,
    context?: any,
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ): Promise<void> {
    const errorMetrics: ErrorMetrics = {
      timestamp: new Date(),
      errorType: error.constructor.name,
      errorMessage: error.message,
      stackTrace: error.stack || "",
      context,
      severity,
      shopDomain: context?.shopDomain,
      userId: context?.userId,
    };

    // Log to console with appropriate level
    this.logError(errorMetrics);

    // Store in database for analysis
    await this.storeError(errorMetrics);

    // Check for alert conditions
    await this.checkErrorAlerts(errorMetrics);
  }

  // Performance tracking
  async trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    context?: any,
  ): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      operation,
      duration,
      success,
      shopDomain: context?.shopDomain,
    };

    this.performanceMetrics.push(metrics);

    // Keep only last 1000 metrics in memory
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Check for performance alerts
    await this.checkPerformanceAlerts(metrics);
  }

  // Performance decorator
  static trackPerformance(operation: string) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: unknown[]) {
        const start = Date.now();
        let success = true;
        let error: Error | null = null;

        try {
          const result = await method.apply(this, args);
          return result;
        } catch (err) {
          success = false;
          error = err as Error;
          throw err;
        } finally {
          const duration = Date.now() - start;
          const monitoring = new MonitoringService();
          await monitoring.trackPerformance(operation, duration, success, {
            method: propertyName,
            className: target.constructor.name,
            error: error?.message,
          });
        }
      };
    };
  }

  // Health check
  async getHealthStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: {
      database: boolean;
      redis: boolean;
      externalAPIs: boolean;
      queue: boolean;
    };
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      queueSize: number;
      memoryUsage: number;
    };
  }> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      externalAPIs: await this.checkExternalAPIs(),
      queue: await this.checkQueue(),
    };

    const metrics = await this.getCurrentMetrics();

    const status = this.determineHealthStatus(checks, metrics);

    return {
      status,
      checks,
      metrics,
    };
  }

  // Alert management
  async checkErrorAlerts(error: ErrorMetrics): Promise<void> {
    const errorKey = `${error.errorType}:${error.shopDomain || "global"}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check if error rate exceeds threshold
    if (currentCount + 1 > this.alertThresholds.errorRate) {
      await this.sendAlert("high_error_rate", {
        errorType: error.errorType,
        count: currentCount + 1,
        shopDomain: error.shopDomain,
        threshold: this.alertThresholds.errorRate,
      });
    }

    // Check for critical errors
    if (error.severity === "critical") {
      await this.sendAlert("critical_error", {
        errorType: error.errorType,
        message: error.errorMessage,
        shopDomain: error.shopDomain,
        stackTrace: error.stackTrace || "",
      });
    }
  }

  async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    // Check response time
    if (metrics.duration > this.alertThresholds.responseTime) {
      await this.sendAlert("slow_response", {
        operation: metrics.operation,
        duration: metrics.duration,
        threshold: this.alertThresholds.responseTime,
        shopDomain: metrics.shopDomain,
      });
    }

    // Check success rate
    const recentMetrics = this.performanceMetrics.slice(-100); // Last 100 operations
    const successRate =
      recentMetrics.filter((m) => m.success).length / recentMetrics.length;

    if (successRate < 0.9) {
      // Less than 90% success rate
      await this.sendAlert("low_success_rate", {
        successRate,
        operation: metrics.operation,
        shopDomain: metrics.shopDomain,
      });
    }
  }

  // Private methods
  private logError(error: ErrorMetrics): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.errorType}: ${error.errorMessage}`;
    const errorContext = {
      errorType: error.errorType,
      shopDomain: error.shopDomain,
      userId: error.userId,
    };

    switch (error.severity) {
      case "critical":
        logger.error(logMessage, undefined, errorContext);
        break;
      case "high":
        logger.error(logMessage, undefined, errorContext);
        break;
      case "medium":
        logger.warn(logMessage, errorContext);
        break;
      case "low":
        logger.info(logMessage, errorContext);
        break;
    }
  }

  private async storeError(error: ErrorMetrics): Promise<void> {
    try {
      await query(
        `
        INSERT INTO error_logs (
          timestamp, error_type, error_message, stack_trace, 
          context, severity, shop_domain, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          error.timestamp,
          error.errorType,
          error.errorMessage,
          error.stackTrace || "",
          JSON.stringify(error.context),
          error.severity,
          error.shopDomain,
          error.userId,
        ],
      );
    } catch (err) {
      logger.error("Failed to store error in database:", err as Error);
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const { redis } = await import("../queue/setup");
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkExternalAPIs(): Promise<boolean> {
    try {
      // Test ShipEngine API
      const { CarrierService } = await import("../services/carrier-service");
      const carrierService = new CarrierService();
      await carrierService.getCarrierList();
      return true;
    } catch {
      return false;
    }
  }

  private async checkQueue(): Promise<boolean> {
    try {
      const { getQueueStats } = await import("../queue/setup");
      await getQueueStats();
      return true;
    } catch {
      return false;
    }
  }

  private async getCurrentMetrics(): Promise<{
    errorRate: number;
    averageResponseTime: number;
    queueSize: number;
    memoryUsage: number;
  }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Calculate error rate
    const errorCount = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const errorRate = errorCount; // errors in last minute

    // Calculate average response time
    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp > oneMinuteAgo,
    );
    const averageResponseTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length
        : 0;

    // Get queue size
    let queueSize = 0;
    try {
      const { getQueueStats } = await import("../queue/setup");
      const stats = await getQueueStats();
      queueSize = stats.delayCheck.waiting + stats.notifications.waiting;
    } catch {
      queueSize = 0;
    }

    // Get memory usage
    const memoryUsage =
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;

    return {
      errorRate,
      averageResponseTime,
      queueSize,
      memoryUsage,
    };
  }

  private determineHealthStatus(
    checks: {
      database: boolean;
      redis: boolean;
      externalAPIs: boolean;
      queue: boolean;
    },
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      queueSize: number;
      memoryUsage: number;
    },
  ): "healthy" | "degraded" | "unhealthy" {
    const criticalChecks = [checks.database, checks.redis];
    const allChecks = Object.values(checks);

    // Unhealthy if critical systems are down
    if (!criticalChecks.every((check) => check)) {
      return "unhealthy";
    }

    // Degraded if some systems are down or metrics are poor
    if (
      !allChecks.every((check) => check) ||
      metrics.errorRate > this.alertThresholds.errorRate ||
      metrics.averageResponseTime > this.alertThresholds.responseTime ||
      metrics.memoryUsage > this.alertThresholds.memoryUsage
    ) {
      return "degraded";
    }

    return "healthy";
  }

  private async sendAlert(
    type: string,
    data: Record<string, any>,
  ): Promise<void> {
    logger.error(
      `🚨 ALERT: ${type}`,
      undefined,
      data as Record<string, unknown>,
    );

    // In production, this would send to monitoring service (e.g., Sentry, PagerDuty)
    // For now, we'll just log and store in database
    try {
      await query(
        `
        INSERT INTO alerts (type, data, created_at)
        VALUES ($1, $2, $3)
      `,
        [type, JSON.stringify(data), new Date()],
      );
    } catch (err) {
      logger.error("Failed to store alert:", err as Error);
    }
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export decorator for easy use
export const trackPerformance = MonitoringService.trackPerformance;
