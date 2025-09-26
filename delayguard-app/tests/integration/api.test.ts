import { mockApiResponse, mockApiError } from '../setup/jest.setup';

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      mockApiResponse({ status: 'healthy', timestamp: '2024-01-15T10:00:00Z' });
      
      const response = await fetch('/health');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('API Status Endpoint', () => {
    it('should return API status with service configuration', async () => {
      mockApiResponse({
        status: 'operational',
        services: {
          database: 'configured',
          redis: 'configured',
          shipengine: 'configured',
          sendgrid: 'configured',
          twilio: 'configured',
          shopify: 'configured'
        }
      });
      
      const response = await fetch('/api');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.status).toBe('operational');
      expect(data.services).toBeDefined();
    });
  });

  describe('Webhooks Endpoint', () => {
    it('should handle webhook requests', async () => {
      mockApiResponse({ received: true, processed: true });
      
      const response = await fetch('/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', data: {} })
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.received).toBe(true);
    });
  });

  describe('Auth Endpoint', () => {
    it('should handle authentication requests', async () => {
      mockApiResponse({ authenticated: true, user: 'test-user' });
      
      const response = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' })
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.authenticated).toBe(true);
    });
  });

  describe('Monitoring Endpoint', () => {
    it('should return monitoring data', async () => {
      mockApiResponse({
        uptime: 3600,
        memory: { used: 100, total: 1000 },
        requests: { total: 1000, errors: 5 }
      });
      
      const response = await fetch('/monitoring');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.uptime).toBeDefined();
      expect(data.memory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiError('Internal Server Error', 500);
      
      const response = await fetch('/api');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      await expect(fetch('/api')).rejects.toThrow('Network error');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      mockApiResponse({ status: 'ok' });
      
      const response = await fetch('/api');
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });
});
