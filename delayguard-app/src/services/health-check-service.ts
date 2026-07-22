/**
 * Health Check Service — LAUNCH_PLAN A1.
 *
 * Backs the Koa GET /health route with HONEST checks: it really pings
 * Postgres (SELECT 1) and Redis (PING) and reports measured latencies or
 * the actual failure. The previous serverless handler (api/health.ts)
 * faked "healthy" from env-var string formats with response_time: 0.
 *
 * Status mapping:
 *   database unhealthy → overall "unhealthy" (the app cannot function)
 *   redis unhealthy    → overall "degraded"  (sweep cursors/queues degrade,
 *                        webhook ingest + dashboard reads still work)
 *   both healthy       → "healthy"
 */
import { query } from "../database/connection";
import { getRedisConnection } from "./redis-connection";

export interface ServiceHealth {
  status: "healthy" | "unhealthy";
  /** Measured round-trip in ms; null when the ping failed. */
  responseTimeMs: number | null;
  error?: string;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: string;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

export class HealthCheckService {
  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await query("SELECT 1");
      return { status: "healthy", responseTimeMs: Date.now() - start };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTimeMs: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const redis = await getRedisConnection();
      const pong = await redis.ping();
      if (pong !== "PONG") {
        return {
          status: "unhealthy",
          responseTimeMs: null,
          error: `Unexpected PING reply: ${String(pong)}`,
        };
      }
      return { status: "healthy", responseTimeMs: Date.now() - start };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTimeMs: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    let status: HealthReport["status"] = "healthy";
    if (database.status === "unhealthy") {
      status = "unhealthy";
    } else if (redis.status === "unhealthy") {
      status = "degraded";
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      services: { database, redis },
    };
  }
}

export const healthCheckService = new HealthCheckService();
