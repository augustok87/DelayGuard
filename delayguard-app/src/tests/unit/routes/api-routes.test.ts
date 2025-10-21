import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import jwt from 'jsonwebtoken';
import { apiRoutes } from '../../../routes/api';

// Mock database connection
jest.mock('../../../database/connection');
import { query } from '../../../database/connection';
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('API Routes', () => {
  let app: Koa;
  let testToken: string;
  const testShop = 'test-store.myshopify.com';
  
  const mockShopData = {
    id: 'shop-123',
    access_token: 'test-access-token',
    scope: 'read_products,write_orders',
    shop_name: 'Test Store',
  };

  // Helper to mock authentication
  const mockAuth = () => {
    mockQuery.mockResolvedValueOnce([mockShopData]);
  };
  
  beforeAll(() => {
    // Set up environment variables for testing
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    process.env.SHOPIFY_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    // Create fresh app for each test
    app = new Koa();
    app.use(bodyParser());
    app.use(apiRoutes.routes());
    app.use(apiRoutes.allowedMethods());

    // Create valid test token (Shopify session token format)
    testToken = jwt.sign(
      {
        iss: `https://${testShop}/admin`,
        dest: `https://${testShop}`,
        aud: 'test-api-key',
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        jti: 'jwt-123',
        sid: 'session-123',
      },
      'test-secret'
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/alerts', () => {
    it('should return alerts for authenticated shop', async () => {
      const mockAlerts = [
        {
          id: '1',
          order_id: 'order-1',
          order_number: '1001',
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
          total_price: '99.99',
          status: 'sent',
          created_at: '2025-10-21T12:00:00.000Z',
        },
      ];

      mockAuth(); // Mock authentication
      mockQuery.mockResolvedValueOnce(mockAlerts); // Mock alerts query

      const response = await request(app.callback())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAlerts,
        count: 1,
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.callback())
        .get('/api/alerts')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockAuth();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app.callback())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch alerts',
      });
    });

    it('should return empty array when no alerts found', async () => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });
  });

  describe('GET /api/orders', () => {
    it('should return orders for authenticated shop', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: '1001',
          customer_email: 'test@example.com',
          alert_count: 2,
          created_at: '2025-10-21T12:00:00.000Z',
        },
      ];

      mockAuth();
      mockQuery.mockResolvedValueOnce(mockOrders);

      const response = await request(app.callback())
        .get('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOrders,
        count: 1,
      });
    });

    it('should respect limit query parameter', async () => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .get('/api/orders?limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [testShop, 10]
      );
    });

    it('should use default limit when not provided', async () => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .get('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [testShop, 50] // Default limit
      );
    });
  });

  describe('GET /api/settings', () => {
    it('should return settings for authenticated shop', async () => {
      const mockSettings = {
        delay_threshold_days: 2,
        email_enabled: true,
        sms_enabled: false,
        notification_template: 'default',
        created_at: '2025-10-21T12:00:00.000Z',
        updated_at: '2025-10-21T12:00:00.000Z',
      };

      mockAuth();
      mockQuery.mockResolvedValueOnce([mockSettings]);

      const response = await request(app.callback())
        .get('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSettings,
      });
    });

    it('should create default settings if none exist', async () => {
      mockAuth();
      // First query returns empty (no settings)
      mockQuery.mockResolvedValueOnce([]);
      // Second query creates default settings
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .get('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        delay_threshold_days: 2,
        email_enabled: true,
        sms_enabled: false,
        notification_template: 'default',
        custom_message: null,
      });

      expect(mockQuery).toHaveBeenCalledTimes(3); // Auth + 2 settings queries
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings for authenticated shop', async () => {
      const updatedSettings = {
        delay_threshold_days: 3,
        email_enabled: true,
        sms_enabled: true,
        notification_template: 'custom',
      };

      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updatedSettings)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Settings updated successfully',
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        email_enabled: false,
      };

      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate delay_threshold_days', async () => {
      mockAuth();

      const response = await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ delay_threshold_days: 100 }) // Invalid: > 30
        .expect(400);

      expect(response.body).toEqual({
        error: 'delay_threshold_days must be between 1 and 30',
        code: 'INVALID_THRESHOLD',
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.callback())
        .put('/api/settings')
        .send({ email_enabled: false })
        .expect(401);

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/analytics', () => {
    it('should return analytics for authenticated shop', async () => {
      const mockAlertStats = {
        total_alerts: 10,
        sent_alerts: 8,
        pending_alerts: 2,
        alerts_last_30_days: 5,
      };

      const mockOrderStats = {
        total_orders: 100,
        orders_last_30_days: 20,
      };

      mockAuth();
      mockQuery
        .mockResolvedValueOnce([mockAlertStats])
        .mockResolvedValueOnce([mockOrderStats]);

      const response = await request(app.callback())
        .get('/api/analytics')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          alerts: mockAlertStats,
          orders: mockOrderStats,
        },
      });
    });

    it('should handle missing data gracefully', async () => {
      mockAuth();
      mockQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .get('/api/analytics')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.alerts).toEqual({});
      expect(response.body.data.orders).toEqual({});
    });
  });

  describe('GET /api/shop', () => {
    it('should return shop information', async () => {
      const mockShop = {
        shop_domain: testShop,
        created_at: '2025-10-21T12:00:00.000Z',
        updated_at: '2025-10-21T12:00:00.000Z',
      };

      mockAuth();
      mockQuery.mockResolvedValueOnce([mockShop]);

      const response = await request(app.callback())
        .get('/api/shop')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockShop,
      });
    });

    it('should return 404 when shop not found', async () => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .get('/api/shop')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Shop not found',
      });
    });
  });

  describe('GET /api/health', () => {
    it('should return health status without authentication', async () => {
      const response = await request(app.callback())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        service: 'api',
      });
    });
  });
});
