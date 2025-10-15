import request from 'supertest';
import { callback } from '../setup/test-server';

describe('Delay Detection E2E Flow', () => {
  describe('Complete Delay Detection Flow', () => {
    it('should complete full delay detection flow', async() => {
      // 1. Health check
      const healthResponse = await request(callback)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('ok');

      // 2. Test delay detection with valid data
      const testResponse = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'ups',
        })
        .expect(200);
      
      expect(testResponse.body.trackingInfo).toBeDefined();
      expect(testResponse.body.delayResult).toBeDefined();
      expect(testResponse.body.trackingInfo.trackingNumber).toBe('1Z999AA1234567890');
      expect(testResponse.body.trackingInfo.carrierCode).toBe('ups');

      // 3. Test with different carrier
      const fedexResponse = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '1234567890',
          carrierCode: 'fedex',
        })
        .expect(200);
      
      expect(fedexResponse.body.trackingInfo).toBeDefined();
      expect(fedexResponse.body.delayResult).toBeDefined();
    });
  });

  describe('Delay Detection Error Handling', () => {
    it('should handle invalid tracking numbers', async() => {
      const response = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '',
          carrierCode: 'ups',
        })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing carrier code', async() => {
      const response = await request(callback)
        .post('/api/test-delay')
        .send({
          trackingNumber: '1Z999AA1234567890',
        })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    it('should handle completely empty request', async() => {
      const response = await request(callback)
        .post('/api/test-delay')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Delay Detection Performance', () => {
    it('should handle multiple concurrent delay detection requests', async() => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        request(callback)
          .post('/api/test-delay')
          .send({
            trackingNumber: `1Z999AA123456789${i}`,
            carrierCode: 'ups',
          }),
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.trackingInfo).toBeDefined();
        expect(response.body.delayResult).toBeDefined();
      });
    });
  });
});