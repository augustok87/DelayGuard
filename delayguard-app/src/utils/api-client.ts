import { getSessionToken } from '@shopify/app-bridge/utilities';
import { logger } from './logger';

/**
 * Authenticated API Client for Shopify Embedded Apps
 * 
 * This client automatically:
 * 1. Retrieves session tokens from App Bridge
 * 2. Includes the token in Authorization headers
 * 3. Handles token refresh automatically
 * 4. Provides type-safe API methods
 * 
 * @see https://shopify.dev/docs/apps/auth/oauth/session-tokens
 */

interface ApiClientConfig {
  baseUrl?: string;
  app?: any; // App Bridge app instance
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  count?: number;
}

class ApiClient {
  private baseUrl: string;
  private app: any; // App Bridge app instance

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api';
    this.app = config.app;
  }

  /**
   * Set the App Bridge instance
   * This must be called before making any authenticated requests
   */
  setApp(app: any) {
    this.app = app;
    logger.debug('App Bridge instance set for API client');
  }

  /**
   * Get session token from App Bridge
   * This token is a JWT that proves the request is coming from Shopify
   */
  private async getToken(): Promise<string | null> {
    if (!this.app) {
      logger.warn('App Bridge not initialized. Returning null token.');
      return null;
    }

    try {
      const token = await getSessionToken(this.app);
      logger.debug('Session token retrieved successfully');
      return token;
    } catch (error) {
      logger.error('Failed to get session token', error as Error);
      return null;
    }
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken();
      const url = `${this.baseUrl}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      logger.debug('Making API request', { 
        method: options.method || 'GET', 
        url,
        hasToken: !!token,
      });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        logger.warn('API request failed', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });

        return {
          success: false,
          error: data.error || data.message || 'Request failed',
          code: data.code,
        };
      }

      logger.debug('API request successful', { url });

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      logger.error('API request error', error as Error, { endpoint });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========== API Methods ==========

  /**
   * GET /api/alerts
   * Fetch all delay alerts for the authenticated shop
   */
  async getAlerts() {
    return this.request<any[]>('/alerts');
  }

  /**
   * GET /api/orders
   * Fetch orders with optional limit
   */
  async getOrders(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<any[]>(`/orders${query}`);
  }

  /**
   * GET /api/settings
   * Fetch app settings for the authenticated shop
   */
  async getSettings() {
    return this.request<any>('/settings');
  }

  /**
   * PUT /api/settings
   * Update app settings
   */
  async updateSettings(settings: Record<string, any>) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * GET /api/analytics
   * Fetch analytics data
   */
  async getAnalytics() {
    return this.request<{
      alerts: any;
      orders: any;
    }>('/analytics');
  }

  /**
   * GET /api/shop
   * Fetch shop information
   */
  async getShop() {
    return this.request<any>('/shop');
  }

  /**
   * GET /api/health
   * Check API health (no authentication required)
   */
  async health() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient };
export type { ApiResponse };

