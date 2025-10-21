import Koa from 'koa';
import { logger } from './utils/logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import session from 'koa-session';
import serve from 'koa-static';
import { join } from 'path';

// Shopify imports
import { shopifyApi, LATEST_API_VERSION, LogSeverity } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node'; // Import Node adapter
import { verifyRequest } from '@shopify/koa-shopify-auth';
// import createShopifyGraphQLClient from '@shopify/koa-shopify-graphql-proxy'; // Available for future use

// Internal imports
import { AppConfig } from './types';
import { setupDatabase } from './database/connection';
import { setupQueues } from './queue/setup';
import { webhookRoutes } from './routes/webhooks';
import { apiRoutes } from './routes/api';
import { authRoutes } from './routes/auth';
import { monitoringRoutes } from './routes/monitoring';
import { gdprRoutes } from './routes/gdpr';
import { billingRoutes } from './routes/billing';
import { PerformanceMonitor } from './services/performance-monitor';
import { appConfig as config } from './config/app-config';

// Security middleware imports
import { securityHeaders } from './middleware/security-headers';
// import { RateLimitingMiddleware, RateLimitPresets } from './middleware/rate-limiting'; // Available for future use
import { CSRFProtectionMiddleware } from './middleware/csrf-protection';
import { InputSanitizationMiddleware, SanitizationPresets } from './middleware/input-sanitization';

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: config.shopify.apiKey,
  apiSecretKey: config.shopify.apiSecret,
  scopes: config.shopify.scopes,
  hostName: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.HOST || 'localhost'),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: process.env.NODE_ENV === 'production' ? LogSeverity.Error : LogSeverity.Info,
    httpRequests: process.env.NODE_ENV === 'development',
  },
});

// Create Koa app
const app = new Koa();

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor(config);

// ===== SECURITY MIDDLEWARE SETUP =====

// 1. Security Headers (First - applies to all responses)
app.use(securityHeaders);

// 2. Input Sanitization (Early - sanitizes all input)
app.use(InputSanitizationMiddleware.create(SanitizationPresets.USER_INPUT));

// 3. Rate Limiting (Before authentication)
// Note: In production, you'd initialize Redis here
// For now, we'll skip rate limiting in development
if (process.env.NODE_ENV === 'production') {
  // const redis = new IORedis(process.env.REDIS_URL!);
  // app.use(RateLimitingMiddleware.create(redis, RateLimitPresets.GENERAL));
}

// 4. CSRF Protection (Before state-changing operations)
app.use(CSRFProtectionMiddleware.create({
  secret: config.shopify.apiSecret,
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
}));

// Session configuration
app.keys = [config.shopify.apiSecret];
app.use(session(app));

// Body parser
app.use(bodyParser({
  jsonLimit: '10mb',
  textLimit: '10mb',
  formLimit: '10mb',
}));

// Initialize Shopify app middleware
// Note: This would typically be handled by @shopify/shopify-app-koa
// For now, we'll use the basic auth middleware
app.use(verifyRequest());

// Static files
app.use(serve(join(__dirname, '../public')));

// Routes
const router = new Router();

// Health check
router.get('/health', async(ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
router.use('/api', apiRoutes.routes());
router.use('/webhooks', webhookRoutes.routes());
router.use('/auth', authRoutes.routes());
router.use('/monitoring', monitoringRoutes.routes());
router.use('/webhooks', gdprRoutes.routes()); // GDPR webhooks (mandatory for Shopify)
router.use('/billing', billingRoutes.routes()); // Billing and subscription management

// Swagger UI route
router.get('/docs', async(ctx) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DelayGuard API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  ctx.type = 'html';
  ctx.body = swaggerHtml;
});

// Swagger JSON route
router.get('/api/swagger.json', async(ctx) => {
  const fs = require('fs');
  const path = require('path');
  const swaggerPath = path.join(__dirname, '../docs/api/swagger.json');
  
  try {
    const swaggerData = fs.readFileSync(swaggerPath, 'utf8');
    ctx.type = 'json';
    ctx.body = swaggerData;
  } catch (error) {
    ctx.status = 404;
    ctx.body = { error: 'Swagger documentation not found' };
  }
});

// Main app route
// Public root route for health check
router.get('/', async(ctx) => {
  ctx.body = {
    status: 'success',
    message: 'DelayGuard API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      webhooks: '/webhooks',
      auth: '/auth',
      docs: '/docs',
      swagger: '/api/swagger.json',
    },
  };
});

// Authenticated dashboard route
router.get('/dashboard', verifyRequest(), async(ctx) => {
  ctx.body = 'DelayGuard App - Main Dashboard';
});

// Performance monitoring middleware
app.use(async(ctx, next) => {
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
      ip: ctx.ip,
    });
  }
});

// Error handling middleware
app.use(async(ctx, next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Request error occurred', error as Error);
    const statusCode = error instanceof Error && 'status' in error ? (error as Error & { status: number }).status : 500;
    ctx.status = statusCode;
    ctx.body = {
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error instanceof Error ? error.message : 'Unknown error',
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
    logger.info('✅ Database and queues initialized');
  } catch (error) {
    logger.error('Failed to initialize app', error as Error);
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
      logger.info(`🚀 DelayGuard server running on http://${HOST}:${PORT}`);
      logger.info(`📱 Shopify app URL: https://${HOST}:${PORT}`);
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
