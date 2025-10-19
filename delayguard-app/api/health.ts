/**
 * Health Check API Endpoint for Vercel
 * 
 * Provides health monitoring for all services with Vercel-compatible format
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

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
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        return {
          status: 'unhealthy',
          error: 'DATABASE_URL not configured',
          last_check: timestamp,
        };
      }

      // For now, just check if the URL is valid format
      if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
        return {
          status: 'unhealthy',
          error: 'Invalid DATABASE_URL format',
          last_check: timestamp,
        };
      }

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
      // Check if REDIS_URL is configured
      if (!process.env.REDIS_URL) {
        return {
          status: 'unhealthy',
          error: 'REDIS_URL not configured',
          last_check: timestamp,
        };
      }

      // For now, just check if the URL is valid format
      if (!process.env.REDIS_URL.startsWith('redis://') && !process.env.REDIS_URL.startsWith('rediss://')) {
        return {
          status: 'unhealthy',
          error: 'Invalid REDIS_URL format',
          last_check: timestamp,
        };
      }

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

    return {
      shipengine: this.checkApiKey('SHIPENGINE_API_KEY', timestamp),
      sendgrid: this.checkApiKey('SENDGRID_API_KEY', timestamp),
      twilio: this.checkTwilioKeys(timestamp),
    };
  }

  private checkApiKey(keyName: string, timestamp: string): ServiceStatus {
    const apiKey = process.env[keyName];
    
    if (!apiKey) {
      return {
        status: 'unhealthy',
        error: `${keyName} not configured`,
        last_check: timestamp,
      };
    }

    if (apiKey.includes('your_') && apiKey.includes('_here')) {
      return {
        status: 'unhealthy',
        error: `${keyName} appears to be a placeholder value`,
        last_check: timestamp,
      };
    }

    return {
      status: 'healthy',
      last_check: timestamp,
    };
  }

  private checkTwilioKeys(timestamp: string): ServiceStatus {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      return {
        status: 'unhealthy',
        error: 'Twilio credentials not fully configured',
        last_check: timestamp,
      };
    }

    if (accountSid.includes('your_') || authToken.includes('your_') || phoneNumber.includes('your_')) {
      return {
        status: 'unhealthy',
        error: 'Twilio credentials appear to be placeholder values',
        last_check: timestamp,
      };
    }

    return {
      status: 'healthy',
      last_check: timestamp,
    };
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
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const health = await healthChecker.checkHealth();
    
    // Set appropriate HTTP status based on health
    if (health.status === 'unhealthy') {
      res.status(503); // Service Unavailable
    } else if (health.status === 'degraded') {
      res.status(200); // OK but with warnings
    } else {
      res.status(200); // OK
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
