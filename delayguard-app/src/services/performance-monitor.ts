/* eslint-disable @typescript-eslint/no-explicit-any */
// Performance monitoring service with dynamic metric tracking
import { Redis } from "ioredis";
import { AppConfig } from "../types";

export interface PerformanceMetrics {
  responseTime: number;
  successRate: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  queueSize: number;
  processingRate: number;
  timestamp: Date;
}

export class PerformanceMonitor {
  private redis: Redis;
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  constructor(config: AppConfig) {
    this.redis = new Redis(config.redis.url);
  }

  async trackRequest(
    operation: string,
    duration: number,
    success: boolean,
    context?: any,
  ): Promise<void> {
    const timestamp = Date.now();
    const key = `metrics:${operation}`;

    // Store in Redis with TTL
    await this.redis.hset(key, {
      duration: duration.toString(),
      success: success.toString(),
      timestamp: timestamp.toString(),
      context: context ? JSON.stringify(context) : "",
    });

    // Set TTL to 1 hour
    await this.redis.expire(key, 3600);

    // Update in-memory metrics
    this.updateInMemoryMetrics(operation, duration, success);
  }

  async getPerformanceMetrics(operation?: string): Promise<PerformanceMetrics> {
    const now = new Date();
    const memoryUsage = process.memoryUsage();

    let responseTime = 0;
    let successRate = 100;
    let errorRate = 0;
    let queueSize = 0;
    let processingRate = 0;

    if (operation) {
      const metrics = await this.getOperationMetrics(operation);
      responseTime = metrics.averageResponseTime;
      successRate = metrics.successRate;
      errorRate = metrics.errorRate;
    } else {
      // Get overall metrics
      const allOperations = await this.getAllOperations();
      const allMetrics = await Promise.all(
        allOperations.map((op) => this.getOperationMetrics(op)),
      );

      responseTime =
        allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) /
        allMetrics.length;
      successRate =
        allMetrics.reduce((sum, m) => sum + m.successRate, 0) /
        allMetrics.length;
      errorRate =
        allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length;
    }

    // Get queue metrics
    queueSize = await this.getQueueSize();
    processingRate = await this.getProcessingRate();

    return {
      responseTime,
      successRate,
      errorRate,
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      cpuUsage: await this.getCpuUsage(),
      queueSize,
      processingRate,
      timestamp: now,
    };
  }

  async getRealTimeMetrics(): Promise<{
    activeAlerts: number;
    queueSize: number;
    processingRate: number;
    errorRate: number;
    memoryUsage: number;
    responseTime: number;
  }> {
    const metrics = await this.getPerformanceMetrics();

    return {
      activeAlerts: await this.getActiveAlerts(),
      queueSize: metrics.queueSize,
      processingRate: metrics.processingRate,
      errorRate: metrics.errorRate,
      memoryUsage: metrics.memoryUsage,
      responseTime: metrics.responseTime,
    };
  }

  private async getOperationMetrics(operation: string): Promise<{
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  }> {
    const key = `metrics:${operation}`;
    const data = await this.redis.hgetall(key);

    if (Object.keys(data).length === 0) {
      return { averageResponseTime: 0, successRate: 100, errorRate: 0 };
    }

    const durations: number[] = [];
    const successes: boolean[] = [];

    for (let i = 0; i < Object.keys(data).length / 4; i++) {
      const duration = parseFloat(data[`duration:${i}`] || "0");
      const success = data[`success:${i}`] === "true";

      if (duration > 0) {
        durations.push(duration);
        successes.push(success);
      }
    }

    const averageResponseTime =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    const successRate =
      successes.length > 0
        ? (successes.filter((s) => s).length / successes.length) * 100
        : 100;

    const errorRate = 100 - successRate;

    return { averageResponseTime, successRate, errorRate };
  }

  private async getAllOperations(): Promise<string[]> {
    const keys = await this.redis.keys("metrics:*");
    return keys.map((key) => key.replace("metrics:", ""));
  }

  private async getQueueSize(): Promise<number> {
    const waiting = await this.redis.llen("delay-check:waiting");
    const active = await this.redis.llen("delay-check:active");
    return waiting + active;
  }

  private async getProcessingRate(): Promise<number> {
    const rate = (await this.redis.get("metrics:processing_rate")) || "0";
    return parseFloat(rate);
  }

  private async getActiveAlerts(): Promise<number> {
    const count = (await this.redis.get("metrics:active_alerts")) || "0";
    return parseInt(count);
  }

  private async getCpuUsage(): Promise<number> {
    const usage = process.cpuUsage();
    return Math.round(usage.user / 1000000); // Convert to seconds
  }

  private updateInMemoryMetrics(
    operation: string,
    duration: number,
    _success: boolean,
  ): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);

    // Keep only the last maxSamples
    if (operationMetrics.length > this.maxSamples) {
      operationMetrics.shift();
    }
  }

  async clearMetrics(operation?: string): Promise<void> {
    if (operation) {
      await this.redis.del(`metrics:${operation}`);
      this.metrics.delete(operation);
    } else {
      const keys = await this.redis.keys("metrics:*");
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.metrics.clear();
    }
  }

  async getMetricsHistory(
    operation: string,
    hours: number = 24,
  ): Promise<
    {
      timestamp: Date;
      responseTime: number;
      successRate: number;
      errorRate: number;
    }[]
  > {
    const key = `metrics:${operation}`;
    const data = await this.redis.hgetall(key);

    const history: {
      timestamp: Date;
      responseTime: number;
      successRate: number;
      errorRate: number;
    }[] = [];

    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    for (let i = 0; i < Object.keys(data).length / 4; i++) {
      const timestamp = parseInt(data[`timestamp:${i}`] || "0");
      const duration = parseFloat(data[`duration:${i}`] || "0");
      const success = data[`success:${i}`] === "true";

      if (timestamp > cutoff && duration > 0) {
        history.push({
          timestamp: new Date(timestamp),
          responseTime: duration,
          successRate: success ? 100 : 0,
          errorRate: success ? 0 : 100,
        });
      }
    }

    return history.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  // Decorator function for automatic performance tracking
  static trackPerformance(operation: string) {
    return function(
      target: unknown,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) {
      const method = descriptor.value;

      descriptor.value = async function(this: unknown, ...args: unknown[]) {
        const start = Date.now();
        let success = true;

        try {
          const result = await method.apply(this, args);
          return result;
        } catch (error) {
          success = false;
          throw error;
        } finally {
          const duration = Date.now() - start;
          if (this.performanceMonitor) {
            await this.performanceMonitor.trackRequest(
              operation,
              duration,
              success,
            );
          }
        }
      };
    };
  }
}
