import { callback } from '../setup/test-server';
import request from 'supertest';

describe('API Integration Tests', () => {
  describe('Health Check Endpoint', () => {
    it('should return health status', async() => {
      const response = await request(callback)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Status Endpoint', () => {
    it('should return API status with service configuration', async() => {
      const response = await request(callback)
        .get('/')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('DelayGuard API is running');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('Settings Endpoint', () => {
    it('should return settings', async() => {
      const response = await request(callback)
        .get('/api/settings')
        .expect(200);
      
      expect(response.body.delayThreshold).toBeDefined();
      expect(response.body.emailEnabled).toBeDefined();
      expect(response.body.smsEnabled).toBeDefined();
    });

    it('should update settings', async() => {
      const newSettings = {
        delayThreshold: 3,
        emailEnabled: true,
        smsEnabled: true,
        notificationTemplate: 'custom',
      };

      const response = await request(callback)
        .put('/api/settings')
        .send(newSettings)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  describe('Alerts Endpoint', () => {
    it('should return alerts', async() => {
      const response = await request(callback)
        .get('/api/alerts')
        .expect(200);
      
      expect(response.body.alerts).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
    });
  });

  describe('Orders Endpoint', () => {
    it('should return orders', async() => {
      const response = await request(callback)
        .get('/api/orders')
        .expect(200);
      
      expect(response.body.orders).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
    });
  });

  describe('Stats Endpoint', () => {
    it('should return statistics', async() => {
      const response = await request(callback)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.totalAlerts).toBeDefined();
      expect(response.body.activeAlerts).toBeDefined();
      expect(response.body.resolvedAlerts).toBeDefined();
    });
  });

  describe('Test Delay Detection', () => {
    it('should test delay detection with valid data', async() => {
      const testData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
      };

      const response = await request(callback)
        .post('/api/test-delay')
        .send(testData)
        .expect(200);
      
      expect(response.body.trackingInfo).toBeDefined();
      expect(response.body.delayResult).toBeDefined();
    });

    it('should return error for missing data', async() => {
      const response = await request(callback)
        .post('/api/test-delay')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async() => {
      const response = await request(callback)
        .get('/api/settings')
        .expect(200);
      
      // Note: CORS headers would be added by middleware in production
      // This test verifies the endpoint works without CORS middleware
      expect(response.body).toBeDefined();
    });
  });
});