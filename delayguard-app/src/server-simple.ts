/**
 * Simple Development Server
 * Runs without external dependencies (Redis, PostgreSQL)
 * For local development and testing
 */

import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import { join } from 'path';
import { logger } from './utils/logger';

// Create Koa app
const app = new Koa();
const router = new Router();

// Simple middleware
app.use(async(ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// Body parser
app.use(bodyParser());

// Static files
app.use(serve(join(__dirname, '../public')));

// Simple health check
router.get('/health', async(ctx) => {
  ctx.body = {
    status: 'ok',
    mode: 'development-simple',
    timestamp: new Date().toISOString(),
    message: 'Running in simple dev mode (no external dependencies)',
  };
});

// API mock endpoints for frontend development
router.get('/api/settings', async(ctx) => {
  ctx.body = {
    delayThreshold: 2,
    notificationTemplate: 'default',
    emailNotifications: true,
    smsNotifications: false,
  };
});

router.get('/api/alerts', async(ctx) => {
  ctx.body = [
    {
      id: '1',
      orderId: 'ORD-001',
      customerName: 'John Doe',
      delayDays: 3,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];
});

router.get('/api/orders', async(ctx) => {
  ctx.body = [
    {
      id: '1',
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      status: 'pending',
      trackingNumber: 'TRACK123',
      createdAt: new Date().toISOString(),
    },
  ];
});

router.get('/api/stats', async(ctx) => {
  ctx.body = {
    totalAlerts: 10,
    activeAlerts: 3,
    resolvedAlerts: 7,
    avgResolutionTime: '2.5 days',
  };
});

// GDPR endpoints (mocked)
router.post('/webhooks/gdpr/customers/data_request', async(ctx) => {
  ctx.body = { success: true, message: 'GDPR data request received (dev mode)' };
});

router.post('/webhooks/gdpr/customers/redact', async(ctx) => {
  ctx.body = { success: true, message: 'GDPR redaction received (dev mode)' };
});

router.post('/webhooks/gdpr/shop/redact', async(ctx) => {
  ctx.body = { success: true, message: 'Shop redaction received (dev mode)' };
});

// Billing endpoints (mocked)
router.get('/billing/plans', async(ctx) => {
  ctx.body = {
    success: true,
    plans: {
      free: { name: 'Free Plan', price: 0, monthly_alert_limit: 50 },
      pro: { name: 'Pro Plan', price: 7, trial_days: 14 },
      enterprise: { name: 'Enterprise Plan', price: 25, trial_days: 14 },
    },
  };
});

// Mount routes
app.use(router.routes());
app.use(router.allowedMethods());

// Error handling
app.on('error', (err) => {
  logger.error('Server error', err);
});

// Start server
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflict with webpack
const server = app.listen(PORT, () => {
  logger.info(`🚀 Simple dev server running on http://localhost:${PORT}`);
  logger.info('📝 No external dependencies required (Redis/PostgreSQL not needed)');
  logger.info('✨ Frontend dev server will run on http://localhost:3000');
});

export { app, server };

