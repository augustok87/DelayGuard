import { Redis } from 'ioredis';
import { AppConfig } from '../types';

export interface CacheConfig {
  ttl: number;
  keyPrefix: string;
  maxSize?: number;
  compression?: boolean;
}

export class OptimizedCache {
  private redis: Redis;
  private localCache: Map<string, { value: any; expiry: number }> = new Map();
  private readonly maxLocalSize = 1000;
  private readonly localCacheTTL = 60000; // 1 minute

  constructor(config: AppConfig) {
    this.redis = new Redis(config.redis.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
  }

  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    const fullKey = `${config.keyPrefix}:${key}`;
    
    // Try local cache first
    const localValue = this.getFromLocalCache(fullKey);
    if (localValue !== null) {
      return localValue;
    }

    // Try Redis cache
    try {
      const value = await this.redis.get(fullKey);
      if (value) {
        const parsed = JSON.parse(value);
        this.setLocalCache(fullKey, parsed, config.ttl);
        return parsed;
      }
    } catch (error) {
      console.warn('Redis cache error:', error);
    }

    return null;
  }

  async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    const fullKey = `${config.keyPrefix}:${key}`;
    
    // Set in local cache
    this.setLocalCache(fullKey, value, config.ttl);

    // Set in Redis cache
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(fullKey, config.ttl, serialized);
    } catch (error) {
      console.warn('Redis cache error:', error);
    }
  }

  async del(key: string, config: CacheConfig): Promise<void> {
    const fullKey = `${config.keyPrefix}:${key}`;
    
    // Remove from local cache
    this.localCache.delete(fullKey);

    // Remove from Redis cache
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      console.warn('Redis cache error:', error);
    }
  }

  async mget<T>(keys: string[], config: CacheConfig): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => `${config.keyPrefix}:${key}`);
    const results: (T | null)[] = [];
    
    // Check local cache first
    const localResults: { [key: string]: T | null } = {};
    const missingKeys: string[] = [];
    
    for (let i = 0; i < fullKeys.length; i++) {
      const localValue = this.getFromLocalCache(fullKeys[i]);
      if (localValue !== null) {
        localResults[keys[i]] = localValue;
        results[i] = localValue;
      } else {
        missingKeys.push(fullKeys[i]);
        results[i] = null;
      }
    }

    // Get missing keys from Redis
    if (missingKeys.length > 0) {
      try {
        const redisValues = await this.redis.mget(...missingKeys);
        let redisIndex = 0;
        
        for (let i = 0; i < fullKeys.length; i++) {
          if (results[i] === null) {
            const redisValue = redisValues[redisIndex++];
            if (redisValue) {
              const parsed = JSON.parse(redisValue);
              results[i] = parsed;
              this.setLocalCache(fullKeys[i], parsed, config.ttl);
            }
          }
        }
      } catch (error) {
        console.warn('Redis mget error:', error);
      }
    }

    return results;
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T }>, config: CacheConfig): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const { key, value } of keyValuePairs) {
      const fullKey = `${config.keyPrefix}:${key}`;
      
      // Set in local cache
      this.setLocalCache(fullKey, value, config.ttl);
      
      // Add to Redis pipeline
      const serialized = JSON.stringify(value);
      pipeline.setex(fullKey, config.ttl, serialized);
    }

    try {
      await pipeline.exec();
    } catch (error) {
      console.warn('Redis mset error:', error);
    }
  }

  async invalidatePattern(pattern: string, config: CacheConfig): Promise<void> {
    const fullPattern = `${config.keyPrefix}:${pattern}`;
    
    try {
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Redis pattern invalidation error:', error);
    }

    // Clear local cache entries matching pattern
    for (const [key] of this.localCache) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }
  }

  async getStats(): Promise<{
    localCacheSize: number;
    localCacheHitRate: number;
    redisConnected: boolean;
  }> {
    const localCacheSize = this.localCache.size;
    const redisConnected = this.redis.status === 'ready';
    
    return {
      localCacheSize,
      localCacheHitRate: 0, // Would need to track hits/misses
      redisConnected,
    };
  }

  private getFromLocalCache(key: string): any | null {
    const entry = this.localCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.value;
    }
    
    if (entry) {
      this.localCache.delete(key);
    }
    
    return null;
  }

  private setLocalCache(key: string, value: any, ttl: number): void {
    // Clean up expired entries if cache is full
    if (this.localCache.size >= this.maxLocalSize) {
      this.cleanupLocalCache();
    }

    const expiry = Date.now() + Math.min(ttl * 1000, this.localCacheTTL);
    this.localCache.set(key, { value, expiry });
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache) {
      if (entry.expiry <= now) {
        this.localCache.delete(key);
      }
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  tracking: { ttl: 3600, keyPrefix: 'tracking' }, // 1 hour
  settings: { ttl: 86400, keyPrefix: 'settings' }, // 24 hours
  orders: { ttl: 1800, keyPrefix: 'orders' }, // 30 minutes
  alerts: { ttl: 3600, keyPrefix: 'alerts' }, // 1 hour
  analytics: { ttl: 300, keyPrefix: 'analytics' }, // 5 minutes
  realtime: { ttl: 60, keyPrefix: 'realtime' }, // 1 minute
  performance: { ttl: 300, keyPrefix: 'performance' }, // 5 minutes
} as const;
