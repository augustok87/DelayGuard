import Router from 'koa-router';
import { verifyRequest } from '@shopify/koa-shopify-auth';
import { query } from '../database/connection';
import { getQueueStats } from '../queue/setup';

const router = new Router();

// Apply authentication to all API routes
router.use(verifyRequest());

// Get app settings
router.get('/settings', async (ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;
    
    const result = await query(
      'SELECT * FROM app_settings WHERE shop_id = (SELECT id FROM shops WHERE shop_domain = $1)',
      [shop]
    );

    if (result.rows.length === 0) {
      // Return default settings if none exist
      ctx.body = {
        delayThresholdDays: 2,
        emailEnabled: true,
        smsEnabled: false,
        notificationTemplate: 'default'
      };
    } else {
      const settings = result.rows[0];
      ctx.body = {
        delayThresholdDays: settings.delay_threshold_days,
        emailEnabled: settings.email_enabled,
        smsEnabled: settings.sms_enabled,
        notificationTemplate: settings.notification_template
      };
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch settings' };
  }
});

// Update app settings
router.put('/settings', async (ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;
    const { delayThresholdDays, emailEnabled, smsEnabled, notificationTemplate } = ctx.request.body;

    // Validate input
    if (delayThresholdDays < 0 || delayThresholdDays > 30) {
      ctx.status = 400;
      ctx.body = { error: 'Delay threshold must be between 0 and 30 days' };
      return;
    }

    if (typeof emailEnabled !== 'boolean' || typeof smsEnabled !== 'boolean') {
      ctx.status = 400;
      ctx.body = { error: 'Email and SMS settings must be boolean values' };
      return;
    }

    // Get shop ID
    const shopResult = await query(
      'SELECT id FROM shops WHERE shop_domain = $1',
      [shop]
    );

    if (shopResult.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: 'Shop not found' };
      return;
    }

    const shopId = shopResult.rows[0].id;

    // Upsert settings
    await query(`
      INSERT INTO app_settings (
        shop_id, 
        delay_threshold_days, 
        email_enabled, 
        sms_enabled, 
        notification_template
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (shop_id)
      DO UPDATE SET
        delay_threshold_days = EXCLUDED.delay_threshold_days,
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        notification_template = EXCLUDED.notification_template,
        updated_at = CURRENT_TIMESTAMP
    `, [shopId, delayThresholdDays, emailEnabled, smsEnabled, notificationTemplate]);

    ctx.body = { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to update settings' };
  }
});

// Get delay alerts
router.get('/alerts', async (ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;
    const { page = 1, limit = 20 } = ctx.query;

    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(`
      SELECT 
        da.*,
        o.order_number,
        o.customer_name,
        o.customer_email,
        f.tracking_number,
        f.carrier_code
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      LEFT JOIN fulfillments f ON da.fulfillment_id = f.id
      WHERE s.shop_domain = $1
      ORDER BY da.created_at DESC
      LIMIT $2 OFFSET $3
    `, [shop, Number(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
    `, [shop]);

    ctx.body = {
      alerts: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
      }
    };
  } catch (error) {
    console.error('Error fetching alerts:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch alerts' };
  }
});

// Get queue statistics
router.get('/stats', async (ctx) => {
  try {
    const stats = await getQueueStats();
    ctx.body = stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch statistics' };
  }
});

// Test delay detection
router.post('/test-delay', async (ctx) => {
  try {
    const { trackingNumber, carrierCode } = ctx.request.body;

    if (!trackingNumber || !carrierCode) {
      ctx.status = 400;
      ctx.body = { error: 'Tracking number and carrier code are required' };
      return;
    }

    // Import services dynamically to avoid circular dependencies
    const { CarrierService } = await import('../services/carrier-service');
    const { DelayDetectionService } = await import('../services/delay-detection-service');

    const carrierService = new CarrierService();
    const delayDetectionService = new DelayDetectionService();

    const trackingInfo = await carrierService.getTrackingInfo(trackingNumber, carrierCode);
    const delayResult = await delayDetectionService.checkForDelays(trackingInfo);

    ctx.body = {
      trackingInfo,
      delayResult
    };
  } catch (error) {
    console.error('Error testing delay detection:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to test delay detection' };
  }
});

// Get recent orders
router.get('/orders', async (ctx) => {
  try {
    const shop = ctx.state.shopify.session.shop;
    const { page = 1, limit = 20 } = ctx.query;

    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(`
      SELECT 
        o.*,
        f.tracking_number,
        f.carrier_code,
        f.status as fulfillment_status
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      LEFT JOIN fulfillments f ON o.id = f.order_id
      WHERE s.shop_domain = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `, [shop, Number(limit), offset]);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM orders o JOIN shops s ON o.shop_id = s.id WHERE s.shop_domain = $1',
      [shop]
    );

    ctx.body = {
      orders: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
      }
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch orders' };
  }
});

export { router as apiRoutes };
