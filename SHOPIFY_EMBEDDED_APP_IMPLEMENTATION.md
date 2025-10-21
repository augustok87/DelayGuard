# Shopify Embedded App Authentication - Implementation Plan

**Date**: October 21, 2025  
**Approach**: Option A - Shopify Embedded App (Standard Pattern)  
**Architecture**: Clean, maintainable, production-ready  
**Estimated Time**: 4-6 hours

---

## 🎯 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     Shopify Admin (Host)                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              DelayGuard App (Embedded iFrame)             │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  1. App Bridge Client                               │ │ │
│  │  │     - Gets session token from Shopify               │ │ │
│  │  │     - Handles authentication automatically          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                          ↓                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  2. Authenticated API Client                        │ │ │
│  │  │     - Adds session token to all requests            │ │ │
│  │  │     - Handles token refresh                         │ │ │
│  │  │     - Error handling & retry logic                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                          ↓                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  3. React Components                                │ │ │
│  │  │     - Use hooks for data fetching                   │ │ │
│  │  │     - No direct API calls                           │ │ │
│  │  │     - Display loading/error states                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS + Session Token
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Koa)                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  1. Session Token Middleware                            │ │
│  │     - Validates Shopify session token                   │ │
│  │     - Extracts shop domain                              │ │
│  │     - Sets ctx.state.shop                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  2. Route Handlers                                      │ │
│  │     - Access authenticated shop via ctx.state.shop      │ │
│  │     - Query database for shop-specific data             │ │
│  │     - Return JSON response                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  3. Database Layer                                      │ │
│  │     - PostgreSQL queries with shop_id filter            │ │
│  │     - Returns real merchant data                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 PHASE 1: INSTALL DEPENDENCIES

### New Packages Needed:

```bash
cd delayguard-app

# Shopify App Bridge (for embedded app)
npm install @shopify/app-bridge @shopify/app-bridge-react

# JWT verification (for session tokens)
npm install jsonwebtoken @types/jsonwebtoken

# Already have these, but confirming:
npm install axios  # For API calls
```

---

## 🔧 PHASE 2: BACKEND - SESSION TOKEN MIDDLEWARE

### File: `/src/middleware/shopify-session.ts` (NEW)

```typescript
import Koa from 'koa';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * Shopify Session Token Middleware
 * 
 * This middleware validates Shopify session tokens from embedded apps.
 * It extracts the shop domain and sets it in the context state.
 * 
 * Session tokens are sent in the Authorization header as "Bearer {token}"
 */

interface ShopifySessionPayload {
  iss: string;           // Issuer (shop domain)
  dest: string;          // Destination (shop domain)
  aud: string;           // Audience (API key)
  sub: string;           // Subject (user ID)
  exp: number;           // Expiration time
  nbf: number;           // Not before time
  iat: number;           // Issued at time
  jti: string;           // JWT ID
  sid: string;           // Session ID
}

export const shopifySessionMiddleware = async (
  ctx: Koa.Context,
  next: Koa.Next
) => {
  try {
    // Get authorization header
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, allow requests without token
      if (process.env.NODE_ENV === 'development') {
        logger.warn('No session token provided - development mode');
        ctx.state.shop = 'development.myshopify.com';
        ctx.state.authenticated = false;
        return await next();
      }
      
      ctx.status = 401;
      ctx.body = { error: 'No session token provided' };
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer "
    
    // Verify token with Shopify API secret
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (!apiSecret) {
      logger.error('SHOPIFY_API_SECRET not configured');
      ctx.status = 500;
      ctx.body = { error: 'Server configuration error' };
      return;
    }

    // Decode and verify token
    const payload = jwt.verify(token, apiSecret, {
      algorithms: ['HS256'],
    }) as ShopifySessionPayload;

    // Extract shop domain from token
    const shopDomain = payload.dest.replace('https://', '');
    
    // Validate shop domain format
    if (!shopDomain.includes('.myshopify.com')) {
      logger.warn('Invalid shop domain in token', { shopDomain });
      ctx.status = 401;
      ctx.body = { error: 'Invalid shop domain' };
      return;
    }

    // Set authenticated shop in context
    ctx.state.shop = shopDomain;
    ctx.state.authenticated = true;
    ctx.state.userId = payload.sub;
    ctx.state.sessionId = payload.sid;

    logger.debug('Session token validated', { shop: shopDomain });

    // Continue to next middleware
    await next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Session token expired');
      ctx.status = 401;
      ctx.body = { error: 'Session expired', code: 'TOKEN_EXPIRED' };
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid session token', { error: error.message });
      ctx.status = 401;
      ctx.body = { error: 'Invalid session token' };
      return;
    }

    logger.error('Session validation error', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Authentication error' };
  }
};

/**
 * Require authentication middleware
 * Use this on routes that MUST have authentication
 */
export const requireAuth = async (ctx: Koa.Context, next: Koa.Next) => {
  if (!ctx.state.authenticated) {
    ctx.status = 401;
    ctx.body = { error: 'Authentication required' };
    return;
  }
  
  await next();
};
```

---

## 🔧 PHASE 3: BACKEND - UPDATE SERVER TO USE MIDDLEWARE

### File: `/src/server.ts` (UPDATE)

```typescript
// Add near the top with other imports
import { shopifySessionMiddleware } from './middleware/shopify-session';

// ... existing imports ...

// Add after bodyparser but before routes
app.use(shopifySessionMiddleware);

// Existing routes will now have access to ctx.state.shop
```

---

## 🔧 PHASE 4: BACKEND - UPDATE API ROUTES TO USE REAL DATA

### File: `/src/routes/api.ts` (NEW)

```typescript
import Router from 'koa-router';
import { Context } from 'koa';
import { logger } from '../utils/logger';
import { query } from '../database/connection';
import { requireAuth } from '../middleware/shopify-session';

const router = new Router({ prefix: '/api' });

/**
 * GET /api/alerts
 * Get all delay alerts for authenticated shop
 */
router.get('/alerts', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    
    logger.debug('Fetching alerts', { shop: shopDomain });

    // Query database for shop's alerts
    const alerts = await query(
      `
      SELECT 
        da.*,
        o.order_number,
        o.customer_email,
        o.customer_name,
        o.total_price
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      ORDER BY da.created_at DESC
      LIMIT 100
      `,
      [shopDomain]
    );

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: alerts,
      count: alerts.length,
    };
  } catch (error) {
    logger.error('Error fetching alerts', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch alerts' };
  }
});

/**
 * GET /api/orders
 * Get recent orders for authenticated shop
 */
router.get('/orders', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    const limit = parseInt(ctx.query.limit as string) || 50;
    
    logger.debug('Fetching orders', { shop: shopDomain, limit });

    const orders = await query(
      `
      SELECT 
        o.*,
        COUNT(da.id) as alert_count
      FROM orders o
      LEFT JOIN delay_alerts da ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2
      `,
      [shopDomain, limit]
    );

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: orders,
      count: orders.length,
    };
  } catch (error) {
    logger.error('Error fetching orders', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch orders' };
  }
});

/**
 * GET /api/settings
 * Get app settings for authenticated shop
 */
router.get('/settings', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    
    logger.debug('Fetching settings', { shop: shopDomain });

    const settings = await query(
      `
      SELECT 
        s.delay_threshold_days,
        s.email_enabled,
        s.sms_enabled,
        s.notification_template,
        s.created_at,
        s.updated_at
      FROM app_settings s
      JOIN shops sh ON s.shop_id = sh.id
      WHERE sh.shop_domain = $1
      `,
      [shopDomain]
    );

    if (settings.length === 0) {
      // Create default settings if none exist
      await query(
        `
        INSERT INTO app_settings (shop_id, delay_threshold_days, email_enabled, sms_enabled)
        SELECT id, 2, true, false
        FROM shops
        WHERE shop_domain = $1
        `,
        [shopDomain]
      );
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          delay_threshold_days: 2,
          email_enabled: true,
          sms_enabled: false,
          notification_template: 'default',
        },
      };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: settings[0],
    };
  } catch (error) {
    logger.error('Error fetching settings', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch settings' };
  }
});

/**
 * PUT /api/settings
 * Update app settings for authenticated shop
 */
router.put('/settings', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    const { 
      delay_threshold_days, 
      email_enabled, 
      sms_enabled, 
      notification_template 
    } = ctx.request.body;
    
    logger.debug('Updating settings', { shop: shopDomain, settings: ctx.request.body });

    await query(
      `
      UPDATE app_settings
      SET 
        delay_threshold_days = COALESCE($1, delay_threshold_days),
        email_enabled = COALESCE($2, email_enabled),
        sms_enabled = COALESCE($3, sms_enabled),
        notification_template = COALESCE($4, notification_template),
        updated_at = CURRENT_TIMESTAMP
      WHERE shop_id = (SELECT id FROM shops WHERE shop_domain = $5)
      `,
      [delay_threshold_days, email_enabled, sms_enabled, notification_template, shopDomain]
    );

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    logger.error('Error updating settings', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to update settings' };
  }
});

/**
 * GET /api/analytics
 * Get analytics/stats for authenticated shop
 */
router.get('/analytics', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    
    logger.debug('Fetching analytics', { shop: shopDomain });

    // Get total alerts
    const alertStats = await query(
      `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_alerts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as alerts_last_30_days
      FROM delay_alerts da
      JOIN orders o ON da.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      `,
      [shopDomain]
    );

    // Get total orders
    const orderStats = await query(
      `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30_days
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      WHERE s.shop_domain = $1
      `,
      [shopDomain]
    );

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        alerts: alertStats[0] || {},
        orders: orderStats[0] || {},
      },
    };
  } catch (error) {
    logger.error('Error fetching analytics', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch analytics' };
  }
});

/**
 * GET /api/shop
 * Get current shop information
 */
router.get('/shop', requireAuth, async (ctx: Context) => {
  try {
    const shopDomain = ctx.state.shop;
    
    const shop = await query(
      `
      SELECT 
        shop_domain,
        created_at,
        updated_at
      FROM shops
      WHERE shop_domain = $1
      `,
      [shopDomain]
    );

    if (shop.length === 0) {
      ctx.status = 404;
      ctx.body = { error: 'Shop not found' };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: shop[0],
    };
  } catch (error) {
    logger.error('Error fetching shop', error as Error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch shop' };
  }
});

export { router as apiRoutes };
```

### Update `/src/server.ts` to include new API routes:

```typescript
import { apiRoutes } from './routes/api';

// Add after other routes
router.use(apiRoutes.routes());
```

---

## ⚛️ PHASE 5: FRONTEND - APP BRIDGE PROVIDER

### File: `/src/providers/ShopifyAppBridgeProvider.tsx` (NEW)

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createApp } from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { Context as AppBridgeContext } from '@shopify/app-bridge';

interface AppBridgeContextType {
  app: AppBridgeContext | null;
  getToken: () => Promise<string>;
  ready: boolean;
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  app: null,
  getToken: async () => '',
  ready: false,
});

export const useAppBridge = () => useContext(AppBridgeContext);

interface ShopifyAppBridgeProviderProps {
  children: React.ReactNode;
}

export const ShopifyAppBridgeProvider: React.FC<ShopifyAppBridgeProviderProps> = ({ 
  children 
}) => {
  const [app, setApp] = useState<AppBridgeContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Get shop from URL params (Shopify passes this when embedding)
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    const host = urlParams.get('host');

    // Development mode - skip App Bridge
    if (process.env.NODE_ENV === 'development' && !shop) {
      console.log('Development mode - App Bridge disabled');
      setReady(true);
      return;
    }

    if (!shop) {
      console.error('No shop parameter found - app may not be embedded correctly');
      return;
    }

    // Initialize Shopify App Bridge
    const apiKey = process.env.SHOPIFY_API_KEY || process.env.REACT_APP_SHOPIFY_API_KEY;
    
    if (!apiKey) {
      console.error('SHOPIFY_API_KEY not configured');
      return;
    }

    try {
      const appBridge = createApp({
        apiKey,
        host: host || btoa(shop), // Host parameter from Shopify
        forceRedirect: true, // Required for embedded apps
      });

      setApp(appBridge);
      setReady(true);

      console.log('Shopify App Bridge initialized', { shop });
    } catch (error) {
      console.error('Failed to initialize App Bridge:', error);
    }
  }, []);

  const getToken = async (): Promise<string> => {
    if (!app) {
      // Development mode
      if (process.env.NODE_ENV === 'development') {
        return 'dev-token';
      }
      throw new Error('App Bridge not initialized');
    }

    try {
      const token = await getSessionToken(app);
      return token;
    } catch (error) {
      console.error('Failed to get session token:', error);
      throw error;
    }
  };

  return (
    <AppBridgeContext.Provider value={{ app, getToken, ready }}>
      {children}
    </AppBridgeContext.Provider>
  );
};
```

---

## ⚛️ PHASE 6: FRONTEND - AUTHENTICATED API CLIENT

### File: `/src/lib/api-client.ts` (NEW)

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Authenticated API Client
 * 
 * Handles all API communication with automatic session token injection
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private getToken: () => Promise<string>;

  constructor(getTokenFn: () => Promise<string>) {
    this.getToken = getTokenFn;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add session token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await this.getToken();
          if (token && token !== 'dev-token') {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to get session token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - try to refresh
          const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
          
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              // Get fresh token
              const token = await this.getToken();
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              
              // Retry request
              return this.client(originalRequest);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              return Promise.reject(error);
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): ApiResponse {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message || 'API request failed';
      console.error('API Error:', message, error.response?.data);
      
      return {
        success: false,
        data: null,
        error: message,
      };
    }

    console.error('Unknown error:', error);
    return {
      success: false,
      data: null,
      error: 'An unexpected error occurred',
    };
  }
}

// Create singleton instance
let apiClientInstance: ApiClient | null = null;

export const initializeApiClient = (getTokenFn: () => Promise<string>) => {
  apiClientInstance = new ApiClient(getTokenFn);
  return apiClientInstance;
};

export const getApiClient = (): ApiClient => {
  if (!apiClientInstance) {
    throw new Error('API Client not initialized. Call initializeApiClient first.');
  }
  return apiClientInstance;
};
```

---

## ⚛️ PHASE 7: FRONTEND - API HOOKS

### File: `/src/hooks/useApi.ts` (NEW)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getApiClient, ApiResponse } from '../lib/api-client';

/**
 * Generic hook for API calls
 */
export function useApi<T = unknown>(
  endpoint: string,
  options: {
    immediate?: boolean;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {}
) {
  const { immediate = true, method = 'GET', body } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (customBody?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const client = getApiClient();
      let response: ApiResponse<T>;

      switch (method) {
        case 'GET':
          response = await client.get<T>(endpoint);
          break;
        case 'POST':
          response = await client.post<T>(endpoint, customBody || body);
          break;
        case 'PUT':
          response = await client.put<T>(endpoint, customBody || body);
          break;
        case 'DELETE':
          response = await client.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Request failed');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      setError(errorMessage);
      return { success: false, data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, body]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute,
  };
}

/**
 * Hook for fetching alerts
 */
export function useAlerts() {
  return useApi<Array<unknown>>('/alerts');
}

/**
 * Hook for fetching orders
 */
export function useOrders(limit = 50) {
  return useApi<Array<unknown>>(`/orders?limit=${limit}`);
}

/**
 * Hook for fetching settings
 */
export function useSettings() {
  return useApi<Record<string, unknown>>('/settings');
}

/**
 * Hook for updating settings
 */
export function useUpdateSettings() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSettings = useCallback(async (settings: Record<string, unknown>) => {
    setUpdating(true);
    setError(null);

    try {
      const client = getApiClient();
      const response = await client.put('/settings', settings);

      if (!response.success) {
        setError(response.error || 'Failed to update settings');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      return { success: false, data: null, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    updateSettings,
    updating,
    error,
  };
}

/**
 * Hook for fetching analytics
 */
export function useAnalytics() {
  return useApi<Record<string, unknown>>('/analytics');
}

/**
 * Hook for fetching shop info
 */
export function useShop() {
  return useApi<Record<string, unknown>>('/shop');
}
```

---

## ⚛️ PHASE 8: FRONTEND - UPDATE APP ENTRY POINT

### File: `/src/index.tsx` (UPDATE)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ShopifyAppBridgeProvider } from './providers/ShopifyAppBridgeProvider';
import { initializeApiClient } from './lib/api-client';
import { App } from './components/App';
import './styles/index.css';

// Wait for App Bridge to be ready before initializing API client
const AppWithProviders = () => {
  return (
    <Provider store={store}>
      <ShopifyAppBridgeProvider>
        <AppInitializer />
      </ShopifyAppBridgeProvider>
    </Provider>
  );
};

// Component to initialize API client after App Bridge is ready
const AppInitializer: React.FC = () => {
  const { getToken, ready } = useAppBridge();
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (ready && !initialized) {
      // Initialize API client with token getter
      initializeApiClient(getToken);
      setInitialized(true);
    }
  }, [ready, initialized, getToken]);

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Initializing app...</div>
      </div>
    );
  }

  return <App />;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);
```

---

## ⚛️ PHASE 9: FRONTEND - UPDATE COMPONENTS TO USE REAL DATA

### Example: Update `EnhancedDashboard` to use real data

### File: `/src/components/EnhancedDashboard/EnhancedDashboard.refactored.tsx` (UPDATE)

```typescript
import React, { useEffect, useState } from 'react';
import { useAlerts, useOrders, useSettings, useAnalytics } from '../../hooks/useApi';
// ... other imports ...

function EnhancedDashboard() {
  // Replace mock data with real API calls
  const { data: alerts, loading: alertsLoading, error: alertsError } = useAlerts();
  const { data: orders, loading: ordersLoading, error: ordersError } = useOrders();
  const { data: settings, loading: settingsLoading, error: settingsError } = useSettings();
  const { data: analytics, loading: analyticsLoading } = useAnalytics();

  // Show loading state while data is being fetched
  if (alertsLoading || ordersLoading || settingsLoading || analyticsLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Show error state if any API call failed
  if (alertsError || ordersError || settingsError) {
    return (
      <div className="error-container">
        <h2>Error Loading Dashboard</h2>
        <p>{alertsError || ordersError || settingsError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Use real data (with fallback to empty arrays/objects)
  const dashboardData = {
    alerts: alerts || [],
    orders: orders || [],
    settings: settings || {},
    stats: analytics || {},
  };

  return (
    <div className="enhanced-dashboard">
      {/* Render dashboard with real data */}
      {/* ... rest of component ... */}
    </div>
  );
}
```

---

## 🧪 PHASE 10: TESTING

### Development Testing:

```bash
# 1. Start backend in development mode
cd delayguard-app
npm run dev:server

# 2. Start frontend in development mode
npm run dev:client

# 3. Visit with shop parameter for testing
http://localhost:3000?shop=test-store.myshopify.com&host=base64encodedhost
```

### Production Testing:

```bash
# 1. Deploy to Vercel
vercel --prod

# 2. Configure in Shopify Partner Dashboard
# 3. Install on development store
# 4. Test embedded app functionality
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend:
- [ ] Install `jsonwebtoken` package
- [ ] Create session middleware (`/src/middleware/shopify-session.ts`)
- [ ] Create API routes (`/src/routes/api.ts`)
- [ ] Update `server.ts` to use middleware and routes
- [ ] Test session token validation
- [ ] Test API endpoints return shop-specific data

### Frontend:
- [ ] Install `@shopify/app-bridge` packages
- [ ] Create App Bridge Provider
- [ ] Create API Client
- [ ] Create API hooks (`useApi`, `useAlerts`, etc.)
- [ ] Update `index.tsx` to initialize everything
- [ ] Update components to use real data hooks
- [ ] Remove all mock data imports
- [ ] Test loading and error states

### Testing:
- [ ] Test authentication flow
- [ ] Test API calls with session token
- [ ] Test error handling
- [ ] Test token refresh
- [ ] Test in Shopify admin (embedded)

---

## 🎯 EXPECTED OUTCOME

After implementation:

1. ✅ Merchant installs app from Shopify
2. ✅ App opens embedded in Shopify admin
3. ✅ Shopify App Bridge automatically gets session token
4. ✅ All API calls include session token automatically
5. ✅ Backend validates token and returns merchant's real data
6. ✅ Dashboard shows merchant's actual orders, alerts, settings
7. ✅ No separate login required
8. ✅ Secure, scalable, production-ready

---

## 📚 REFERENCE LINKS

- [Shopify App Bridge Documentation](https://shopify.dev/docs/api/app-bridge)
- [Session Token Documentation](https://shopify.dev/docs/apps/auth/oauth/session-tokens)
- [Embedded App Best Practices](https://shopify.dev/docs/apps/best-practices/performance/render-embedded-apps)

---

**Time to implement**: 4-6 hours
**Difficulty**: Intermediate
**Result**: Production-ready authenticated embedded Shopify app

Would you like me to start implementing these files?

