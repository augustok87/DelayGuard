import request from 'supertest';
import Koa from 'koa';
import IORedis from 'ioredis';
import { RateLimitingMiddleware, RateLimitPresets, AdvancedRateLimiting } from '../../../src/middleware/rate-limiting';

// Mock Redis for testing
jest.mock('ioredis');
const MockedIORedis = IORedis as jest.MockedClass<typeof IORedis>;

describe('Rate Limiting Middleware', () => {
  let app: Koa;
  let mockRedis: any;
  let pipeline: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup Redis mock
    pipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 0], // zcard result
        [null, 1], // zadd result
        [null, 1],  // expire result
      ]),
    };

    mockRedis = {
      pipeline: jest.fn().mockReturnValue(pipeline),
      zrem: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zcard: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
    };

    // Mock the constructor to return our mock instance
    MockedIORedis.mockImplementation(() => mockRedis);
  });

  describe('Basic Rate Limiting', () => {
    beforeEach(() => {
      app = new Koa();
    });

    it('should allow requests within limit', async() => {
      // Mock successful Redis operations
      pipeline.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 5], // zcard result (5 requests)
        [null, 1], // zadd result
        [null, 1],  // expire result
      ]);

      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000, // 1 minute
        maxRequests: 10,
      });

      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(response.headers['x-ratelimit-remaining']).toBe('5');
    });

    it('should block requests exceeding limit', async() => {
      // Mock Redis operations showing limit exceeded
      pipeline.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 15], // zcard result (15 requests, exceeds limit)
        [null, 1], // zadd result
        [null, 1],  // expire result
      ]);

      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000,
        maxRequests: 10,
      });

      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(429);

      expect(response.body.error).toBeDefined();
      expect(response.body.retryAfter).toBeDefined();
      expect(response.body.limit).toBe(10);
      expect(response.body.remaining).toBe(0);
      expect(response.headers['retry-after']).toBeDefined();
      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should handle Redis errors gracefully', async() => {
      // Mock Redis error
      pipeline.exec.mockRejectedValue(new Error('Redis connection failed'));

      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000,
        maxRequests: 10,
      });

      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      // Should continue without rate limiting if Redis fails
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
    });
  });

  describe('Rate Limit Presets', () => {
    it('should apply AUTH preset correctly', () => {
      const authConfig = RateLimitPresets.AUTH;
      
      expect(authConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(authConfig.maxRequests).toBe(5);
      expect(authConfig.message).toContain('authentication attempts');
    });

    it('should apply API preset correctly', () => {
      const apiConfig = RateLimitPresets.API;
      
      expect(apiConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(apiConfig.maxRequests).toBe(100);
      expect(apiConfig.message).toContain('API rate limit');
    });

    it('should apply GENERAL preset correctly', () => {
      const generalConfig = RateLimitPresets.GENERAL;
      
      expect(generalConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(generalConfig.maxRequests).toBe(200);
    });

    it('should apply WEBHOOK preset correctly', () => {
      const webhookConfig = RateLimitPresets.WEBHOOK;
      
      expect(webhookConfig.windowMs).toBe(60 * 1000); // 1 minute
      expect(webhookConfig.maxRequests).toBe(10);
      expect(webhookConfig.message).toContain('Webhook rate limit');
    });
  });

  describe('Advanced Rate Limiting', () => {
    let advancedRateLimit: AdvancedRateLimiting;

    beforeEach(() => {
      advancedRateLimit = new AdvancedRateLimiting(mockRedis);
    });

    it('should apply tiered rate limiting for premium users', async() => {
      app = new Koa();
      
      // Mock user tier detection
      jest.spyOn(advancedRateLimit as any, 'getUserTier').mockReturnValue('premium');
      
      // Mock successful Redis operations
      pipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 100], // Within premium limit
        [null, 1],
        [null, 1],
      ]);

      app.use(advancedRateLimit.applyTieredRateLimit.bind(advancedRateLimit));
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should apply tiered rate limiting for free users', async() => {
      app = new Koa();
      
      // Mock user tier detection
      jest.spyOn(advancedRateLimit as any, 'getUserTier').mockReturnValue('free');
      
      // Mock Redis operations showing limit exceeded for free tier
      pipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 60], // Exceeds free limit (50)
        [null, 1],
        [null, 1],
      ]);

      app.use(advancedRateLimit.applyTieredRateLimit.bind(advancedRateLimit));
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(429);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set correct rate limit headers', async() => {
      pipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 3], // 3 requests made
        [null, 1],
        [null, 1],
      ]);

      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000,
        maxRequests: 10,
      });

      app = new Koa();
      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(response.headers['x-ratelimit-remaining']).toBe('7'); // 10 - 3
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator', async() => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom:key:123');
      
      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: customKeyGenerator,
      });

      app = new Koa();
      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.body = { message: 'success' };
      });

      pipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 5],
        [null, 1],
        [null, 1],
      ]);

      await request(app.callback())
        .get('/')
        .expect(200);

      expect(customKeyGenerator).toHaveBeenCalled();
    });
  });

  describe('Skip Options', () => {
    it('should skip successful requests when configured', async() => {
      const rateLimit = RateLimitingMiddleware.create(mockRedis, {
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: true,
      });

      app = new Koa();
      app.use(rateLimit);
      app.use(async(ctx) => {
        ctx.status = 200;
        ctx.body = { message: 'success' };
      });

      pipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 5],
        [null, 1],
        [null, 1],
      ]);

      await request(app.callback())
        .get('/')
        .expect(200);

      // Should call zrem to remove the request
      expect(mockRedis.zrem).toHaveBeenCalled();
    });
  });
});
