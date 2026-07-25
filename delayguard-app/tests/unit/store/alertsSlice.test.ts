import { configureStore } from '@reduxjs/toolkit';
import alertsReducer, {
  setFilters,
  setPagination,
  clearError,
  fetchAlerts,
  updateAlert,
  deleteAlert,
} from '../../../src/store/slices/alertsSlice';
import { AlertsState } from '../../../src/types/store';
import { DelayAlert } from '../../../src/types';
import { apiClient } from '../../../src/utils/api-client';

// G2: thunks call the real authenticated API client — mock the singleton.
jest.mock('../../../src/utils/api-client', () => ({
  apiClient: {
    getAlerts: jest.fn(),
    updateAlertStatus: jest.fn(),
  },
}));
const mockedGetAlerts = apiClient.getAlerts as jest.Mock;
const mockedUpdateAlertStatus = apiClient.updateAlertStatus as jest.Mock;

const mockAlert: DelayAlert = {
  id: 'alert-1',
  orderId: 'order-123',
  customerName: 'John Doe',
  delayDays: 5,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  customerEmail: 'john@example.com',
  trackingNumber: 'TRK123456',
  carrierCode: 'UPS',
  priority: 'medium',
};

const initialState: AlertsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

describe('alertsSlice', () => {
  it('should return the initial state', () => {
    expect(alertsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setFilters', () => {
    const filters = { status: 'active' as const, search: 'John' };
    const actual = alertsReducer(initialState, setFilters(filters));
    expect(actual.filters).toEqual(filters);
  });

  it('should handle setPagination', () => {
    const pagination = { page: 2, limit: 20, total: 100, totalPages: 5 };
    const actual = alertsReducer(initialState, setPagination(pagination));
    expect(actual.pagination).toEqual(pagination);
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = alertsReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle fetchAlerts pending', () => {
    const actual = alertsReducer(initialState, fetchAlerts.pending('', undefined));
    expect(actual.loading).toBe(true);
    expect(actual.error).toBeNull();
  });

  it('should handle fetchAlerts fulfilled', () => {
    const alerts = [mockAlert];
    const actual = alertsReducer(initialState, fetchAlerts.fulfilled(alerts, '', undefined));
    expect(actual.loading).toBe(false);
    expect(actual.items).toEqual(alerts);
    expect(actual.pagination.total).toBe(1);
  });

  it('should handle fetchAlerts rejected', () => {
    const error = 'Failed to fetch alerts';
    const action = {
      type: fetchAlerts.rejected.type,
      payload: error,
      error: { message: error },
    };
    const actual = alertsReducer(initialState, action as any);
    expect(actual.loading).toBe(false);
    expect(actual.error).toBe(error);
  });

  it('should handle updateAlert fulfilled', () => {
    const stateWithAlert = { ...initialState, items: [mockAlert] };
    const updates = { status: 'resolved' as const };
    const actual = alertsReducer(stateWithAlert, updateAlert.fulfilled({ id: 'alert-1', updates }, '', { id: 'alert-1', updates }));
    expect(actual.items[0].status).toBe('resolved');
  });

  it('should handle deleteAlert fulfilled', () => {
    const stateWithAlert = { ...initialState, items: [mockAlert] };
    const actual = alertsReducer(stateWithAlert, deleteAlert.fulfilled('alert-1', '', 'alert-1'));
    expect(actual.items).toHaveLength(0);
  });

  it('should handle partial filter updates', () => {
    const initialFilters = { status: 'active' as const };
    const stateWithFilters = { ...initialState, filters: initialFilters };
    
    const actual = alertsReducer(stateWithFilters, setFilters({ search: 'John' }));
    expect(actual.filters).toEqual({ search: 'John' });
  });

  it('should handle partial pagination updates', () => {
    const initialPagination = { page: 1, limit: 10, total: 50, totalPages: 5 };
    const stateWithPagination = { ...initialState, pagination: initialPagination };
    
    const actual = alertsReducer(stateWithPagination, setPagination({ page: 2 }));
    expect(actual.pagination).toEqual({ ...initialPagination, page: 2 });
  });

  it('should preserve other state when updating single field', () => {
    const stateWithData = {
      ...initialState,
      items: [mockAlert],
      loading: true,
      error: 'Some error',
    };
    
    const actual = alertsReducer(stateWithData, setFilters({ status: 'active' }));
    expect(actual.items).toEqual([mockAlert]);
    expect(actual.loading).toBe(true);
    expect(actual.error).toBe('Some error');
  });

  describe('fetchAlerts thunk (real API — G2)', () => {
    const wireAlert = {
      id: 42,
      order_id: '7',
      status: 'pending',
      delay_reason: 'CARRIER_DELAY',
      estimated_delay_days: 3,
      notification_sent_at: null,
      created_at: '2026-07-01T10:00:00Z',
      updated_at: '2026-07-01T10:00:00Z',
      order_number: '1001',
      customer_email: 'jane@example.com',
      customer_name: 'Jane Doe',
      total_price: '384.99',
      order_created_at: '2026-06-28T09:00:00Z',
    };

    const createStore = (preloaded?: AlertsState) =>
      configureStore({
        reducer: { alerts: alertsReducer },
        ...(preloaded ? { preloadedState: { alerts: preloaded } } : {}),
      });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetches alerts from /api/alerts and maps the wire rows', async() => {
      mockedGetAlerts.mockResolvedValueOnce({
        success: true,
        data: [wireAlert],
      });

      const store = createStore();
      await store.dispatch(fetchAlerts());

      expect(mockedGetAlerts).toHaveBeenCalledTimes(1);
      const state = store.getState().alerts;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({
        id: '42',
        orderId: '1001',
        customerName: 'Jane Doe',
        delayDays: 3,
        status: 'active',
        totalAmount: 384.99,
      });
    });

    it('produces an empty list (designed empty state) for a fresh shop', async() => {
      mockedGetAlerts.mockResolvedValueOnce({ success: true, data: [] });

      const store = createStore();
      await store.dispatch(fetchAlerts());

      const state = store.getState().alerts;
      expect(state.items).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('rejects with the API error message on failure', async() => {
      mockedGetAlerts.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
      });

      const store = createStore();
      await store.dispatch(fetchAlerts());

      const state = store.getState().alerts;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Unauthorized');
      expect(state.items).toEqual([]);
    });

    it('rejects gracefully when the client throws', async() => {
      mockedGetAlerts.mockRejectedValueOnce(new Error('network down'));

      const store = createStore();
      await store.dispatch(fetchAlerts());

      expect(store.getState().alerts.error).toBe('Failed to fetch alerts');
    });

    it('updateAlert persists a status change through the API and updates local state', async() => {
      mockedUpdateAlertStatus.mockResolvedValueOnce({ success: true });
      const store = createStore({ ...initialState, items: [mockAlert] });

      await store.dispatch(
        updateAlert({ id: 'alert-1', updates: { status: 'resolved' } }),
      );

      // Persisted to the backend (survives a reload) …
      expect(mockedUpdateAlertStatus).toHaveBeenCalledWith('alert-1', 'resolved');
      // … and reflected optimistically in local state.
      expect(store.getState().alerts.items[0].status).toBe('resolved');
    });

    it('updateAlert rejects (no local mutation) when the API call fails', async() => {
      mockedUpdateAlertStatus.mockResolvedValueOnce({
        success: false,
        error: 'Alert not found',
      });
      const store = createStore({ ...initialState, items: [mockAlert] });

      await store.dispatch(
        updateAlert({ id: 'alert-1', updates: { status: 'dismissed' } }),
      );

      expect(store.getState().alerts.items[0].status).toBe('active');
      expect(store.getState().alerts.error).toBe('Alert not found');
    });

    it('updateAlert with no status change skips the API (pure local update)', async() => {
      const store = createStore({ ...initialState, items: [mockAlert] });

      await store.dispatch(
        updateAlert({ id: 'alert-1', updates: { customerName: 'Renamed' } }),
      );

      expect(mockedUpdateAlertStatus).not.toHaveBeenCalled();
      expect(store.getState().alerts.items[0].customerName).toBe('Renamed');
    });

    it('deleteAlert removes the alert from local state', async() => {
      const store = createStore({ ...initialState, items: [mockAlert] });

      await store.dispatch(deleteAlert('alert-1'));

      expect(store.getState().alerts.items).toHaveLength(0);
    });
  });
});