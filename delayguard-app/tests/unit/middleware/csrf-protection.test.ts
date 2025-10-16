import { Context, Next } from 'koa';
import { APICSRFProtection } from '../../../src/middleware/csrf-protection';
import * as crypto from 'crypto';

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHmac: jest.fn(),
  timingSafeEqual: jest.fn(),
}));

const mockCrypto = crypto as jest.Mocked<typeof crypto>;

// Mock Koa context
const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const ctx = {
    method: 'GET',
    url: '/test',
    path: '/test',
    headers: {},
    request: {
      body: {},
      headers: {},
      method: 'GET',
      url: '/test',
      get: jest.fn(),
      app: {},
      req: {},
      res: {},
      ctx: {},
      originalUrl: '/test',
      href: '/test',
      path: '/test',
      querystring: '',
      search: '',
      host: 'localhost',
      hostname: 'localhost',
      protocol: 'http',
      secure: false,
      subdomains: [],
      accept: {},
      accepts: jest.fn(),
      acceptsEncodings: jest.fn(),
      acceptsCharsets: jest.fn(),
      acceptsLanguages: jest.fn(),
      is: jest.fn(),
      type: '',
      charset: '',
      query: {},
      fresh: false,
      stale: false,
      idempotent: false,
      socket: {},
      ip: '127.0.0.1',
      ips: [],
      subdomain: '',
    },
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
      secure: true,
      request: {},
      response: {},
    },
        throw: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
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
    it('should allow GET requests without CSRF token', async() => {
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

    it('should allow HEAD requests without CSRF token', async() => {
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

    it('should allow OPTIONS requests without CSRF token', async() => {
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
    it('should require CSRF token for POST requests', async() => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'POST',
        headers: {},
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue(undefined);
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for PUT requests', async() => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'PUT',
        headers: {},
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue(undefined);
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for DELETE requests', async() => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'DELETE',
        headers: {},
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue(undefined);
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF token for PATCH requests', async() => {
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ 
        method: 'PATCH',
        headers: {},
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue(undefined);
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('CSRF Token Validation', () => {
    it('should validate CSRF token from header', async() => {
      // Mock crypto.timingSafeEqual to return true for valid tokens
      (mockCrypto.timingSafeEqual as jest.Mock).mockReturnValue(true);
      
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
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue('test-token');
      (ctx.get as jest.Mock).mockReturnValue('test-token');
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should validate CSRF token from body', async() => {
      // Mock crypto.timingSafeEqual to return true for valid tokens
      (mockCrypto.timingSafeEqual as jest.Mock).mockReturnValue(true);
      
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
            csrfToken: 'test-token',
          },
          headers: {},
          url: '/test',
          origin: 'http://localhost',
          method: 'POST',
          URL: new URL('http://localhost/test'),
          get: jest.fn(),
          app: {} as any,
          req: {} as any,
          res: {} as any,
          ctx: {} as any,
          originalUrl: '/test',
          href: '/test',
          path: '/test',
          querystring: '',
          search: '',
          host: 'localhost',
          hostname: 'localhost',
          protocol: 'http',
          secure: false,
          subdomains: [],
          accept: {} as any,
          accepts: jest.fn(),
          acceptsEncodings: jest.fn(),
          acceptsCharsets: jest.fn(),
          acceptsLanguages: jest.fn(),
          is: jest.fn(),
          type: '',
          charset: '',
          query: {},
          fresh: false,
          stale: false,
          idempotent: false,
          socket: {} as any,
          ip: '127.0.0.1',
          ips: [],
          response: {} as any,
          rawBody: '',
          length: 0,
          inspect: jest.fn(),
          toJSON: jest.fn(),
          header: jest.fn() as any,
        },
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue('test-token');
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.throw).not.toHaveBeenCalled();
    });

    it('should throw error for invalid CSRF token', async() => {
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
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue('valid-token');
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error for missing CSRF token in both header and body', async() => {
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
          headers: {},
          url: '/test',
          origin: 'http://localhost',
          method: 'POST',
          URL: new URL('http://localhost/test'),
          get: jest.fn(),
          app: {} as any,
          req: {} as any,
          res: {} as any,
          ctx: {} as any,
          originalUrl: '/test',
          href: '/test',
          path: '/test',
          querystring: '',
          search: '',
          host: 'localhost',
          hostname: 'localhost',
          protocol: 'http',
          secure: false,
          subdomains: [],
          accept: {} as any,
          accepts: jest.fn(),
          acceptsEncodings: jest.fn(),
          acceptsCharsets: jest.fn(),
          acceptsLanguages: jest.fn(),
          is: jest.fn(),
          type: '',
          charset: '',
          query: {},
          fresh: false,
          stale: false,
          idempotent: false,
          socket: {} as any,
          ip: '127.0.0.1',
          ips: [],
          response: {} as any,
          rawBody: '',
          length: 0,
          inspect: jest.fn(),
          toJSON: jest.fn(),
          header: jest.fn() as any,
        },
      });
      (ctx.cookies.get as jest.Mock).mockReturnValue(undefined);
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.throw).toHaveBeenCalledWith(403, 'CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token Generation', () => {
    it('should generate CSRF token for safe methods', async() => {
      // Mock crypto.randomBytes to return a specific value
      const mockBuffer = Buffer.from('746573742d746f6b656e', 'hex'); // 'test-token' in hex
      (mockCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        '_csrf',
        '746573742d746f6b656e',
        expect.objectContaining({
          httpOnly: false,
          secure: true,
          sameSite: 'strict',
        }),
      );
    });

    it('should set CSRF token in state', async() => {
      // Mock crypto.randomBytes to return a specific value
      const mockBuffer = Buffer.from('746573742d746f6b656e', 'hex'); // 'test-token' in hex
      (mockCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      
      const middleware = APICSRFProtection.create({
        secret: 'test-secret',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
      });

      const ctx = createMockContext({ method: 'GET' });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.state.csrfToken).toBe('746573742d746f6b656e');
    });
  });

  describe('Cookie Configuration', () => {
    it('should set secure cookie in production', async() => {
      // Mock crypto.randomBytes to return a specific value
      const mockBuffer = Buffer.from('746573742d746f6b656e', 'hex'); // 'test-token' in hex
      (mockCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      
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
        '746573742d746f6b656e',
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should set appropriate cookie options', async() => {
      // Mock crypto.randomBytes to return a specific value
      const mockBuffer = Buffer.from('746573742d746f6b656e', 'hex'); // 'test-token' in hex
      (mockCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      
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
        '746573742d746f6b656e',
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          maxAge: 86400000, // 24 hours
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from next()', async() => {
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