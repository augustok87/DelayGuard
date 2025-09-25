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

// Load environment variables
dotenv.config();

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
  hostName: process.env.HOST || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    httpRequests: process.env.NODE_ENV === 'development'
  }
});

// Create Koa app
const app = new Koa();

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

// Main app route
router.get('/', verifyRequest(), async (ctx) => {
  ctx.body = 'DelayGuard App - Main Dashboard';
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message
    };
  }
});

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

// Initialize database and queues
async function initializeApp() {
  try {
    await setupDatabase();
    await setupQueues();
    console.log('✅ Database and queues initialized');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

if (require.main === module) {
  initializeApp().then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`🚀 DelayGuard server running on http://${HOST}:${PORT}`);
      console.log(`📱 Shopify app URL: https://${HOST}:${PORT}`);
    });
  });
}

export { app, config, shopify };
