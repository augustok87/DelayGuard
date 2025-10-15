// Simplified server for testing without ESM dependencies
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

const app = new Koa();
const router = new Router();

// Body parser
app.use(bodyParser({
  jsonLimit: '10mb',
  textLimit: '10mb',
  formLimit: '10mb',
}));

// Health check
router.get('/health', async(ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes for testing
router.get('/api/settings', async(ctx) => {
  ctx.body = {
    delayThreshold: 2,
    emailEnabled: true,
    smsEnabled: false,
    notificationTemplate: 'default',
  };
});

router.put('/api/settings', async(ctx) => {
  ctx.body = { success: true };
});

router.get('/api/alerts', async(ctx) => {
  ctx.body = {
    alerts: [],
    total: 0,
    page: 1,
    limit: 20,
  };
});

router.get('/api/orders', async(ctx) => {
  ctx.body = {
    orders: [],
    total: 0,
    page: 1,
    limit: 20,
  };
});

router.get('/api/stats', async(ctx) => {
  ctx.body = {
    totalAlerts: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
    averageDelayDays: 0,
  };
});

router.post('/api/test-delay', async(ctx) => {
  const { trackingNumber, carrierCode } = ctx.request.body as any;
  
  if (!trackingNumber || !carrierCode) {
    ctx.status = 400;
    ctx.body = { error: 'Tracking number and carrier code are required' };
    return;
  }

  ctx.body = {
    trackingInfo: {
      trackingNumber,
      carrierCode,
      status: 'in_transit',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    delayResult: {
      isDelayed: false,
      delayDays: 0,
      reason: 'on_time',
    },
  };
});

// Main app route
router.get('/', async(ctx) => {
  ctx.body = {
    status: 'success',
    message: 'DelayGuard API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  };
});

// Error handling middleware
app.use(async(ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    ctx.status = 500;
    ctx.body = {
      error: 'Internal server error',
    };
  }
});

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

// Create a callback for supertest
const callback = app.callback();

export { app, callback };
