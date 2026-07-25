import request from 'supertest';
import Koa from 'koa';
import Router from 'koa-router';
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

// Plan gate (LAUNCH_PLAN WS-F F1): PUT /settings with sms_enabled=true
// consults the billing service. Default to pro here so the pre-existing
// settings tests exercise the settings path itself; the gate's own
// free/pro/error matrix lives in plan-route.test.ts.
jest.mock('../../../services/billing-service', () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue('pro'),
    getPlanConfig: jest.fn(),
    isSmsAllowed: jest.fn().mockReturnValue(true),
    meetsPlan: jest.fn().mockReturnValue(true),
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

  // Helper: queue the SELECT id, access_token, scope, shop_name shape that
  // requireAuth performs to validate the JWT-bearing request.
  const mockAuth = () => {
    mockQuery.mockResolvedValueOnce([mockShopData]);
  };

  // Helper: queue the SELECT id FROM shops WHERE shop_domain = $1 lookup
  // that MerchantApiService.resolveShopId issues at the top of every
  // /alerts, /orders, /settings, /analytics, /merchant-settings handler.
  // (GET /api/shop does NOT use this — it queries shops directly.)
  const mockResolveShopId = () => {
    mockQuery.mockResolvedValueOnce([{ id: mockShopData.id }]);
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
    // Mirror server.ts: routers carry no prefix (LAUNCH_PLAN A3);
    // the mount point provides it.
    const root = new Router();
    root.use('/api', apiRoutes.routes());
    app.use(root.routes());
    app.use(root.allowedMethods());

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
      'test-secret',
    );

    // Reset mocks. mockReset (not mockClear) is required so leftover
    // mockResolvedValueOnce entries from a prior test don't bleed into
    // the next — they otherwise survive jest.clearAllMocks().
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('GET /api/alerts', () => {
    it('should return alerts for authenticated shop', async() => {
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

      mockAuth(); // requireAuth middleware lookup
      mockResolveShopId(); // service.resolveShopId
      mockQuery.mockResolvedValueOnce(mockAlerts); // alerts query

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

    it('should return 401 without authentication', async() => {
      const response = await request(app.callback())
        .get('/api/alerts')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async() => {
      mockAuth();
      mockResolveShopId();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app.callback())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch alerts',
      });
    });

    it('should return empty array when no alerts found', async() => {
      mockAuth();
      mockResolveShopId();
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

  describe('PUT /api/alerts/:id/status', () => {
    it('persists a resolved status for the authenticated shop', async() => {
      mockAuth(); // requireAuth middleware lookup
      mockResolveShopId(); // service.resolveShopId
      mockQuery.mockResolvedValueOnce([{ id: '42' }]); // UPDATE ... RETURNING id

      const response = await request(app.callback())
        .put('/api/alerts/42/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'resolved' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      // The UPDATE carries status, alert id, and resolved shop id
      const updateCall = mockQuery.mock.calls.find(
        ([sql]) => typeof sql === 'string' && /UPDATE\s+delay_alerts/i.test(sql),
      );
      expect(updateCall?.[1]).toEqual(['resolved', '42', mockShopData.id]);
    });

    it('returns 400 for an out-of-enum status', async() => {
      mockAuth();

      const response = await request(app.callback())
        .put('/api/alerts/42/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'bogus' })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'INVALID_STATUS');
    });

    it('returns 404 when the alert does not belong to the shop', async() => {
      mockAuth();
      mockResolveShopId();
      mockQuery.mockResolvedValueOnce([]); // UPDATE affected no rows

      await request(app.callback())
        .put('/api/alerts/999/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'dismissed' })
        .expect(404);
    });

    it('returns 401 without authentication', async() => {
      await request(app.callback())
        .put('/api/alerts/42/status')
        .send({ status: 'resolved' })
        .expect(401);

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/orders', () => {
    it('should return orders for authenticated shop', async() => {
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
      mockResolveShopId();
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

    it('should respect limit query parameter', async() => {
      mockAuth();
      mockResolveShopId();
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .get('/api/orders?limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Multi-tenant guard: the orders query is scoped by the resolved
      // shop_id, not the shop domain (resolveShopId already translated).
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockShopData.id, 10],
      );
    });

    it('should use default limit when not provided', async() => {
      mockAuth();
      mockResolveShopId();
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .get('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockShopData.id, 50], // Default limit
      );
    });
  });

  describe('GET /api/settings', () => {
    it('should return settings for authenticated shop', async() => {
      const mockSettings = {
        delay_threshold_days: 2,
        email_enabled: true,
        sms_enabled: false,
        notification_template: 'default',
        created_at: '2025-10-21T12:00:00.000Z',
        updated_at: '2025-10-21T12:00:00.000Z',
      };

      mockAuth();
      mockResolveShopId();
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

    it('should create default settings if none exist', async() => {
      mockAuth();
      mockResolveShopId();
      // Settings SELECT returns empty (no row yet)
      mockQuery.mockResolvedValueOnce([]);
      // Seed INSERT (ON CONFLICT DO NOTHING)
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

      // Auth (1) + resolveShopId (2) + SELECT (3) + seed INSERT (4)
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings for authenticated shop', async() => {
      const updatedSettings = {
        delay_threshold_days: 3,
        email_enabled: true,
        sms_enabled: true,
        notification_template: 'custom',
      };

      mockAuth();
      mockResolveShopId();
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

    it('should handle partial updates', async() => {
      const partialUpdate = {
        email_enabled: false,
      };

      mockAuth();
      mockResolveShopId();
      mockQuery.mockResolvedValueOnce([]);

      const response = await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate delay_threshold_days', async() => {
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

    it('should return 401 without authentication', async() => {
      await request(app.callback())
        .put('/api/settings')
        .send({ email_enabled: false })
        .expect(401);

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/analytics', () => {
    it('should return analytics for authenticated shop', async() => {
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
      mockResolveShopId();
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

    it('should handle missing data gracefully', async() => {
      mockAuth();
      mockResolveShopId();
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
    it('should return shop information', async() => {
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

    it('should return 404 when shop not found', async() => {
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
    it('should return health status without authentication', async() => {
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
