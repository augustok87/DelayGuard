/**
 * Health Check Endpoint
 *
 * Provides comprehensive health monitoring for all services
 * with detailed status reporting and dependency validation.
 */

import { Context } from "koa";
import envValidator from "../config/environment";
import { setupDatabase, getDatabaseClient } from "../database/connection";
import { createRedisConnection } from "../services/redis-connection";
import { CarrierService } from "../services/carrier-service";
import { EmailService } from "../services/email-service";
import { SMSService } from "../services/sms-service";
import { PingResult } from "../services/ping-result";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    external_apis: {
      carrier: ServiceStatus;
      sendgrid: ServiceStatus;
      twilio: ServiceStatus;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  response_time?: number;
  error?: string;
  last_check: string;
}

/**
 * Map a settled service ping() into the /health response's ServiceStatus shape.
 *
 * Wire contract: the existing { status, response_time?, error?, last_check }
 * shape is preserved. Each ping() PingResult discriminant maps 1:1 onto the
 * three status values, so the response body and 200-vs-503 HTTP behaviour
 * stay identical to the pre-Wave-2.3 implementation.
 *
 * Promise.allSettled rejection is only possible here when the service
 * constructor itself threw (e.g. missing API key) — ping() never throws.
 */
export function pingSettledToServiceStatus(
  settled: PromiseSettledResult<PingResult>,
  timestamp: string,
): ServiceStatus {
  if (settled.status === "rejected") {
    const reason = settled.reason;
    return {
      status: "unhealthy",
      error:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Service construction failed",
      last_check: timestamp,
    };
  }
  const result = settled.value;
  if (result.status === "healthy") {
    return {
      status: "healthy",
      response_time: result.latencyMs,
      last_check: timestamp,
    };
  }
  return {
    status: result.status,
    response_time: result.latencyMs,
    error: result.error,
    last_check: timestamp,
  };
}

class HealthChecker {
  private startTime = Date.now();

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    // Check all services in parallel
    const [databaseStatus, redisStatus, externalApisStatus] =
      await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalApis(),
      ]);

    const database =
      databaseStatus.status === "fulfilled"
        ? databaseStatus.value
        : {
            status: "unhealthy" as const,
            error: databaseStatus.reason?.message,
            last_check: timestamp,
          };

    const redis =
      redisStatus.status === "fulfilled"
        ? redisStatus.value
        : {
            status: "unhealthy" as const,
            error: redisStatus.reason?.message,
            last_check: timestamp,
          };

    const externalApis =
      externalApisStatus.status === "fulfilled"
        ? externalApisStatus.value
        : {
            carrier: {
              status: "unhealthy" as const,
              error: "Failed to check",
              last_check: timestamp,
            },
            sendgrid: {
              status: "unhealthy" as const,
              error: "Failed to check",
              last_check: timestamp,
            },
            twilio: {
              status: "unhealthy" as const,
              error: "Failed to check",
              last_check: timestamp,
            },
          };

    // Determine overall status
    const allServices = [database, redis, ...Object.values(externalApis)];
    const unhealthyCount = allServices.filter(
      (s) => s.status === "unhealthy",
    ).length;
    const degradedCount = allServices.filter(
      (s) => s.status === "degraded",
    ).length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database,
        redis,
        external_apis: externalApis,
      },
      uptime,
      memory: this.getMemoryUsage(),
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      await setupDatabase();
      const client = await getDatabaseClient();
      await client.query("SELECT 1");
      client.release();

      return {
        status: "healthy",
        response_time: Date.now() - startTime,
        last_check: timestamp,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error:
          error instanceof Error ? error.message : "Unknown database error",
        last_check: timestamp,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<ServiceStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const redis = await createRedisConnection();
      await redis.ping();
      await redis.quit();

      return {
        status: "healthy",
        response_time: Date.now() - startTime,
        last_check: timestamp,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown Redis error",
        last_check: timestamp,
      };
    }
  }

  /**
   * Check external API connectivity by delegating to each service's ping().
   * Per Wave 2.3: routes never call `fetch` directly — services own the
   * upstream wrapper. Promise.allSettled keeps one slow vendor from blocking
   * the others; per-call 5s budget * 3 = 15s, under the Vercel 30s cap.
   */
  private async checkExternalApis(): Promise<{
    carrier: ServiceStatus;
    sendgrid: ServiceStatus;
    twilio: ServiceStatus;
  }> {
    const timestamp = new Date().toISOString();
    const carrier = this.tryConstructCarrier();
    const email = this.tryConstructEmail();
    const sms = this.tryConstructSms();

    const [carrierPing, sendgridPing, twilioPing] = await Promise.allSettled(
      [
        carrier instanceof Error ? Promise.reject(carrier) : carrier.ping(),
        email instanceof Error ? Promise.reject(email) : email.ping(),
        sms instanceof Error ? Promise.reject(sms) : sms.ping(),
      ],
    );

    return {
      carrier: pingSettledToServiceStatus(carrierPing, timestamp),
      sendgrid: pingSettledToServiceStatus(sendgridPing, timestamp),
      twilio: pingSettledToServiceStatus(twilioPing, timestamp),
    };
  }

  private tryConstructCarrier(): CarrierService | Error {
    try {
      return new CarrierService();
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  private tryConstructEmail(): EmailService | Error {
    try {
      return new EmailService(envValidator.get("SENDGRID_API_KEY"));
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  private tryConstructSms(): SMSService | Error {
    try {
      return new SMSService(
        envValidator.get("TWILIO_ACCOUNT_SID"),
        envValidator.get("TWILIO_AUTH_TOKEN"),
        envValidator.get("TWILIO_PHONE_NUMBER"),
      );
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round((used / total) * 100),
    };
  }
}

const healthChecker = new HealthChecker();

/**
 * Health check endpoint handler
 */
export async function healthCheck(ctx: Context) {
  try {
    const health = await healthChecker.checkHealth();

    // Set appropriate HTTP status based on health
    if (health.status === "unhealthy") {
      ctx.status = 503; // Service Unavailable
    } else if (health.status === "degraded") {
      ctx.status = 200; // OK but with warnings
    } else {
      ctx.status = 200; // OK
    }

    ctx.body = health;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Simple health check for load balancers
 */
export async function simpleHealthCheck(ctx: Context) {
  try {
    // Just check if the app is running
    ctx.status = 200;
    ctx.body = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    };
  }
}
