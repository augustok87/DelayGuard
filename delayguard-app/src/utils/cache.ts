import IORedis from "ioredis";

interface CacheConfig {
  defaultTTL: number; // seconds
  keyPrefix: string;
}

class CacheManager {
  private redis: IORedis;
  private config: CacheConfig;

  constructor(redisUrl: string, config: CacheConfig) {
    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
    this.config = config;
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const actualTTL = ttl || this.config.defaultTTL;
      await this.redis.setex(this.getKey(key), actualTTL, serialized);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixedKeys = keys.map((key) => this.getKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const { key, value, ttl } of keyValuePairs) {
        const serialized = JSON.stringify(value);
        const actualTTL = ttl || this.config.defaultTTL;
        pipeline.setex(this.getKey(key), actualTTL, serialized);
      }

      await pipeline.exec();
    } catch (error) {
      console.error("Cache mset error:", error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error("Cache invalidate pattern error:", error);
    }
  }

  async getStats(): Promise<{
    usedMemory: string;
    connectedClients: number;
    totalKeys: number;
  }> {
    try {
      const info = await this.redis.info("memory");
      const clients = await this.redis.info("clients");
      const dbSize = await this.redis.dbsize();

      const usedMemory =
        info.match(/used_memory_human:([^\r\n]+)/)?.[1] || "0B";
      const connectedClients = parseInt(
        clients.match(/connected_clients:(\d+)/)?.[1] || "0",
      );

      return {
        usedMemory,
        connectedClients,
        totalKeys: dbSize,
      };
    } catch (error) {
      console.error("Cache stats error:", error);
      return {
        usedMemory: "0B",
        connectedClients: 0,
        totalKeys: 0,
      };
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  tracking: {
    defaultTTL: 3600, // 1 hour
    keyPrefix: "tracking",
  },
  settings: {
    defaultTTL: 86400, // 24 hours
    keyPrefix: "settings",
  },
  orders: {
    defaultTTL: 1800, // 30 minutes
    keyPrefix: "orders",
  },
  alerts: {
    defaultTTL: 3600, // 1 hour
    keyPrefix: "alerts",
  },
};

// Singleton cache instances
const cacheInstances: { [key: string]: CacheManager } = {};

export function getCache(type: keyof typeof CACHE_CONFIGS): CacheManager {
  if (!cacheInstances[type]) {
    cacheInstances[type] = new CacheManager(
      process.env.REDIS_URL!,
      CACHE_CONFIGS[type],
    );
  }
  return cacheInstances[type];
}

// Cache decorator for methods
export function cached(cacheType: keyof typeof CACHE_CONFIGS, ttl?: number) {
  return function(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const cache = getCache(cacheType);

    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(cacheKey, result, ttl);

      return result;
    };
  };
}

// Utility functions for common caching patterns
export async function cacheTrackingInfo(
  trackingNumber: string,
  carrierCode: string,
  data: any,
): Promise<void> {
  const cache = getCache("tracking");
  const key = `${trackingNumber}:${carrierCode}`;
  await cache.set(key, data, 3600); // 1 hour TTL
}

export async function getCachedTrackingInfo(
  trackingNumber: string,
  carrierCode: string,
): Promise<any> {
  const cache = getCache("tracking");
  const key = `${trackingNumber}:${carrierCode}`;
  return await cache.get(key);
}

export async function cacheShopSettings(
  shopDomain: string,
  settings: any,
): Promise<void> {
  const cache = getCache("settings");
  const key = `shop:${shopDomain}`;
  await cache.set(key, settings, 86400); // 24 hours TTL
}

export async function getCachedShopSettings(shopDomain: string): Promise<any> {
  const cache = getCache("settings");
  const key = `shop:${shopDomain}`;
  return await cache.get(key);
}

export async function invalidateShopCache(shopDomain: string): Promise<void> {
  const cache = getCache("settings");
  await cache.invalidatePattern(`shop:${shopDomain}*`);
}
