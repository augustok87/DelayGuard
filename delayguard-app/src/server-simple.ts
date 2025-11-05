/**
 * Simple Development Server
 * Runs without external dependencies (Redis, PostgreSQL)
 * For local development and testing
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import { join } from 'path';
import { logger } from './utils/logger';
import { query, setupDatabase } from './database/connection';

// Type definitions for database query results
interface CountResult {
  count: string;
}

interface AvgResolutionResult {
  avg_days: string | null;
  resolved_count: string;
}

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
  try {
    // Calculate real metrics from database

    // Total alerts (all delay alerts created)
    const totalAlertsResult = await query(`
      SELECT COUNT(*) as count
      FROM delay_alerts
    `) as CountResult[];
    const totalAlerts = parseInt(totalAlertsResult[0].count);

    // Active alerts (orders not yet delivered or out for delivery)
    const activeAlertsResult = await query(`
      SELECT COUNT(DISTINCT da.id) as count
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      WHERE o.tracking_status NOT IN ('DELIVERED', 'OUT_FOR_DELIVERY')
    `) as CountResult[];
    const activeAlerts = parseInt(activeAlertsResult[0].count);

    // Resolved alerts (orders delivered or out for delivery)
    const resolvedAlertsResult = await query(`
      SELECT COUNT(DISTINCT da.id) as count
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      WHERE o.tracking_status IN ('DELIVERED', 'OUT_FOR_DELIVERY')
    `) as CountResult[];
    const resolvedAlerts = parseInt(resolvedAlertsResult[0].count);

    // Avg resolution time (time from alert created to delivery for resolved orders)
    const avgResolutionResult = await query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (o.updated_at - da.created_at)) / 86400) as avg_days,
        COUNT(*) as resolved_count
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      WHERE o.tracking_status IN ('DELIVERED', 'OUT_FOR_DELIVERY')
        AND o.updated_at > da.created_at
    `) as AvgResolutionResult[];

    const avgDays = avgResolutionResult[0].avg_days
      ? Math.round(parseFloat(avgResolutionResult[0].avg_days) * 10) / 10
      : 0;
    const avgResolutionTime = resolvedAlerts > 0
      ? `${avgDays} ${avgDays === 1 ? 'day' : 'days'}`
      : 'N/A';

    ctx.body = {
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      avgResolutionTime,
    };
  } catch (error) {
    logger.error('Error fetching stats:', error as Error);
    // Fallback to mock data if database unavailable
    ctx.body = {
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      avgResolutionTime: 'N/A',
    };
  }
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

// Start server with database initialization
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflict with webpack

async function startServer() {
  try {
    // Initialize database connection
    await setupDatabase();
    logger.info('✅ Database initialized successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Simple dev server running on http://localhost:${PORT}`);
      logger.info('📊 Real-time metrics enabled (connected to PostgreSQL)');
      logger.info('✨ Frontend dev server will run on http://localhost:3000');
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

const serverPromise = startServer();

export { app, serverPromise };

