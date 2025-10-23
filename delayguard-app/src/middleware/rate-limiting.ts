import { Context, Next } from "koa";
import IORedis from "ioredis";
import { logError } from "../utils/logger";
// import { RateLimitError } from '../types'; // Removed unused import

/**
 * Rate Limiting Configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (ctx: Context) => string;
  onLimitReached?: (ctx: Context, key: string) => void;
  message?: string;
}

/**
 * Rate Limiting Middleware
 * Implements sophisticated rate limiting with Redis backend
 */
export class RateLimitingMiddleware {
  private redis: IORedis;
  private config: RateLimitConfig;

  constructor(redis: IORedis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (ctx: Context) => `rate_limit:${ctx.ip}`,
      message: "Too many requests, please try again later.",
      ...config,
    };
  }

  /**
   * Apply rate limiting middleware
   */
  async apply(ctx: Context, next: Next): Promise<void> {
    if (!this.config.keyGenerator) {
      throw new Error("keyGenerator is required for rate limiting");
    }
    const key = this.config.keyGenerator(ctx);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, "-inf", windowStart);

      // Count current requests
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results || results.some(([err]) => err)) {
        throw new Error("Redis rate limiting error");
      }

      const currentCount = results[1][1] as number;

      if (currentCount > this.config.maxRequests) {
        // Rate limit exceeded
        ctx.status = 429;
        ctx.body = {
          error: this.config.message,
          retryAfter: Math.ceil(this.config.windowMs / 1000),
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime: new Date(now + this.config.windowMs).toISOString(),
        };
        ctx.set(
          "Retry-After",
          Math.ceil(this.config.windowMs / 1000).toString(),
        );
        ctx.set("X-RateLimit-Limit", this.config.maxRequests.toString());
        ctx.set("X-RateLimit-Remaining", "0");
        ctx.set(
          "X-RateLimit-Reset",
          new Date(now + this.config.windowMs).toISOString(),
        );

        if (this.config.onLimitReached) {
          this.config.onLimitReached(ctx, key);
        }

        return;
      }

      // Set rate limit headers
      ctx.set("X-RateLimit-Limit", this.config.maxRequests.toString());
      ctx.set(
        "X-RateLimit-Remaining",
        Math.max(0, this.config.maxRequests - currentCount).toString(),
      );
      ctx.set(
        "X-RateLimit-Reset",
        new Date(now + this.config.windowMs).toISOString(),
      );

      await next();

      // Handle post-request logic
      if (this.config.skipSuccessfulRequests && ctx.status < 400) {
        // Remove the request from counter if it was successful
        await this.redis.zrem(key, `${now}-*`);
      }
    } catch (error) {
      logError(
        error instanceof Error
          ? error.message
          : "Unknown error in rate limiting middleware",
        error instanceof Error ? error : undefined,
        { component: "rate-limiting", action: "middleware" },
      );
      // Continue without rate limiting if Redis fails
      await next();
    }
  }

  /**
   * Create rate limiting middleware factory
   */
  static create(redis: IORedis, config: RateLimitConfig) {
    const middleware = new RateLimitingMiddleware(redis, config);
    return middleware.apply.bind(middleware);
  }
}

/**
 * Predefined rate limiting configurations
 */
export const RateLimitPresets = {
  // Strict rate limiting for auth endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (ctx: Context) => `rate_limit:auth:${ctx.ip}`,
    message: "Too many authentication attempts, please try again later.",
  },

  // Moderate rate limiting for API endpoints
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (ctx: Context) => `rate_limit:api:${ctx.ip}`,
    message: "API rate limit exceeded, please try again later.",
  },

  // Lenient rate limiting for general endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    keyGenerator: (ctx: Context) => `rate_limit:general:${ctx.ip}`,
    message: "Rate limit exceeded, please try again later.",
  },

  // Very strict rate limiting for webhook endpoints
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (ctx: Context) => `rate_limit:webhook:${ctx.ip}`,
    message: "Webhook rate limit exceeded.",
  },
};

/**
 * Advanced rate limiting with multiple tiers
 */
export class AdvancedRateLimiting {
  private redis: IORedis;

  constructor(redis: IORedis) {
    this.redis = redis;
  }

  /**
   * Apply tiered rate limiting based on user type
   */
  async applyTieredRateLimit(ctx: Context, next: Next): Promise<void> {
    const userTier = this.getUserTier(ctx);
    const config = this.getConfigForTier(userTier);

    const middleware = new RateLimitingMiddleware(this.redis, config);
    await middleware.apply(ctx, next);
  }

  private getUserTier(ctx: Context): "premium" | "standard" | "free" {
    // Determine user tier based on shop plan or other factors
    const shop = ctx.state.shopify?.session?.shop;
    if (!shop) return "free";

    // This would typically check shop plan from database
    // For now, return standard as default
    return "standard";
  }

  private getConfigForTier(tier: string): RateLimitConfig {
    const configs = {
      premium: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1000,
        keyGenerator: (ctx: Context) => `rate_limit:premium:${ctx.ip}`,
      },
      standard: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 200,
        keyGenerator: (ctx: Context) => `rate_limit:standard:${ctx.ip}`,
      },
      free: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 50,
        keyGenerator: (ctx: Context) => `rate_limit:free:${ctx.ip}`,
      },
    };

    return configs[tier as keyof typeof configs] || configs.free;
  }
}
