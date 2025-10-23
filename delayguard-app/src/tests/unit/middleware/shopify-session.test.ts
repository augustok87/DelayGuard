import { Context } from 'koa';
import jwt from 'jsonwebtoken';
import { requireAuth, getShopDomain, optionalAuth } from '../../../middleware/shopify-session';

// Mock dependencies
jest.mock('../../../database/connection');
import { query } from '../../../database/connection';
const mockQuery = query as jest.MockedFunction<typeof query>;

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Shopify Session Middleware', () => {
  let mockCtx: Partial<Context>;
  let mockNext: jest.Mock;
  const testShop = 'test-store.myshopify.com';
  const testApiKey = 'test-api-key';
  const testApiSecret = 'test-secret';

  beforeAll(() => {
    process.env.SHOPIFY_API_KEY = testApiKey;
    process.env.SHOPIFY_API_SECRET = testApiSecret;
  });

  beforeEach(() => {
    // Reset context for each test
    mockCtx = {
      headers: {},
      state: {},
      path: '/api/test',
      method: 'GET',
    } as Partial<Context>;

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up NODE_ENV
    delete process.env.NODE_ENV;
  });

  describe('requireAuth middleware', () => {
    it('should authenticate with valid session token', async() => {
      const mockShopData = {
        id: 'shop-123',
        access_token: 'test-access-token',
        scope: 'read_products,write_orders',
        shop_name: 'Test Store',
      };

      const token = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${token}` };
      mockQuery.mockResolvedValueOnce([mockShopData]);

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.state?.shopDomain).toBe(testShop);
      expect(mockCtx.state?.shopId).toBe('shop-123');
      expect(mockCtx.state?.shopify?.session.accessToken).toBe('test-access-token');
    });

    it('should reject request without Authorization header', async() => {
      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Missing Authorization header',
        code: 'NO_AUTH_HEADER',
      });
    });

    it('should reject request with empty Bearer token', async() => {
      mockCtx.headers = { authorization: 'Bearer ' };

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Missing authentication token',
        code: 'NO_TOKEN',
      });
    });

    it('should handle expired tokens', async() => {
      const expiredToken = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          nbf: Math.floor(Date.now() / 1000) - 7200,
          iat: Math.floor(Date.now() / 1000) - 7200,
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${expiredToken}` };

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Session expired',
        code: 'TOKEN_EXPIRED',
      });
    });

    it('should reject token with invalid signature', async() => {
      const invalidToken = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        'wrong-secret', // Wrong secret
      );

      mockCtx.headers = { authorization: `Bearer ${invalidToken}` };

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Invalid session token',
        code: 'INVALID_TOKEN',
      });
    });

    it('should reject token with missing required claims', async() => {
      const invalidToken = jwt.sign(
        {
          // Missing iss and dest
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${invalidToken}` };

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Invalid session token',
        code: 'INVALID_TOKEN',
      });
    });

    it('should reject when shop not found in database', async() => {
      const token = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${token}` };
      mockQuery.mockResolvedValueOnce([]); // No shop found

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({
        error: 'Shop not found. Please reinstall the app.',
        code: 'SHOP_NOT_FOUND',
      });
    });

    it('should handle database errors gracefully', async() => {
      const token = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${token}` };
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle missing SHOPIFY_API_SECRET', async() => {
      const originalSecret = process.env.SHOPIFY_API_SECRET;
      delete process.env.SHOPIFY_API_SECRET;

      mockCtx.headers = { authorization: 'Bearer test-token' };

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toEqual({
        error: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR',
      });

      // Restore
      process.env.SHOPIFY_API_SECRET = originalSecret;
    });

    it('should allow token without Bearer prefix', async() => {
      const mockShopData = {
        id: 'shop-123',
        access_token: 'test-access-token',
        scope: 'read_products,write_orders',
        shop_name: 'Test Store',
      };

      const token = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: token }; // Without "Bearer " prefix
      mockQuery.mockResolvedValueOnce([mockShopData]);

      await requireAuth(mockCtx as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.state?.shopDomain).toBe(testShop);
    });

    describe('Development Mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should allow unauthenticated requests in development mode', async() => {
        await requireAuth(mockCtx as Context, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockCtx.state?.shopDomain).toBe('development.myshopify.com');
        expect(mockCtx.state?.shopId).toBe('dev-shop-id');
        expect(mockQuery).not.toHaveBeenCalled();
      });

      it('should still validate token if provided in development', async() => {
        const mockShopData = {
          id: 'shop-123',
          access_token: 'test-access-token',
          scope: 'read_products,write_orders',
        };

        const token = jwt.sign(
          {
            iss: `https://${testShop}/admin`,
            dest: `https://${testShop}`,
            aud: testApiKey,
            sub: 'user-123',
            exp: Math.floor(Date.now() / 1000) + 3600,
            nbf: Math.floor(Date.now() / 1000),
            iat: Math.floor(Date.now() / 1000),
            jti: 'jwt-123',
            sid: 'session-123',
          },
          testApiSecret,
        );

        mockCtx.headers = { authorization: `Bearer ${token}` };
        mockQuery.mockResolvedValueOnce([mockShopData]);

        await requireAuth(mockCtx as Context, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockCtx.state?.shopDomain).toBe(testShop);
        expect(mockQuery).toHaveBeenCalled();
      });
    });
  });

  describe('getShopDomain helper', () => {
    it('should return shopDomain from context', () => {
      mockCtx.state = { shopDomain: testShop };
      const result = getShopDomain(mockCtx as Context);
      expect(result).toBe(testShop);
    });

    it('should return shop (alias) from context', () => {
      mockCtx.state = { shop: testShop };
      const result = getShopDomain(mockCtx as Context);
      expect(result).toBe(testShop);
    });

    it('should throw error when shop domain not found', () => {
      mockCtx.state = {};
      expect(() => getShopDomain(mockCtx as Context)).toThrow(
        'Shop domain not found in context',
      );
    });
  });

  describe('optionalAuth middleware', () => {
    it('should authenticate with valid token', async() => {
      const mockShopData = {
        id: 'shop-123',
        access_token: 'test-access-token',
        scope: 'read_products,write_orders',
      };

      const token = jwt.sign(
        {
          iss: `https://${testShop}/admin`,
          dest: `https://${testShop}`,
          aud: testApiKey,
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          nbf: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          jti: 'jwt-123',
          sid: 'session-123',
        },
        testApiSecret,
      );

      mockCtx.headers = { authorization: `Bearer ${token}` };
      mockQuery.mockResolvedValueOnce([mockShopData]);

      await optionalAuth(mockCtx as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.state?.shopDomain).toBe(testShop);
    });

    it('should continue without authentication on invalid token', async() => {
      mockCtx.headers = { authorization: 'Bearer invalid-token' };

      await optionalAuth(mockCtx as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.state?.shopDomain).toBeUndefined();
    });

    it('should continue without authentication when no token provided', async() => {
      await optionalAuth(mockCtx as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.state?.shopDomain).toBeUndefined();
    });
  });
});

