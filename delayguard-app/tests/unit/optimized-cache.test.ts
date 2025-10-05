// Mock ioredis at the module level
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  keys: jest.fn(),
  pipeline: jest.fn()
};

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedisInstance)
}));

import { OptimizedCache, CACHE_CONFIGS } from '@/services/optimized-cache';
import { AppConfig } from '@/types';

const mockConfig: AppConfig = {
  shopify: {
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    scopes: ['read_orders']
  },
  database: {
    url: 'postgresql://test:test@localhost:5432/test'
  },
  redis: {
    url: 'redis://localhost:6379'
  },
  shipengine: {
    apiKey: 'test-shipengine-key'
  },
  sendgrid: {
    apiKey: 'test-sendgrid-key'
  },
  twilio: {
    accountSid: 'test-sid',
    authToken: 'test-token',
    phoneNumber: '+1234567890'
  }
};

describe('OptimizedCache', () => {
  let cache: OptimizedCache;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    cache = new OptimizedCache(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value from local cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const config = CACHE_CONFIGS.settings;

      // Mock local cache hit
      (cache as any).localCache.set('settings:test-key', {
        value,
        expiry: Date.now() + 10000
      });

      const result = await cache.get(key, config);

      expect(result).toEqual(value);
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });

    it('should return cached value from Redis when local cache miss', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(value));

      const result = await cache.get(key, config);

      expect(result).toEqual(value);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('settings:test-key');
    });

    it('should return null when no cached value exists', async () => {
      const key = 'test-key';
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cache.get(key, config);

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cache.get(key, config);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in both local cache and Redis', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.setex.mockResolvedValue('OK');

      await cache.set(key, value, config);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'settings:test-key',
        config.ttl,
        JSON.stringify(value)
      );
      
      // Check local cache
      const localEntry = (cache as any).localCache.get('settings:test-key');
      expect(localEntry).toBeDefined();
      expect(localEntry.value).toEqual(value);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.setex.mockRejectedValue(new Error('Redis connection failed'));

      await expect(cache.set(key, value, config)).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete value from both local cache and Redis', async () => {
      const key = 'test-key';
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.del.mockResolvedValue(1);

      await cache.del(key, config);

      expect(mockRedisInstance.del).toHaveBeenCalledWith('settings:test-key');
      expect((cache as any).localCache.has('settings:test-key')).toBe(false);
    });
  });

  describe('mget', () => {
    it('should return multiple values efficiently', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const config = CACHE_CONFIGS.settings;
      const values = [
        { data: 'value1' },
        { data: 'value2' },
        null
      ];

      mockRedisInstance.mget.mockResolvedValue([
        JSON.stringify(values[0]),
        JSON.stringify(values[1]),
        null
      ]);

      const result = await cache.mget(keys, config);

      expect(result).toEqual(values);
      expect(mockRedisInstance.mget).toHaveBeenCalledWith(
        'settings:key1',
        'settings:key2',
        'settings:key3'
      );
    });

    it('should prioritize local cache over Redis', async () => {
      const keys = ['key1', 'key2'];
      const config = CACHE_CONFIGS.settings;

      // Mock local cache hit for key1
      (cache as any).localCache.set('settings:key1', {
        value: { data: 'local-value' },
        expiry: Date.now() + 10000
      });

      // Mock Redis response for key2 only (since key1 is in local cache)
      mockRedisInstance.mget.mockResolvedValue([
        JSON.stringify({ data: 'redis-value' }) // key2 in Redis
      ]);

      const result = await cache.mget(keys, config);

      expect(result).toEqual([
        { data: 'local-value' },
        { data: 'redis-value' }
      ]);
    });
  });

  describe('mset', () => {
    it('should set multiple values efficiently', async () => {
      const keyValuePairs = [
        { key: 'key1', value: { data: 'value1' } },
        { key: 'key2', value: { data: 'value2' } }
      ];
      const config = CACHE_CONFIGS.settings;

      const pipelineInstance = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([['OK'], ['OK']])
      };
      mockRedisInstance.pipeline.mockReturnValue(pipelineInstance);

      await cache.mset(keyValuePairs, config);

      expect(mockRedisInstance.pipeline).toHaveBeenCalled();
      expect(pipelineInstance.setex).toHaveBeenCalledTimes(2);
      expect(pipelineInstance.exec).toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate all keys matching pattern', async () => {
      const pattern = 'test-*';
      const config = CACHE_CONFIGS.settings;

      mockRedisInstance.keys.mockResolvedValue([
        'settings:test-key1',
        'settings:test-key2'
      ]);
      mockRedisInstance.del.mockResolvedValue(2);

      await cache.invalidatePattern(pattern, config);

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('settings:test-*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        'settings:test-key1',
        'settings:test-key2'
      );
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Add some entries to local cache
      (cache as any).localCache.set('key1', { value: 'value1', expiry: Date.now() + 10000 });
      (cache as any).localCache.set('key2', { value: 'value2', expiry: Date.now() + 10000 });

      const stats = await cache.getStats();

      expect(stats).toEqual({
        localCacheSize: 2,
        localCacheHitRate: 0,
        redisConnected: false
      });
    });
  });

  describe('local cache cleanup', () => {
    it('should clean up expired entries when cache is full', async () => {
      const config = CACHE_CONFIGS.settings;
      
      // Fill local cache with expired entries
      for (let i = 0; i < 1001; i++) {
        (cache as any).localCache.set(`key${i}`, {
          value: `value${i}`,
          expiry: Date.now() - 10000 // Expired
        });
      }

      // Add one more entry to trigger cleanup
      await cache.set('new-key', { data: 'new-value' }, config);

      // Should have cleaned up expired entries
      expect((cache as any).localCache.size).toBeLessThan(1001);
    });
  });
});
