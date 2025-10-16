import { Context, Next } from 'koa';
import { APICSRFProtection } from '../../../src/middleware/csrf-protection';
import * as crypto from 'crypto';

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHmac: jest.fn(),
}));

const mockCrypto = crypto as jest.Mocked<typeof crypto>;

// Mock Koa context
const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const ctx = {
    method: 'GET',
    url: '/test',
    headers: {},
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
    },
    throw: jest.fn(),
    set: jest.fn(),
    state: {},
    ...overrides,
  } as any;
  return ctx;
};

const createMockNext = (): Next => jest.fn().mockResolvedValue(undefined);

describe('CSRF Protection Middleware', () => {
  let mockRandomBytes: jest.Mock;
  let mockCreateHmac: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock crypto.randomBytes to return a predictable value
    mockRandomBytes = jest.fn().mockReturnValue(Buffer.from('test-token'));
    mockCrypto.randomBytes.mockImplementation(mockRandomBytes);
    
    // Mock crypto.createHmac
    mockCreateHmac = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hashed-token'),
    });
    mockCrypto.createHmac.mockImplementation(mockCreateHmac);
  });

  describe('Middleware Creation', () => {
    it('should create middleware with required options', () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      expect(middleware).toBeInstanceOf(Function);
    });

    it('should throw error if secret is not provided', () => {
      expect(() => {
        APICSRFProtection.create({
          secret: '',
          cookieName: '_csrf',
          headerName: 'x-csrf-token',
        });
      }).toThrow('CSRF secret is required');
    });
  });

  describe('Safe Methods', () => {
    it('should allow GET requests without CSRF token', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'HEAD' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'OPTIONS' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });
  });

  describe('Unsafe Methods', () => {
    it('should require CSRF token for POST requests', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {},
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for PUT requests', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'PUT',
        headers: {},
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for DELETE requests', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'DELETE',
        headers: {},
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for PATCH requests', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'PATCH',
        headers: {},
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('CSRF Token Validation', () => {
    it('should validate CSRF token from header', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {
          'x-csrf-token': 'test-token',
        },
        cookies: {
          get: jest.fn().mockReturnValue('test-token'),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should validate CSRF token from body', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {},
        request: {
          body: {
            _csrf: 'test-token',
          },
        },
        cookies: {
          get: jest.fn().mockReturnValue('test-token'),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should throw error for invalid CSRF token', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {
          'x-csrf-token': 'invalid-token',
        },
        cookies: {
          get: jest.fn().mockReturnValue('test-token'),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'Invalid CSRF token');
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error for missing CSRF token in both header and body', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {},
        request: {
          body: {},
        },
        cookies: {
          get: jest.fn().mockReturnValue('test-token'),
        },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token Generation', () => {
    it('should generate CSRF token for safe methods', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        '_csrf',
        'test-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        })
      );
    });

    it('should set CSRF token in state', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.state.csrfToken).toBe('test-token');
    });
  });

  describe('Cookie Configuration', () => {
    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        '_csrf',
        'test-token',
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should set appropriate cookie options', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        '_csrf',
        'test-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 3600000, // 1 hour
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from next()', async () => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();
      const error = new Error('Test error');
      (next as jest.Mock).mockRejectedValueOnce(error);

      await expect(middleware(ctx, next)).rejects.toThrow('Test error');
    });
  });
});