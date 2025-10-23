/**
 * Redis Connection Service
 *
 * Provides centralized Redis connection management with
 * proper error handling, retry logic, and connection pooling.
 */

import Redis from "ioredis";
import { logger } from "../utils/logger";
import envValidator from "../config/environment";

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

class RedisConnectionManager {
  private client: Redis | null = null;
  private config: RedisConfig;

  constructor() {
    this.config = this.parseRedisUrl();
  }

  /**
   * Parse Redis URL and extract configuration
   */
  private parseRedisUrl(): RedisConfig {
    const redisUrl = envValidator.get("REDIS_URL");

    try {
      const url = new URL(redisUrl);

      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: url.pathname ? parseInt(url.pathname.slice(1)) || 0 : 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };
    } catch (error) {
      throw new Error(
        `Invalid Redis URL: ${redisUrl}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create Redis connection with proper error handling
   */
  async createConnection(): Promise<Redis> {
    if (this.client && this.client.status === "ready") {
      return this.client;
    }

    try {
      this.client = new Redis(this.config);

      // Set up event handlers
      this.client.on("connect", () => {
        logger.info("✅ Redis connected successfully");
      });

      this.client.on("ready", () => {
        logger.info("✅ Redis ready for operations");
      });

      this.client.on("error", (error) => {
        logger.error("❌ Redis error:", error as Error);
      });

      this.client.on("close", () => {
        logger.info("⚠️  Redis connection closed");
      });

      this.client.on("reconnecting", () => {
        logger.info("🔄 Redis reconnecting...");
      });

      // Wait for connection to be ready
      await this.client.connect();

      return this.client;
    } catch (error) {
      logger.error("Redis connection error", error as Error);
      throw new Error(
        `Redis connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get existing connection or create new one
   */
  async getConnection(): Promise<Redis> {
    if (!this.client || this.client.status !== "ready") {
      return await this.createConnection();
    }
    return this.client;
  }

  /**
   * Close Redis connection
   */
  async closeConnection(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      const result = await client.ping();
      return result === "PONG";
    } catch (error) {
      logger.error("Redis connection error", error as Error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<string> {
    try {
      const client = await this.getConnection();
      return await client.info();
    } catch (error) {
      throw new Error(
        `Failed to get Redis info: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.client.status === "ready";
  }
}

// Create singleton instance
const redisManager = new RedisConnectionManager();

/**
 * Create Redis connection (convenience function)
 */
export async function createRedisConnection(): Promise<Redis> {
  return await redisManager.createConnection();
}

/**
 * Get Redis connection (convenience function)
 */
export async function getRedisConnection(): Promise<Redis> {
  return await redisManager.getConnection();
}

/**
 * Close Redis connection (convenience function)
 */
export async function closeRedisConnection(): Promise<void> {
  return await redisManager.closeConnection();
}

export { RedisConnectionManager, redisManager };
export default redisManager;
