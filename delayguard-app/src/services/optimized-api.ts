import { OptimizedDatabase } from './optimized-database';
import { OptimizedCache, CACHE_CONFIGS } from './optimized-cache';
import { AppConfig } from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  responseTime?: number;
}

export class OptimizedApiService {
  private db: OptimizedDatabase;
  private cache: OptimizedCache;

  constructor(config: AppConfig) {
    this.db = new OptimizedDatabase(config);
    this.cache = new OptimizedCache(config);
  }

  async getSettings(shopDomain: string): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      // Try cache first
      const cacheKey = `settings:${shopDomain}`;
      const cached = await this.cache.get(cacheKey, CACHE_CONFIGS.settings);
      
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - start
        };
      }

      // Get from database
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      const settings = await this.db.getShopSettings(shop.id);
      const result = settings || {
        delayThresholdDays: 2,
        emailEnabled: true,
        smsEnabled: false,
        notificationTemplate: 'default'
      };

      // Cache the result
      await this.cache.set(cacheKey, result, CACHE_CONFIGS.settings);

      return {
        success: true,
        data: result,
        cached: false,
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async updateSettings(shopDomain: string, settings: any): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      // Update in database
      await this.db.query(`
        INSERT INTO app_settings (
          shop_id, 
          delay_threshold_days, 
          email_enabled, 
          sms_enabled, 
          notification_template
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (shop_id)
        DO UPDATE SET
          delay_threshold_days = EXCLUDED.delay_threshold_days,
          email_enabled = EXCLUDED.email_enabled,
          sms_enabled = EXCLUDED.sms_enabled,
          notification_template = EXCLUDED.notification_template,
          updated_at = CURRENT_TIMESTAMP
      `, [
        shop.id,
        settings.delayThresholdDays,
        settings.emailEnabled,
        settings.smsEnabled,
        settings.notificationTemplate
      ]);

      // Invalidate cache
      const cacheKey = `settings:${shopDomain}`;
      await this.cache.del(cacheKey, CACHE_CONFIGS.settings);

      return {
        success: true,
        data: settings,
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async getAlerts(shopDomain: string, page: number = 1, limit: number = 20): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      const offset = (page - 1) * limit;
      const cacheKey = `alerts:${shop.id}:${page}:${limit}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey, CACHE_CONFIGS.alerts);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - start
        };
      }

      // Get from database
      const alerts = await this.db.getRecentAlerts(shop.id, limit, offset);
      const totalCount = await this.db.getAlertCount(shop.id);

      const result = {
        alerts,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };

      // Cache the result
      await this.cache.set(cacheKey, result, CACHE_CONFIGS.alerts);

      return {
        success: true,
        data: result,
        cached: false,
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async getOrders(shopDomain: string, page: number = 1, limit: number = 20): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      const offset = (page - 1) * limit;
      const cacheKey = `orders:${shop.id}:${page}:${limit}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey, CACHE_CONFIGS.orders);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - start
        };
      }

      // Get from database
      const orders = await this.db.getRecentOrders(shop.id, limit, offset);
      const totalCount = await this.db.getOrderCount(shop.id);

      const result = {
        orders,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };

      // Cache the result
      await this.cache.set(cacheKey, result, CACHE_CONFIGS.orders);

      return {
        success: true,
        data: result,
        cached: false,
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async getStats(shopDomain: string): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      const cacheKey = `stats:${shop.id}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey, CACHE_CONFIGS.performance);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - start
        };
      }

      // Get from database and external services
      const [orderCount, alertCount, dbStats, cacheStats] = await Promise.all([
        this.db.getOrderCount(shop.id),
        this.db.getAlertCount(shop.id),
        this.db.getStats(),
        this.cache.getStats()
      ]);

      const result = {
        orders: { total: orderCount },
        alerts: { total: alertCount },
        database: dbStats,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      await this.cache.set(cacheKey, result, CACHE_CONFIGS.performance);

      return {
        success: true,
        data: result,
        cached: false,
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async clearCache(shopDomain: string): Promise<ApiResponse> {
    const start = Date.now();
    
    try {
      const shop = await this.db.getShopByDomain(shopDomain);
      if (!shop) {
        return {
          success: false,
          error: 'Shop not found',
          responseTime: Date.now() - start
        };
      }

      // Clear all cache entries for this shop
      await Promise.all([
        this.cache.invalidatePattern(`settings:${shopDomain}`, CACHE_CONFIGS.settings),
        this.cache.invalidatePattern(`alerts:${shop.id}:*`, CACHE_CONFIGS.alerts),
        this.cache.invalidatePattern(`orders:${shop.id}:*`, CACHE_CONFIGS.orders),
        this.cache.invalidatePattern(`stats:${shop.id}`, CACHE_CONFIGS.performance)
      ]);

      return {
        success: true,
        data: { message: 'Cache cleared successfully' },
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  async close(): Promise<void> {
    await Promise.all([
      this.db.close(),
      this.cache.close()
    ]);
  }
}
