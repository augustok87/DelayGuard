import { ApiClient } from '../../../utils/api-client';
import { getSessionToken } from '@shopify/app-bridge/utilities';

// Mock App Bridge
jest.mock('@shopify/app-bridge/utilities');
const mockGetSessionToken = getSessionToken as jest.MockedFunction<typeof getSessionToken>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiClient', () => {
  let client: ApiClient;
  let mockApp: any;

  beforeEach(() => {
    client = new ApiClient({ baseUrl: '/api' });
    mockApp = { test: 'app' };
    
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Token Management', () => {
    it('should get session token from App Bridge', async () => {
      const testToken = 'test-session-token';
      mockGetSessionToken.mockResolvedValueOnce(testToken);
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      await client.getAlerts();

      expect(mockGetSessionToken).toHaveBeenCalledWith(mockApp);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/alerts',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testToken}`,
          }),
        })
      );
    });

    it('should make request without token if App Bridge not initialized', async () => {
      // Don't set app
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      await client.getAlerts();

      expect(mockGetSessionToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/alerts',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.anything(),
          }),
        })
      );
    });

    it('should handle token retrieval errors gracefully', async () => {
      mockGetSessionToken.mockRejectedValueOnce(new Error('Token error'));
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const result = await client.getAlerts();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('GET /api/alerts', () => {
    it('should fetch alerts successfully', async () => {
      const mockAlerts = [{ id: '1', status: 'sent' }];
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts }),
      } as Response);

      const result = await client.getAlerts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlerts);
    });

    it('should handle API errors', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized', code: 'AUTH_ERROR' }),
      } as Response);

      const result = await client.getAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(result.code).toBe('AUTH_ERROR');
    });

    it('should handle network errors', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('GET /api/orders', () => {
    it('should fetch orders with default limit', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      await client.getOrders();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/orders',
        expect.any(Object)
      );
    });

    it('should fetch orders with custom limit', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      await client.getOrders(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/orders?limit=10',
        expect.any(Object)
      );
    });
  });

  describe('GET /api/settings', () => {
    it('should fetch settings successfully', async () => {
      const mockSettings = { delay_threshold_days: 2, email_enabled: true };
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSettings }),
      } as Response);

      const result = await client.getSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings successfully', async () => {
      const newSettings = { delay_threshold_days: 3 };
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Settings updated' }),
      } as Response);

      const result = await client.updateSettings(newSettings);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(newSettings),
        })
      );
    });

    it('should handle validation errors', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'Invalid threshold',
          code: 'INVALID_THRESHOLD',
        }),
      } as Response);

      const result = await client.updateSettings({ delay_threshold_days: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid threshold');
    });
  });

  describe('GET /api/analytics', () => {
    it('should fetch analytics data', async () => {
      const mockAnalytics = {
        alerts: { total_alerts: 10 },
        orders: { total_orders: 100 },
      };
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnalytics }),
      } as Response);

      const result = await client.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
    });
  });

  describe('GET /api/shop', () => {
    it('should fetch shop information', async () => {
      const mockShop = { shop_domain: 'test.myshopify.com' };
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockShop }),
      } as Response);

      const result = await client.getShop();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockShop);
    });
  });

  describe('GET /api/health', () => {
    it('should check API health without authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'ok', timestamp: new Date().toISOString() },
        }),
      } as Response);

      const result = await client.health();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('ok');
    });
  });

  describe('Request Headers', () => {
    it('should include Content-Type header', async () => {
      mockGetSessionToken.mockResolvedValueOnce('token');
      
      client.setApp(mockApp);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      await client.getAlerts();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});

