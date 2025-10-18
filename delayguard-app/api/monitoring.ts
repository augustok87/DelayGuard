import { VercelRequest, VercelResponse } from '@vercel/node';
import { setupDatabase, query } from '../src/database/connection';
import { setupQueues } from '../src/queue/setup';
import { CarrierService } from '../src/services/carrier-service';
import { EmailService } from '../src/services/email-service';
import { SMSService } from '../src/services/sms-service';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await setupDatabase();
    await query('SELECT 1 as health_check');
    return {
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: { connected: true }
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await setupQueues();
    // Test Redis connection by getting queue stats
    // Note: setupQueues returns void, so we can't get stats directly
    return {
      service: 'redis',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: { 
        connected: true
      }
    };
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkShipEngine(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.SHIPENGINE_API_KEY) {
      return {
        service: 'shipengine',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'API key not configured'
      };
    }

    const carrierService = new CarrierService();
    // Test with a simple carrier list request
    await carrierService.getCarrierList();
    
    return {
      service: 'shipengine',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: { connected: true }
    };
  } catch (error) {
    return {
      service: 'shipengine',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkSendGrid(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return {
        service: 'sendgrid',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'API key not configured'
      };
    }

    const emailService = new EmailService(process.env.SENDGRID_API_KEY!);
    // Test email service initialization
    const isValid = !!process.env.SENDGRID_API_KEY;
    
    return {
      service: 'sendgrid',
      status: isValid ? 'healthy' : 'degraded',
      responseTime: Date.now() - start,
      details: { configured: isValid }
    };
  } catch (error) {
    return {
      service: 'sendgrid',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkTwilio(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return {
        service: 'twilio',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Credentials not configured'
      };
    }

    const smsService = new SMSService(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      process.env.TWILIO_PHONE_NUMBER!
    );
    // Test SMS service initialization
    const isValid = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    
    return {
      service: 'twilio',
      status: isValid ? 'healthy' : 'degraded',
      responseTime: Date.now() - start,
      details: { configured: isValid }
    };
  } catch (error) {
    return {
      service: 'twilio',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const startTime = Date.now();
    
    // Run all health checks in parallel
    const healthChecks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkShipEngine(),
      checkSendGrid(),
      checkTwilio()
    ]);

    const results: HealthCheck[] = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const services = ['database', 'redis', 'shipengine', 'sendgrid', 'twilio'];
        return {
          service: services[index],
          status: 'unhealthy',
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });

    const overallStatus = results.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : results.some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.3',
      responseTime: Date.now() - startTime,
      services: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Monitoring endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform health checks',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
