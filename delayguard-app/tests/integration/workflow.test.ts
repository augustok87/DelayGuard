import request from 'supertest';
import { app } from '../../src/server';
import { setupDatabase, query } from '../../src/database/connection';
import { setupQueues } from '../../src/queue/setup';

describe('DelayGuard Integration Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
    await setupQueues();
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM delay_alerts');
    await query('DELETE FROM fulfillments');
    await query('DELETE FROM orders');
    await query('DELETE FROM shops');
  });

  describe('Complete Order Processing Workflow', () => {
    it('should process order from webhook to delay detection', async () => {
      // 1. Register shop
      const shopResult = await query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['test-shop.myshopify.com', 'test-token', ['read_orders', 'write_orders']]);

      const shopId = shopResult.rows[0].id;

      // 2. Set up app settings
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled)
        VALUES ($1, $2, $3, $4)
      `, [shopId, 2, true, false]);

      // 3. Simulate order webhook
      const orderWebhookData = {
        id: 12345,
        name: '1001',
        customer: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        fulfillments: [{
          id: 'fulfillment-123',
          tracking_info: {
            number: '1Z999AA1234567890',
            company: 'ups',
            url: 'https://tracking.ups.com/1Z999AA1234567890'
          },
          status: 'shipped'
        }],
        fulfillment_status: 'fulfilled'
      };

      const webhookResponse = await request(app)
        .post('/webhooks/orders/updated')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', 'test-hmac') // In real test, would be properly calculated
        .send(orderWebhookData);

      expect(webhookResponse.status).toBe(200);

      // 4. Verify order was stored
      const orderResult = await query(
        'SELECT * FROM orders WHERE shopify_order_id = $1',
        ['12345']
      );
      expect(orderResult.rows).toHaveLength(1);
      expect(orderResult.rows[0].order_number).toBe('1001');
      expect(orderResult.rows[0].customer_name).toBe('John Doe');

      // 5. Verify fulfillment was stored
      const fulfillmentResult = await query(
        'SELECT * FROM fulfillments WHERE shopify_fulfillment_id = $1',
        ['fulfillment-123']
      );
      expect(fulfillmentResult.rows).toHaveLength(1);
      expect(fulfillmentResult.rows[0].tracking_number).toBe('1Z999AA1234567890');
      expect(fulfillmentResult.rows[0].carrier_code).toBe('ups');
    });

    it('should handle fulfillment update webhook', async () => {
      const fulfillmentWebhookData = {
        id: 'fulfillment-456',
        order_id: 12345,
        tracking_info: {
          number: '1Z999AA9876543210',
          company: 'fedex',
          url: 'https://tracking.fedex.com/1Z999AA9876543210'
        },
        status: 'shipped'
      };

      const webhookResponse = await request(app)
        .post('/webhooks/fulfillments/updated')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', 'test-hmac')
        .send(fulfillmentWebhookData);

      expect(webhookResponse.status).toBe(200);

      // Verify fulfillment was updated
      const fulfillmentResult = await query(
        'SELECT * FROM fulfillments WHERE shopify_fulfillment_id = $1',
        ['fulfillment-456']
      );
      expect(fulfillmentResult.rows).toHaveLength(1);
      expect(fulfillmentResult.rows[0].tracking_number).toBe('1Z999AA9876543210');
      expect(fulfillmentResult.rows[0].carrier_code).toBe('fedex');
    });
  });

  describe('API Endpoints', () => {
    let shopId: number;

    beforeEach(async () => {
      // Set up test shop
      const shopResult = await query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['test-shop.myshopify.com', 'test-token', ['read_orders', 'write_orders']]);

      shopId = shopResult.rows[0].id;

      // Set up app settings
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled)
        VALUES ($1, $2, $3, $4)
      `, [shopId, 2, true, false]);
    });

    it('should get app settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('delayThresholdDays');
      expect(response.body).toHaveProperty('emailEnabled');
      expect(response.body).toHaveProperty('smsEnabled');
      expect(response.body.delayThresholdDays).toBe(2);
      expect(response.body.emailEnabled).toBe(true);
    });

    it('should update app settings', async () => {
      const newSettings = {
        delayThresholdDays: 3,
        emailEnabled: true,
        smsEnabled: true,
        notificationTemplate: 'friendly'
      };

      const response = await request(app)
        .put('/api/settings')
        .send(newSettings)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify settings were updated
      const settingsResult = await query(
        'SELECT * FROM app_settings WHERE shop_id = $1',
        [shopId]
      );
      expect(settingsResult.rows[0].delay_threshold_days).toBe(3);
      expect(settingsResult.rows[0].sms_enabled).toBe(true);
    });

    it('should get delay alerts', async () => {
      // Create test alert
      const orderResult = await query(`
        INSERT INTO orders (shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [shopId, '12346', '1002', 'Jane Doe', 'jane@example.com', 'paid']);

      const orderId = orderResult.rows[0].id;

      await query(`
        INSERT INTO delay_alerts (order_id, delay_days, delay_reason, estimated_delivery_date)
        VALUES ($1, $2, $3, $4)
      `, [orderId, 3, 'DATE_DELAY', '2024-02-15']);

      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].order_number).toBe('1002');
      expect(response.body.alerts[0].delay_days).toBe(3);
    });

    it('should get queue statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('delayCheck');
      expect(response.body).toHaveProperty('notifications');
      expect(response.body.delayCheck).toHaveProperty('waiting');
      expect(response.body.delayCheck).toHaveProperty('active');
      expect(response.body.delayCheck).toHaveProperty('completed');
      expect(response.body.delayCheck).toHaveProperty('failed');
    });

    it('should test delay detection', async () => {
      const testData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups'
      };

      const response = await request(app)
        .post('/api/test-delay')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('trackingInfo');
      expect(response.body).toHaveProperty('delayResult');
      expect(response.body.trackingInfo).toHaveProperty('trackingNumber');
      expect(response.body.delayResult).toHaveProperty('isDelayed');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid webhook HMAC', async () => {
      const response = await request(app)
        .post('/webhooks/orders/updated')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', 'invalid-hmac')
        .send({ id: 12345, name: '1001' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle missing required fields in settings update', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should handle invalid delay threshold', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          delayThresholdDays: -1, // Invalid negative value
          emailEnabled: true,
          smsEnabled: false
        })
        .expect(400);

      expect(response.body.error).toContain('between 0 and 30 days');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent webhook requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const orderData = {
          id: 12345 + i,
          name: `100${i}`,
          customer: {
            first_name: 'John',
            last_name: 'Doe',
            email: `john${i}@example.com`
          },
          fulfillments: [],
          fulfillment_status: 'unfulfilled'
        };

        promises.push(
          request(app)
            .post('/webhooks/orders/updated')
            .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
            .set('X-Shopify-Hmac-Sha256', 'test-hmac')
            .send(orderData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all orders were created
      const orderCount = await query('SELECT COUNT(*) FROM orders');
      expect(parseInt(orderCount.rows[0].count)).toBeGreaterThanOrEqual(10);
    });

    it('should respond to API requests within acceptable time', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/settings')
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Should respond within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
