import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import session from 'koa-session';
import serve from 'koa-static';
import { join } from 'path';
import dotenv from 'dotenv';

// Shopify imports
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { shopifyApp } from '@shopify/shopify-app-koa';
import { verifyRequest } from '@shopify/koa-shopify-auth';
import { createShopifyGraphQLClient } from '@shopify/koa-shopify-graphql-proxy';

// Internal imports
import { AppConfig } from './types';
import { setupDatabase } from './database/connection';
import { setupQueues } from './queue/setup';
import { webhookRoutes } from './routes/webhooks';
import { apiRoutes } from './routes/api';
import { authRoutes } from './routes/auth';
import { monitoringRoutes } from './routes/monitoring';
import { PerformanceMonitor } from './services/performance-monitor';

// Load environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Validate required environment variables
const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'SHIPENGINE_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    // In production, we'll let Vercel handle this gracefully
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// App configuration
const config: AppConfig = {
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecret: process.env.SHOPIFY_API_SECRET!,
    scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_orders', 'write_orders', 'read_fulfillments', 'write_fulfillments']
  },
  database: {
    url: process.env.DATABASE_URL!
  },
  redis: {
    url: process.env.REDIS_URL!
  },
  shipengine: {
    apiKey: process.env.SHIPENGINE_API_KEY!
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY!
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!
  }
};

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: config.shopify.apiKey,
  apiSecretKey: config.shopify.apiSecret,
  scopes: config.shopify.scopes,
  hostName: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.HOST || 'localhost'),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    httpRequests: process.env.NODE_ENV === 'development'
  }
});

// Create Koa app
const app = new Koa();

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor(config);

// Session configuration
app.keys = [config.shopify.apiSecret];
app.use(session(app));

// Body parser
app.use(bodyParser({
  jsonLimit: '10mb',
  textLimit: '10mb',
  formLimit: '10mb'
}));

// Initialize Shopify app
const shopifyAppMiddleware = shopifyApp({
  api: shopify,
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback'
  },
  webhooks: {
    path: '/webhooks',
    topics: ['orders/updated', 'fulfillments/updated', 'orders/paid']
  }
});

app.use(shopifyAppMiddleware);

// Static files
app.use(serve(join(__dirname, '../public')));

// Routes
const router = new Router();

// Health check
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
router.use('/api', apiRoutes.routes());
router.use('/webhooks', webhookRoutes.routes());
router.use('/auth', authRoutes.routes());
router.use('/monitoring', monitoringRoutes.routes());

// Main app route
// Public root route for health check
router.get('/', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: 'DelayGuard API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      webhooks: '/webhooks',
      auth: '/auth'
    }
  };
});

// Authenticated dashboard route
router.get('/dashboard', verifyRequest(), async (ctx) => {
  ctx.body = 'DelayGuard App - Main Dashboard';
});

// Performance monitoring middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  let success = true;
  
  try {
    await next();
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - start;
    const operation = `${ctx.method} ${ctx.path}`;
    await performanceMonitor.trackRequest(operation, duration, success, {
      status: ctx.status,
      userAgent: ctx.get('User-Agent'),
      ip: ctx.ip
    });
  }
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500;
    ctx.status = statusCode;
    ctx.body = {
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

// Initialize database and queues (only in development)
async function initializeApp() {
  try {
    await setupDatabase();
    await setupQueues();
    console.log('✅ Database and queues initialized');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Start server (only in development)
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

if (require.main === module && process.env.NODE_ENV !== 'production') {
  initializeApp().then(() => {
    app.listen(Number(PORT), HOST, () => {
      console.log(`🚀 DelayGuard server running on http://${HOST}:${PORT}`);
      console.log(`📱 Shopify app URL: https://${HOST}:${PORT}`);
    });
  });
}

// For Vercel, initialize on first request
let isInitialized = false;
export async function ensureInitialized() {
  if (!isInitialized) {
    await initializeApp();
    isInitialized = true;
  }
}

export { app, config, shopify, performanceMonitor };
