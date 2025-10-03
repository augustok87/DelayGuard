import alertsReducer, {
  setFilters,
  setPagination,
  clearError,
  fetchAlerts,
  updateAlert,
  deleteAlert,
} from '../../../src/components/alertsSlice';
import { AlertsState } from '../../../src/components/../../types/store';
import { DelayAlert } from '../../../src/components/../../types';

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
});