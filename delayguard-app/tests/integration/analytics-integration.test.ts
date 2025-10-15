import request from 'supertest';
import { callback } from '../setup/test-server';

describe('Analytics Integration Tests', () => {
  describe('Analytics Data Flow', () => {
    it('should provide analytics data through API', async() => {
      // Test analytics data flow through the API
      const response = await request(callback)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.totalAlerts).toBeDefined();
      expect(response.body.activeAlerts).toBeDefined();
      expect(response.body.resolvedAlerts).toBeDefined();
      expect(response.body.averageDelayDays).toBeDefined();
    });

    it('should handle analytics requests consistently', async() => {
      // Test multiple analytics requests
      const responses = await Promise.all([
        request(callback).get('/api/stats'),
        request(callback).get('/api/alerts'),
        request(callback).get('/api/orders'),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should return performance data', async() => {
      const response = await request(callback)
        .get('/api/stats')
        .expect(200);
      
      // Verify performance metrics structure
      expect(typeof response.body.totalAlerts).toBe('number');
      expect(typeof response.body.activeAlerts).toBe('number');
      expect(typeof response.body.resolvedAlerts).toBe('number');
      expect(typeof response.body.averageDelayDays).toBe('number');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across requests', async() => {
      // Make multiple requests to ensure data consistency
      const [stats1, stats2] = await Promise.all([
        request(callback).get('/api/stats'),
        request(callback).get('/api/stats'),
      ]);

      expect(stats1.body).toEqual(stats2.body);
    });
  });
});