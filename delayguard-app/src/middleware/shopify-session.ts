import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { query } from '../database/connection';

/**
 * Shopify session structure
 */
export interface ShopifySession {
  shop: string;
  accessToken: string;
  scope: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Extend Koa context to include shop information
 */
declare module 'koa' {
  interface Context {
    state: {
      shopify?: {
        session: ShopifySession;
      };
      shopId?: string;
      shopDomain?: string;
      shop?: string; // Alias for shopDomain for backwards compatibility
      csrfToken?: string; // Used by csrf-protection middleware
      user?: { id?: string; email?: string }; // Used by audit-logger
    };
  }
}

/**
 * Get the shop domain from the context
 * Throws if not authenticated
 */
export const getShopDomain = (ctx: Context): string => {
  const shopDomain = ctx.state.shopDomain || ctx.state.shop;
  if (!shopDomain) {
    throw new Error('Shop domain not found in context. Ensure requireAuth middleware is used.');
  }
  return shopDomain;
};

/**
 * Validates Shopify session token and attaches shop info to context
 * 
 * For Shopify Embedded Apps, this middleware:
 * 1. Extracts the session token from Authorization header
 * 2. Verifies the JWT signature using SHOPIFY_API_SECRET
 * 3. Validates token claims (iss, dest, aud, exp)
 * 4. Fetches shop data from database
 * 5. Attaches shop information to ctx.state
 * 
 * In development mode (NODE_ENV=development), allows unauthenticated requests
 * for easier testing and development.
 * 
 * @see https://shopify.dev/docs/apps/auth/oauth/session-tokens
 */
export const requireAuth = async (ctx: Context, next: Next) => {
  // Development mode: Skip authentication for easier testing
  if (process.env.NODE_ENV === 'development' && !ctx.headers.authorization) {
    logger.debug('Development mode: Allowing request without authentication');
    ctx.state.shopDomain = 'development.myshopify.com';
    ctx.state.shop = 'development.myshopify.com';
    ctx.state.shopId = 'dev-shop-id';
    await next();
    return;
  }

  const authHeader = ctx.headers.authorization;

  if (!authHeader) {
    logger.warn('No Authorization header found for API request', {
      path: ctx.path,
      method: ctx.method,
    });
    ctx.status = 401;
    ctx.body = { 
      error: 'Missing Authorization header',
      code: 'NO_AUTH_HEADER',
    };
    return;
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token) {
    logger.warn('No token found in Authorization header');
    ctx.status = 401;
    ctx.body = { 
      error: 'Missing authentication token',
      code: 'NO_TOKEN',
    };
    return;
  }

  try {
    // Verify the JWT token
    // For Shopify session tokens, the structure follows:
    // https://shopify.dev/docs/apps/auth/oauth/session-tokens
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const apiKey = process.env.SHOPIFY_API_KEY;

    if (!apiSecret || !apiKey) {
      logger.error('SHOPIFY_API_SECRET or SHOPIFY_API_KEY not configured');
      ctx.status = 500;
      ctx.body = { 
        error: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR',
      };
      return;
    }

    // Decode and verify token
    const decoded = jwt.verify(token, apiSecret, {
      algorithms: ['HS256'],
      audience: apiKey,
    }) as jwt.JwtPayload;

    // Validate required Shopify claims
    if (!decoded.dest || !decoded.iss) {
      logger.warn('Invalid session token: missing required claims', {
        hasIss: !!decoded.iss,
        hasDest: !!decoded.dest,
      });
      ctx.status = 401;
      ctx.body = { 
        error: 'Invalid session token',
        code: 'INVALID_TOKEN',
      };
      return;
    }

    // Extract shop domain from iss (issuer) claim
    // Format: https://{shop-domain}/admin
    const shopDomain = decoded.iss.replace('https://', '').replace('/admin', '');

    logger.debug('Session token validated', { 
      shop: shopDomain,
      sub: decoded.sub,
      sid: decoded.sid,
    });

    // Fetch shop details from database
    const shopResult = await query<{ 
      id: string; 
      access_token: string; 
      scope: string;
      shop_name?: string;
    }>(
      'SELECT id, access_token, scope, shop_name FROM shops WHERE shop_domain = $1',
      [shopDomain]
    );

    if (shopResult.length === 0) {
      logger.warn('Shop not found in database', { 
        shopDomain,
        tokenSub: decoded.sub,
      });
      ctx.status = 401;
      ctx.body = { 
        error: 'Shop not found. Please reinstall the app.',
        code: 'SHOP_NOT_FOUND',
      };
      return;
    }

    const shopData = shopResult[0];

    // Attach shop session and ID to Koa context state
    ctx.state.shopify = {
      session: {
        shop: shopDomain,
        accessToken: shopData.access_token,
        scope: shopData.scope,
        userId: decoded.sub,
        sessionId: decoded.sid,
      },
    };
    ctx.state.shopId = shopData.id;
    ctx.state.shopDomain = shopDomain;
    ctx.state.shop = shopDomain; // Alias

    logger.debug('Request authenticated successfully', { 
      shop: shopDomain,
      shopId: shopData.id,
      path: ctx.path,
    });

    await next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Session token expired', { 
        expiredAt: error.expiredAt,
      });
      ctx.status = 401;
      ctx.body = { 
        error: 'Session expired',
        code: 'TOKEN_EXPIRED',
      };
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { 
        message: error.message,
      });
      ctx.status = 401;
      ctx.body = { 
        error: 'Invalid session token',
        code: 'INVALID_TOKEN',
      };
      return;
    }

    // Database or other errors
    logger.error('Error validating session', error as Error, {
      path: ctx.path,
      method: ctx.method,
    });
    ctx.status = 500;
    ctx.body = { 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
};

/**
 * Optional authentication middleware
 * Similar to requireAuth but doesn't reject unauthenticated requests
 * Useful for endpoints that have different behavior for authenticated/unauthenticated users
 */
export const optionalAuth = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization;

  if (!authHeader) {
    logger.debug('Optional auth: No auth header, continuing without authentication', {
      path: ctx.path,
    });
    await next();
    return;
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token) {
    logger.debug('Optional auth: No token found, continuing without authentication', {
      path: ctx.path,
    });
    await next();
    return;
  }

  try {
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const apiKey = process.env.SHOPIFY_API_KEY;

    if (!apiSecret || !apiKey) {
      logger.warn('Optional auth: Missing API credentials, continuing without authentication');
      await next();
      return;
    }

    const decoded = jwt.verify(token, apiSecret, {
      algorithms: ['HS256'],
      audience: apiKey,
    }) as jwt.JwtPayload;

    if (!decoded.dest || !decoded.iss) {
      logger.debug('Optional auth: Invalid token claims, continuing without authentication');
      await next();
      return;
    }

    const shopDomain = decoded.iss.replace('https://', '').replace('/admin', '');

    const shopResult = await query<{ 
      id: string; 
      access_token: string; 
      scope: string;
      shop_name?: string;
    }>(
      'SELECT id, access_token, scope, shop_name FROM shops WHERE shop_domain = $1',
      [shopDomain]
    );

    if (shopResult.length === 0) {
      logger.debug('Optional auth: Shop not found, continuing without authentication');
      await next();
      return;
    }

    const shopData = shopResult[0];

    // Attach shop session to context
    ctx.state.shopify = {
      session: {
        shop: shopDomain,
        accessToken: shopData.access_token,
        scope: shopData.scope,
        userId: decoded.sub,
        sessionId: decoded.sid,
      },
    };
    ctx.state.shopId = shopData.id;
    ctx.state.shopDomain = shopDomain;
    ctx.state.shop = shopDomain;

    logger.debug('Optional auth: Request authenticated successfully', { 
      shop: shopDomain,
      path: ctx.path,
    });

    await next();
  } catch (error) {
    // Continue without authentication on any error
    logger.debug('Optional auth: Error validating token, continuing without authentication', {
      path: ctx.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    await next();
  }
};
