import request from 'supertest';
import { callback } from '../setup/test-server';

describe('Analytics Dashboard E2E Flow', () => {
  describe('Complete Dashboard Flow', () => {
    it('should complete full analytics dashboard flow', async() => {
      // 1. Health check
      const healthResponse = await request(callback)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('ok');

      // 2. Get dashboard data
      const statsResponse = await request(callback)
        .get('/api/stats')
        .expect(200);
      
      expect(statsResponse.body.totalAlerts).toBeDefined();
      expect(statsResponse.body.activeAlerts).toBeDefined();

      // 3. Get alerts data
      const alertsResponse = await request(callback)
        .get('/api/alerts')
        .expect(200);
      
      expect(alertsResponse.body.alerts).toBeDefined();
      expect(alertsResponse.body.total).toBeDefined();

      // 4. Get orders data
      const ordersResponse = await request(callback)
        .get('/api/orders')
        .expect(200);
      
      expect(ordersResponse.body.orders).toBeDefined();
      expect(ordersResponse.body.total).toBeDefined();

      // 5. Test delay detection
      const testResponse = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'ups',
        })
        .expect(200);
      
      expect(testResponse.body.trackingInfo).toBeDefined();
      expect(testResponse.body.delayResult).toBeDefined();
    });
  });

  describe('Dashboard Data Integration', () => {
    it('should integrate all dashboard data sources', async() => {
      // Test that all dashboard data sources work together
      const [stats, alerts, orders] = await Promise.all([
        request(callback).get('/api/stats'),
        request(callback).get('/api/alerts'),
        request(callback).get('/api/orders'),
      ]);

      // Verify all responses are successful
      expect(stats.status).toBe(200);
      expect(alerts.status).toBe(200);
      expect(orders.status).toBe(200);

      // Verify data structure consistency
      expect(typeof stats.body.totalAlerts).toBe('number');
      expect(Array.isArray(alerts.body.alerts)).toBe(true);
      expect(Array.isArray(orders.body.orders)).toBe(true);
    });
  });

  describe('Error Handling in Dashboard Flow', () => {
    it('should handle errors gracefully in dashboard flow', async() => {
      // Test error handling for invalid requests
      const response = await request(callback)
        .post('/api/test-delay')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });
});