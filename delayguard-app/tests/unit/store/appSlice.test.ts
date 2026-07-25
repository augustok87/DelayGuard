import { configureStore } from '@reduxjs/toolkit';
import appReducer, {
  setShop,
  setLoading,
  clearError,
  initializeApp,
  connectShopify,
  fetchDashboardStats,
} from '../../../src/store/slices/appSlice';
import { AppState } from '../../../src/types/store';
import { apiClient } from '../../../src/utils/api-client';

// G2: thunks call the real authenticated API client — mock the singleton.
jest.mock('../../../src/utils/api-client', () => ({
  apiClient: {
    getShop: jest.fn(),
    getAnalytics: jest.fn(),
  },
}));
const mockedGetShop = apiClient.getShop as jest.Mock;
const mockedGetAnalytics = apiClient.getAnalytics as jest.Mock;

describe('appSlice', () => {
  const initialState: AppState = {
    shop: null,
    loading: false,
    error: null,
    initialized: false,
    stats: null,
  };

  it('should return the initial state', () => {
    expect(appReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setShop', () => {
    const shop = 'test-shop.myshopify.com';
    const actual = appReducer(initialState, setShop(shop));
    expect(actual.shop).toBe(shop);
  });

  it('should handle setLoading', () => {
    const actual = appReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = appReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle multiple state changes', () => {
    let actual = appReducer(initialState, setShop('test-shop.myshopify.com'));
    actual = appReducer(actual, setLoading(true));
    
    expect(actual.shop).toBe('test-shop.myshopify.com');
    expect(actual.loading).toBe(true);
    expect(actual.error).toBeNull();
  });

  it('should preserve other state when updating single field', () => {
    const stateWithShop = { ...initialState, shop: 'existing-shop.myshopify.com' };
    const actual = appReducer(stateWithShop, setLoading(true));
    
    expect(actual.shop).toBe('existing-shop.myshopify.com');
    expect(actual.loading).toBe(true);
  });

  it('should handle null values correctly', () => {
    const stateWithValues = {
      shop: 'test-shop.myshopify.com',
      loading: true,
      error: 'Some error',
      initialized: true,
      stats: null,
    };
    
    let actual = appReducer(stateWithValues, setShop(null));
    expect(actual.shop).toBeNull();
    
    actual = appReducer(actual, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle empty string values', () => {
    const actual = appReducer(initialState, setShop(''));
    expect(actual.shop).toBe('');
  });

  it('should handle boolean state changes', () => {
    let actual = appReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
    
    actual = appReducer(actual, setLoading(false));
    expect(actual.loading).toBe(false);
    
    // Test that initialized is set to true when initializeApp is fulfilled
    actual = appReducer(actual, initializeApp.fulfilled('my-awesome-store.myshopify.com', 'test-request-id'));
    expect(actual.initialized).toBe(true);
  });

  describe('thunks call the real API (G2)', () => {
    const createStore = () =>
      configureStore({ reducer: { app: appReducer } });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('initializeApp resolves the shop domain from GET /api/shop', async() => {
      mockedGetShop.mockResolvedValueOnce({
        success: true,
        data: { shop_domain: 'real-shop.myshopify.com' },
      });

      const store = createStore();
      await store.dispatch(initializeApp());

      expect(mockedGetShop).toHaveBeenCalledTimes(1);
      const state = store.getState().app;
      expect(state.shop).toBe('real-shop.myshopify.com');
      expect(state.initialized).toBe(true);
      expect(state.error).toBeNull();
    });

    it('initializeApp rejects when the shop lookup fails', async() => {
      mockedGetShop.mockResolvedValueOnce({
        success: false,
        error: 'Shop not found',
      });

      const store = createStore();
      await store.dispatch(initializeApp());

      expect(store.getState().app.error).toBe('Shop not found');
      expect(store.getState().app.shop).toBeNull();
    });

    it('connectShopify verifies the live session via GET /api/shop', async() => {
      mockedGetShop.mockResolvedValueOnce({
        success: true,
        data: { shop_domain: 'real-shop.myshopify.com' },
      });

      const store = createStore();
      await store.dispatch(connectShopify());

      expect(store.getState().app.shop).toBe('real-shop.myshopify.com');
    });

    it('fetchDashboardStats maps /api/analytics into StatsData', async() => {
      mockedGetAnalytics.mockResolvedValueOnce({
        success: true,
        data: {
          alerts: {
            total_alerts: '12',
            sent_alerts: '9',
            pending_alerts: '3',
            failed_alerts: '0',
            alerts_last_30_days: '5',
            alerts_last_7_days: '2',
          },
          orders: {
            total_orders: '104',
            orders_last_30_days: '40',
            orders_last_7_days: '11',
            average_order_value: '88.12',
          },
        },
      });

      const store = createStore();
      await store.dispatch(fetchDashboardStats());

      expect(store.getState().app.stats).toEqual({
        totalAlerts: 12,
        activeAlerts: 3,
        resolvedAlerts: 9,
        totalOrders: 104,
        delayedOrders: 12,
      });
    });

    it('fetchDashboardStats yields zeroed stats for a fresh shop', async() => {
      mockedGetAnalytics.mockResolvedValueOnce({
        success: true,
        data: { alerts: {}, orders: {} },
      });

      const store = createStore();
      await store.dispatch(fetchDashboardStats());

      expect(store.getState().app.stats).toMatchObject({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
      });
    });

    it('fetchDashboardStats failure leaves stats null and does not raise a global error', async() => {
      mockedGetAnalytics.mockResolvedValueOnce({
        success: false,
        error: 'boom',
      });

      const store = createStore();
      await store.dispatch(fetchDashboardStats());

      const state = store.getState().app;
      expect(state.stats).toBeNull();
      // Stats are decorative; a stats failure must not blank the app
      // with a full-screen error (alerts/orders surface real errors).
      expect(state.error).toBeNull();
    });
  });
});
