import request from 'supertest';
import { callback } from '../setup/test-server';

describe('DelayGuard Integration Tests', () => {
  describe('Complete Order Processing Workflow', () => {
    it('should handle order processing workflow', async() => {
      // Test the complete workflow through API endpoints
      
      // 1. Check health
      const healthResponse = await request(callback)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('ok');

      // 2. Get settings
      const settingsResponse = await request(callback)
        .get('/api/settings')
        .expect(200);
      
      expect(settingsResponse.body.delayThreshold).toBeDefined();

      // 3. Test delay detection
      const testDelayResponse = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'ups',
        })
        .expect(200);
      
      expect(testDelayResponse.body.trackingInfo).toBeDefined();
      expect(testDelayResponse.body.delayResult).toBeDefined();

      // 4. Get alerts
      const alertsResponse = await request(callback)
        .get('/api/alerts')
        .expect(200);
      
      expect(alertsResponse.body.alerts).toBeDefined();

      // 5. Get orders
      const ordersResponse = await request(callback)
        .get('/api/orders')
        .expect(200);
      
      expect(ordersResponse.body.orders).toBeDefined();

      // 6. Get stats
      const statsResponse = await request(callback)
        .get('/api/stats')
        .expect(200);
      
      expect(statsResponse.body.totalAlerts).toBeDefined();
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle errors gracefully', async() => {
      // Test error handling for invalid data
      const response = await request(callback)
        .post('/api/test-delay')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });

  describe('API Consistency', () => {
    it('should maintain consistent API responses', async() => {
      // Test that all endpoints return consistent structure
      const endpoints = [
        '/health',
        '/api/settings',
        '/api/alerts',
        '/api/orders',
        '/api/stats',
      ];

      for (const endpoint of endpoints) {
        const response = await request(callback)
          .get(endpoint)
          .expect(200);
        
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
      }
    });
  });
});