import { VercelRequest, VercelResponse } from '@vercel/node';
import { setupDatabase, query } from '../src/database/connection';
import { setupQueues, addDelayCheckJob, addNotificationJob } from '../src/queue/setup';
import { CarrierService } from '../src/services/carrier-service';
import { DelayDetectionService } from '../src/services/delay-detection-service';
import { EmailService } from '../src/services/email-service';
import { SMSService } from '../src/services/sms-service';
import { NotificationService } from '../src/services/notification-service';
import { OptimizedApiService } from '../src/services/optimized-api';
import crypto from 'crypto';

// Initialize services (cached after first call)
let servicesInitialized = false;
let dbClient: any = null;
let queues: any = null;

async function initializeServices() {
  if (servicesInitialized) return { dbClient, queues };
  
  try {
    // Initialize database
    dbClient = await setupDatabase();
    
    // Initialize queues
    queues = await setupQueues();
    
    servicesInitialized = true;
    return { dbClient, queues };
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

// Enhanced error handling
function handleError(res: VercelResponse, error: any, statusCode: number = 500) {
  console.error('API Error:', error);
  
  const errorResponse = {
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
  
  res.status(statusCode).json(errorResponse);
}

// CORS middleware
function setCORSHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Shopify-Hmac-Sha256, X-Shopify-Topic');
}

// Webhook verification
function verifyWebhook(req: VercelRequest, res: VercelResponse): boolean {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  const topic = req.headers['x-shopify-topic'] as string;
  
  if (!hmac || !topic) {
    res.status(401).json({ error: 'Missing required headers' });
    return false;
  }
  
  const body = JSON.stringify(req.body);
  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || '')
    .update(body, 'utf8')
    .digest('base64');
  
  if (calculatedHmac !== hmac) {
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return false;
  }
  
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCORSHeaders(res);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const { dbClient, queues } = await initializeServices();

    // Health check endpoint
    if (req.url === '/health' || req.url === '/api/health') {
      const healthStatus = {
        status: 'success',
        message: 'DelayGuard API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.3',
        services: {
          database: !!process.env.DATABASE_URL,
          redis: !!process.env.REDIS_URL,
          shipengine: !!process.env.SHIPENGINE_API_KEY,
          sendgrid: !!process.env.SENDGRID_API_KEY,
          twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
      res.status(200).json(healthStatus);
      return;
    }

    // Root endpoint
    if (req.url === '/' || req.url === '/api') {
      res.status(200).json({
        message: 'DelayGuard API',
        version: '1.0.3',
        status: 'operational',
        endpoints: {
          health: '/api/health',
          webhooks: '/api/webhooks',
          settings: '/api/settings',
          alerts: '/api/alerts',
          orders: '/api/orders',
          stats: '/api/stats',
          'test-delay': '/api/test-delay',
        },
        documentation: 'https://delayguard-api.vercel.app/api/docs',
      });
      return;
    }

    // Settings endpoint
    if (req.url?.startsWith('/api/settings')) {
      const apiService = new OptimizedApiService(dbClient);
      
      if (req.method === 'GET') {
        const settings = await apiService.getSettings(req.query.shop as string);
        res.status(200).json(settings);
        return;
      }
      
      if (req.method === 'POST' || req.method === 'PUT') {
        const settings = await apiService.updateSettings(
          req.query.shop as string,
          req.body
        );
        res.status(200).json(settings);
        return;
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Alerts endpoint
    if (req.url?.startsWith('/api/alerts')) {
      const apiService = new OptimizedApiService(dbClient);
      
      if (req.method === 'GET') {
        const alerts = await apiService.getAlerts(
          req.query.shop as string,
          parseInt(req.query.page as string) || 1,
          parseInt(req.query.limit as string) || 20
        );
        res.status(200).json(alerts);
        return;
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Orders endpoint
    if (req.url?.startsWith('/api/orders')) {
      const apiService = new OptimizedApiService(dbClient);
      
      if (req.method === 'GET') {
        const orders = await apiService.getOrders(
          req.query.shop as string,
          parseInt(req.query.page as string) || 1,
          parseInt(req.query.limit as string) || 20
        );
        res.status(200).json(orders);
        return;
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Stats endpoint
    if (req.url?.startsWith('/api/stats')) {
      const apiService = new OptimizedApiService(dbClient);
      
      if (req.method === 'GET') {
        const stats = await apiService.getStats(req.query.shop as string);
        res.status(200).json(stats);
        return;
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Test delay detection endpoint
    if (req.url?.startsWith('/api/test-delay')) {
      if (req.method === 'POST') {
        const { trackingNumber, carrierCode } = req.body;
        
        if (!trackingNumber || !carrierCode) {
          res.status(400).json({ error: 'trackingNumber and carrierCode are required' });
          return;
        }
        
        try {
          const carrierService = new CarrierService();
          const delayDetectionService = new DelayDetectionService();
          
          const trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);
          const delayResult = await delayDetectionService.checkForDelays(trackingInfo);
          
          res.status(200).json({
            trackingInfo,
            delayResult,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          handleError(res, error, 400);
        }
        return;
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Webhooks endpoint
    if (req.url?.startsWith('/api/webhooks')) {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      if (!verifyWebhook(req, res)) return;

      const topic = req.headers['x-shopify-topic'] as string;
      
      try {
        // Process different webhook types
        switch (topic) {
          case 'orders/updated':
          case 'orders/paid':
            await processOrderWebhook(req.body, dbClient, queues);
            break;
          case 'fulfillments/updated':
            await processFulfillmentWebhook(req.body, dbClient, queues);
            break;
          default:
            console.log(`Unhandled webhook topic: ${topic}`);
        }
        
        res.status(200).json({
          message: 'Webhook processed successfully',
          topic,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleError(res, error, 500);
      }
      return;
    }

    // 404 for unknown routes
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleError(res, error);
  }
}

// Webhook processing functions
async function processOrderWebhook(orderData: any, dbClient: any, queues: any) {
  const { id, name, email, total_price, created_at, updated_at } = orderData;
  
  await query(`
    INSERT INTO orders (id, shop_domain, order_name, customer_email, total_price, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      order_name = EXCLUDED.order_name,
      customer_email = EXCLUDED.customer_email,
      total_price = EXCLUDED.total_price,
      updated_at = EXCLUDED.updated_at
  `, [id, orderData.shop_domain || 'unknown', name, email, total_price, created_at, updated_at]);
  
  console.log(`Order ${id} processed successfully`);
}

async function processFulfillmentWebhook(fulfillmentData: any, dbClient: any, queues: any) {
  const { id, order_id, tracking_number, carrier, created_at, updated_at } = fulfillmentData;
  
  await query(`
    INSERT INTO fulfillments (id, order_id, tracking_number, carrier, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
      tracking_number = EXCLUDED.tracking_number,
      carrier = EXCLUDED.carrier,
      updated_at = EXCLUDED.updated_at
  `, [id, order_id, tracking_number, carrier, created_at, updated_at]);
  
  // Add delay check job if tracking number exists
  if (tracking_number) {
    await addDelayCheckJob({
      orderId: order_id,
      trackingNumber: tracking_number,
      carrierCode: carrier,
      shopDomain: 'unknown', // This should be passed from the webhook data
    });
  }
  
  console.log(`Fulfillment ${id} processed successfully`);
}