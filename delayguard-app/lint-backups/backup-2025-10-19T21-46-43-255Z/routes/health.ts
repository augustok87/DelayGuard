/**
 * Health Check Endpoint
 * 
 * Provides comprehensive health monitoring for all services
 * with detailed status reporting and dependency validation.
 */

import { Context } from 'koa';
import envValidator from '../config/environment';
import { setupDatabase, getDatabaseClient } from '../database/connection';
import { createRedisConnection } from '../services/redis-connection';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    external_apis: {
      shipengine: ServiceStatus;
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
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  error?: string;
  last_check: string;
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
    const [databaseStatus, redisStatus, externalApisStatus] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalApis(),
    ]);

    const database = databaseStatus.status === 'fulfilled' 
      ? databaseStatus.value 
      : { status: 'unhealthy' as const, error: databaseStatus.reason?.message, last_check: timestamp };

    const redis = redisStatus.status === 'fulfilled' 
      ? redisStatus.value 
      : { status: 'unhealthy' as const, error: redisStatus.reason?.message, last_check: timestamp };

    const externalApis = externalApisStatus.status === 'fulfilled' 
      ? externalApisStatus.value 
      : { 
          shipengine: { status: 'unhealthy' as const, error: 'Failed to check', last_check: timestamp },
          sendgrid: { status: 'unhealthy' as const, error: 'Failed to check', last_check: timestamp },
          twilio: { status: 'unhealthy' as const, error: 'Failed to check', last_check: timestamp },
        };

    // Determine overall status
    const allServices = [database, redis, ...Object.values(externalApis)];
    const unhealthyCount = allServices.filter(s => s.status === 'unhealthy').length;
    const degradedCount = allServices.filter(s => s.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
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
      await client.query('SELECT 1');
      client.release();
      
      return {
        status: 'healthy',
        response_time: Date.now() - startTime,
        last_check: timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error',
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
        status: 'healthy',
        response_time: Date.now() - startTime,
        last_check: timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Redis error',
        last_check: timestamp,
      };
    }
  }

  /**
   * Check external API connectivity
   */
  private async checkExternalApis(): Promise<{
    shipengine: ServiceStatus;
    sendgrid: ServiceStatus;
    twilio: ServiceStatus;
  }> {
    const timestamp = new Date().toISOString();

    const [shipengine, sendgrid, twilio] = await Promise.allSettled([
      this.checkShipEngine(),
      this.checkSendGrid(),
      this.checkTwilio(),
    ]);

    return {
      shipengine: shipengine.status === 'fulfilled' 
        ? shipengine.value 
        : { status: 'unhealthy', error: shipengine.reason?.message, last_check: timestamp },
      sendgrid: sendgrid.status === 'fulfilled' 
        ? sendgrid.value 
        : { status: 'unhealthy', error: sendgrid.reason?.message, last_check: timestamp },
      twilio: twilio.status === 'fulfilled' 
        ? twilio.value 
        : { status: 'unhealthy', error: twilio.reason?.message, last_check: timestamp },
    };
  }

  private async checkShipEngine(): Promise<ServiceStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const apiKey = envValidator.get('SHIPENGINE_API_KEY');
      const response = await fetch('https://api.shipengine.com/v1/addresses/validate', {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test',
          address_line1: '123 Test St',
          city_locality: 'Test City',
          state_province: 'TS',
          postal_code: '12345',
          country_code: 'US',
        }),
      });

      if (response.ok) {
        return {
          status: 'healthy',
          response_time: Date.now() - startTime,
          last_check: timestamp,
        };
      } else {
        return {
          status: 'degraded',
          error: `HTTP ${response.status}: ${response.statusText}`,
          last_check: timestamp,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown ShipEngine error',
        last_check: timestamp,
      };
    }
  }

  private async checkSendGrid(): Promise<ServiceStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const apiKey = envValidator.get('SENDGRID_API_KEY');
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return {
          status: 'healthy',
          response_time: Date.now() - startTime,
          last_check: timestamp,
        };
      } else {
        return {
          status: 'degraded',
          error: `HTTP ${response.status}: ${response.statusText}`,
          last_check: timestamp,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown SendGrid error',
        last_check: timestamp,
      };
    }
  }

  private async checkTwilio(): Promise<ServiceStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const accountSid = envValidator.get('TWILIO_ACCOUNT_SID');
      const authToken = envValidator.get('TWILIO_AUTH_TOKEN');
      
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      });

      if (response.ok) {
        return {
          status: 'healthy',
          response_time: Date.now() - startTime,
          last_check: timestamp,
        };
      } else {
        return {
          status: 'degraded',
          error: `HTTP ${response.status}: ${response.statusText}`,
          last_check: timestamp,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Twilio error',
        last_check: timestamp,
      };
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
    if (health.status === 'unhealthy') {
      ctx.status = 503; // Service Unavailable
    } else if (health.status === 'degraded') {
      ctx.status = 200; // OK but with warnings
    } else {
      ctx.status = 200; // OK
    }

    ctx.body = health;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
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
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
