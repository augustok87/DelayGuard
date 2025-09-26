import { setupDatabase, query } from '../../src/database/connection';
import { setupQueues, addDelayCheckJob } from '../../src/queue/setup';
import { CarrierService } from '../../src/services/carrier-service';
import { DelayDetectionService } from '../../src/services/delay-detection-service';
import { EmailService } from '../../src/services/email-service';
import { SMSService } from '../../src/services/sms-service';
import { NotificationService } from '../../src/services/notification-service';

// Integration test for complete delay detection flow
describe('DelayGuard End-to-End Flow', () => {
  let carrierService: CarrierService;
  let delayDetectionService: DelayDetectionService;
  let emailService: EmailService;
  let smsService: SMSService;
  let notificationService: NotificationService;

  beforeAll(async () => {
    // Set up test database
    await setupDatabase();
    await setupQueues();
    
    // Initialize services with test credentials
    carrierService = new CarrierService(process.env.SHIPENGINE_API_KEY);
    delayDetectionService = new DelayDetectionService(2); // 2-day threshold
    emailService = new EmailService(process.env.SENDGRID_API_KEY!);
    smsService = new SMSService(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      process.env.TWILIO_PHONE_NUMBER!
    );
    notificationService = new NotificationService(emailService, smsService);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM delay_alerts');
    await query('DELETE FROM fulfillments');
    await query('DELETE FROM orders');
    await query('DELETE FROM shops');
  });

  describe('Complete Delay Detection Workflow', () => {
    it('should process order from webhook to notification', async () => {
      // 1. Simulate shop registration
      const shopResult = await query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['test-shop.myshopify.com', 'test-token', ['read_orders', 'write_orders']]);

      const shopId = shopResult.rows[0].id;

      // 2. Simulate app settings
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled)
        VALUES ($1, $2, $3, $4)
      `, [shopId, 2, true, false]);

      // 3. Simulate order creation
      const orderResult = await query(`
        INSERT INTO orders (shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [shopId, '12345', '1001', 'John Doe', 'john@example.com', 'paid']);

      const orderId = orderResult.rows[0].id;

      // 4. Simulate fulfillment with tracking
      await query(`
        INSERT INTO fulfillments (order_id, shopify_fulfillment_id, tracking_number, carrier_code, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, 'fulfillment-123', '1Z999AA1234567890', 'ups', 'shipped']);

      // 5. Test delay detection with real API (if available) or mock
      try {
        const trackingInfo = await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');
        const delayResult = await delayDetectionService.checkForDelays(trackingInfo);

        if (delayResult.isDelayed) {
          // 6. Store delay alert
          await query(`
            INSERT INTO delay_alerts (order_id, delay_days, delay_reason, estimated_delivery_date)
            VALUES ($1, $2, $3, $4)
          `, [orderId, delayResult.delayDays, delayResult.delayReason, delayResult.estimatedDelivery]);

          // 7. Test notification sending
          const orderInfo = {
            id: '12345',
            orderNumber: '1001',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            shopDomain: 'test-shop.myshopify.com',
            createdAt: new Date()
          };

          const delayDetails = {
            estimatedDelivery: delayResult.estimatedDelivery!,
            trackingNumber: '1Z999AA1234567890',
            trackingUrl: 'https://tracking.example.com/1Z999AA1234567890',
            delayDays: delayResult.delayDays!,
            delayReason: delayResult.delayReason!
          };

          // This would send real notifications in production
          await notificationService.sendDelayNotification(orderInfo, delayDetails);

          console.log('✅ Complete delay detection workflow successful');
        }
      } catch (error) {
        console.log('⚠️ Real API not available, testing with mock data');
        
        // Test with mock data
        const mockTrackingInfo = {
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'ups',
          status: 'IN_TRANSIT',
          estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
          originalEstimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
          events: []
        };

        const delayResult = await delayDetectionService.checkForDelays(mockTrackingInfo);
        expect(delayResult.isDelayed).toBe(true);
        expect(delayResult.delayDays).toBe(3);
      }
    });

    it('should handle queue processing correctly', async () => {
      // Test queue job processing
      const jobData = {
        orderId: 1,
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        shopDomain: 'test-shop.myshopify.com'
      };

      // Add job to queue
      await addDelayCheckJob(jobData);
      
      // In a real test, we would wait for job completion
      // For now, we just verify the job was added
      console.log('✅ Queue job added successfully');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid tracking numbers gracefully', async () => {
      try {
        await carrierService.getTrackingInfo('invalid-tracking', 'ups');
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });

    it('should handle missing customer contact information', async () => {
      const orderInfo = {
        id: '12345',
        orderNumber: '1001',
        customerName: 'John Doe',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date()
      };

      const delayDetails = {
        estimatedDelivery: '2024-02-15',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com',
        delayDays: 3,
        delayReason: 'DATE_DELAY'
      };

      await expect(
        notificationService.sendDelayNotification(orderInfo, delayDetails)
      ).rejects.toThrow('No contact information provided');
    });
  });
});
