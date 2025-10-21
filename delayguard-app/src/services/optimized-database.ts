/* eslint-disable @typescript-eslint/no-explicit-any */
// Optimized database service with dynamic query building
import { Pool, PoolClient, QueryResult } from "pg";
import { logger } from '../utils/logger';
import { AppConfig } from "../types";

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export class OptimizedDatabase {
  private pool: Pool;
  private queryCache: Map<string, { result: unknown; expiry: number }> = new Map();
  private readonly maxCacheSize = 1000;
  private readonly defaultCacheTTL = 300000; // 5 minutes

  constructor(config: AppConfig) {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: 20, // Maximum number of clients in the pool
      min: 5, // Minimum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      statement_timeout: 10000, // Query timeout of 10 seconds
      query_timeout: 10000,
      application_name: "delayguard",
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    });

    // Handle pool errors
    this.pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", err);
    });
  }

  async query<T extends Record<string, any> = any>(
    text: string,
    params: unknown[] = [],
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    const {
      timeout = 10000,
      retries = 3,
      cache = false,
      cacheTTL = this.defaultCacheTTL,
    } = options;

    const cacheKey = cache ? `${text}:${JSON.stringify(params)}` : null;

    // Check cache first
    if (cache && cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      let client: PoolClient | null = null;

      try {
        client = await this.pool.connect();

        // Set query timeout
        await client.query(`SET statement_timeout = ${timeout}`);

        const start = Date.now();
        const result = await client.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries
        if (duration > 1000) {
          logger.warn(
            `Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`,
          );
        }

        // Cache result if enabled
        if (cache && cacheKey) {
          this.setCache(cacheKey, result, cacheTTL);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } finally {
        if (client) {
          client.release();
        }
      }
    }

    throw lastError || new Error("Query failed after all retries");
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async batchQuery<T extends Record<string, any> = any>(
    queries: Array<{ text: string; params?: unknown[] }>,
    _options: QueryOptions = {},
  ): Promise<QueryResult<T>[]> {
    const client = await this.pool.connect();

    try {
      const results: QueryResult<T>[] = [];

      for (const { text, params = [] } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }

      return results;
    } finally {
      client.release();
    }
  }

  async getConnection(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getStats(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Optimized query methods for common operations
  async getShopByDomain(domain: string): Promise<any | null> {
    const result = await this.query(
      "SELECT * FROM shops WHERE shop_domain = $1 LIMIT 1",
      [domain],
      { cache: true, cacheTTL: 300000 }, // 5 minutes
    );

    return result.rows[0] || null;
  }

  async getShopSettings(shopId: number): Promise<any | null> {
    const result = await this.query(
      "SELECT * FROM app_settings WHERE shop_id = $1 LIMIT 1",
      [shopId],
      { cache: true, cacheTTL: 300000 }, // 5 minutes
    );

    return result.rows[0] || null;
  }

  async getRecentOrders(
    shopId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    const result = await this.query(
      `
      SELECT 
        o.*,
        f.tracking_number,
        f.carrier_code,
        f.status as fulfillment_status
      FROM orders o
      LEFT JOIN fulfillments f ON o.id = f.order_id
      WHERE o.shop_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [shopId, limit, offset],
      { cache: true, cacheTTL: 180000 },
    ); // 3 minutes

    return result.rows;
  }

  async getRecentAlerts(
    shopId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    const result = await this.query(
      `
      SELECT 
        da.*,
        o.order_number,
        o.customer_name,
        o.customer_email,
        f.tracking_number,
        f.carrier_code
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      LEFT JOIN fulfillments f ON da.fulfillment_id = f.id
      WHERE o.shop_id = $1
      ORDER BY da.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [shopId, limit, offset],
      { cache: true, cacheTTL: 180000 },
    ); // 3 minutes

    return result.rows;
  }

  async getOrderCount(shopId: number, startDate?: Date): Promise<number> {
    let query = "SELECT COUNT(*) as count FROM orders WHERE shop_id = $1";
    const params: unknown[] = [shopId];

    if (startDate) {
      query += " AND created_at >= $2";
      params.push(startDate);
    }

    const result = await this.query(query, params, {
      cache: true,
      cacheTTL: 300000,
    });
    return parseInt(result.rows[0].count);
  }

  async getAlertCount(shopId: number, startDate?: Date): Promise<number> {
    let query =
      "SELECT COUNT(*) as count FROM delay_alerts da JOIN orders o ON da.order_id = o.id WHERE o.shop_id = $1";
    const params: unknown[] = [shopId];

    if (startDate) {
      query += " AND da.created_at >= $2";
      params.push(startDate);
    }

    const result = await this.query(query, params, {
      cache: true,
      cacheTTL: 300000,
    });
    return parseInt(result.rows[0].count);
  }

  private getFromCache(key: string): any | null {
    const entry = this.queryCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.result;
    }

    if (entry) {
      this.queryCache.delete(key);
    }

    return null;
  }

  private setCache(key: string, result: unknown, ttl: number): void {
    // Clean up expired entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    const expiry = Date.now() + ttl;
    this.queryCache.set(key, { result, expiry });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.queryCache) {
      if (entry.expiry <= now) {
        this.queryCache.delete(key);
      }
    }
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryableErrors = [
      "syntax error",
      "permission denied",
      "relation does not exist",
      "column does not exist",
      "duplicate key value",
    ];

    const errorMessage = error.message.toLowerCase();
    return nonRetryableErrors.some((msg) => errorMessage.includes(msg));
  }
}
