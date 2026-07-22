import ordersSlice, {
  fetchOrders,
  updateOrder,
  deleteOrder,
  setFilters,
  clearFilters,
  setPagination,
  clearError,
} from '../../../../src/store/slices/ordersSlice';
import { configureStore } from '@reduxjs/toolkit';
import { Order } from '../../../../src/types';
import { apiClient } from '../../../../src/utils/api-client';

// G2: thunks call the real authenticated API client — mock the singleton.
jest.mock('../../../../src/utils/api-client', () => ({
  apiClient: {
    getOrders: jest.fn(),
  },
}));
const mockedGetOrders = apiClient.getOrders as jest.Mock;

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      orders: ordersSlice,
    },
  });
};

describe('ordersSlice', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().orders;
      expect(state).toEqual({
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
      });
    });
  });

  describe('synchronous actions', () => {
    it('should set filters', () => {
      const filters = { status: 'shipped', customerName: 'John' };
      store.dispatch(setFilters(filters));
      
      const state = store.getState().orders;
      expect(state.filters).toEqual(filters);
    });

    it('should clear filters', () => {
      // First set some filters
      store.dispatch(setFilters({ status: 'shipped' }));
      expect(store.getState().orders.filters).toEqual({ status: 'shipped' });
      
      // Then clear them
      store.dispatch(clearFilters());
      expect(store.getState().orders.filters).toEqual({});
    });

    it('should set pagination', () => {
      const pagination = { page: 2, limit: 20 };
      store.dispatch(setPagination(pagination));
      
      const state = store.getState().orders;
      expect(state.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('should clear error', () => {
      // First set an error
      store.dispatch({ type: 'orders/fetchOrders/rejected', payload: 'Test error' });
      expect(store.getState().orders.error).toBe('Test error');
      
      // Then clear it
      store.dispatch(clearError());
      expect(store.getState().orders.error).toBeNull();
    });
  });

  describe('fetchOrders async thunk', () => {
    it('should handle fetchOrders.pending', () => {
      store.dispatch({ type: fetchOrders.pending.type });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchOrders.fulfilled', () => {
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Smith',
          status: 'shipped',
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'UPS',
          createdAt: '2024-01-15T10:30:00Z',
          customerEmail: 'john@example.com',
          totalAmount: 99.99,
          currency: 'USD',
        },
      ];

      store.dispatch({ 
        type: fetchOrders.fulfilled.type, 
        payload: mockOrders, 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.items).toEqual(mockOrders);
      expect(state.pagination.total).toBe(1);
      expect(state.pagination.totalPages).toBe(1);
    });

    it('should handle fetchOrders.rejected', () => {
      const errorMessage = 'Failed to fetch orders';
      store.dispatch({ 
        type: fetchOrders.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateOrder async thunk', () => {
    it('should handle updateOrder.pending', () => {
      store.dispatch({ type: updateOrder.pending.type });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle updateOrder.fulfilled', () => {
      // First add some orders
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Smith',
          status: 'shipped',
          createdAt: '2024-01-15T10:30:00Z',
          customerEmail: 'john@example.com',
          totalAmount: 99.99,
          currency: 'USD',
        },
      ];
      
      store.dispatch({ 
        type: fetchOrders.fulfilled.type, 
        payload: mockOrders, 
      });

      // Then update an order
      const updatePayload = { 
        id: '1', 
        updates: { status: 'delivered' }, 
      };
      
      store.dispatch({ 
        type: updateOrder.fulfilled.type, 
        payload: updatePayload, 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.items[0].status).toBe('delivered');
    });

    it('should handle updateOrder.rejected', () => {
      const errorMessage = 'Failed to update order';
      store.dispatch({ 
        type: updateOrder.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('deleteOrder async thunk', () => {
    it('should handle deleteOrder.pending', () => {
      store.dispatch({ type: deleteOrder.pending.type });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle deleteOrder.fulfilled', () => {
      // First add some orders
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Smith',
          status: 'shipped',
          createdAt: '2024-01-15T10:30:00Z',
          customerEmail: 'john@example.com',
          totalAmount: 99.99,
          currency: 'USD',
        },
        {
          id: '2',
          orderNumber: '#1002',
          customerName: 'Jane Doe',
          status: 'delivered',
          createdAt: '2024-01-14T10:30:00Z',
          customerEmail: 'jane@example.com',
          totalAmount: 149.99,
          currency: 'USD',
        },
      ];
      
      store.dispatch({ 
        type: fetchOrders.fulfilled.type, 
        payload: mockOrders, 
      });

      // Then delete an order
      store.dispatch({ 
        type: deleteOrder.fulfilled.type, 
        payload: '1', 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('2');
      expect(state.pagination.total).toBe(1);
      expect(state.pagination.totalPages).toBe(1);
    });

    it('should handle deleteOrder.rejected', () => {
      const errorMessage = 'Failed to delete order';
      store.dispatch({ 
        type: deleteOrder.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('fetchOrders thunk (real API — G2)', () => {
    const wireOrder = {
      id: 7,
      shopify_order_id: '9999',
      order_number: '1001',
      customer_email: 'jane@example.com',
      customer_name: 'Jane Doe',
      total_price: '129.50',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      created_at: '2026-06-28T09:00:00Z',
      updated_at: '2026-06-29T09:00:00Z',
      alert_count: '1',
      last_alert_at: '2026-07-01T10:00:00Z',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetches orders from /api/orders and maps the wire rows', async() => {
      mockedGetOrders.mockResolvedValueOnce({
        success: true,
        data: [wireOrder],
      });

      await store.dispatch(fetchOrders());

      expect(mockedGetOrders).toHaveBeenCalledWith(50);
      const state = store.getState().orders;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items[0]).toMatchObject({
        id: '7',
        orderNumber: '1001',
        customerName: 'Jane Doe',
        status: 'shipped',
        totalAmount: 129.5,
      });
    });

    it('produces an empty list (designed empty state) for a fresh shop', async() => {
      mockedGetOrders.mockResolvedValueOnce({ success: true, data: [] });

      await store.dispatch(fetchOrders());

      expect(store.getState().orders.items).toEqual([]);
      expect(store.getState().orders.error).toBeNull();
    });

    it('rejects with the API error message on failure', async() => {
      mockedGetOrders.mockResolvedValueOnce({
        success: false,
        error: 'Shop not found',
      });

      await store.dispatch(fetchOrders());

      expect(store.getState().orders.error).toBe('Shop not found');
    });

    it('rejects gracefully when the client throws', async() => {
      mockedGetOrders.mockRejectedValueOnce(new Error('network down'));

      await store.dispatch(fetchOrders());

      expect(store.getState().orders.error).toBe('Failed to fetch orders');
    });

    it('updateOrder updates local state without fake latency', async() => {
      mockedGetOrders.mockResolvedValueOnce({
        success: true,
        data: [wireOrder],
      });
      await store.dispatch(fetchOrders());

      await store.dispatch(
        updateOrder({ id: '7', updates: { status: 'delivered' } }),
      );

      expect(store.getState().orders.items[0].status).toBe('delivered');
    });
  });

  describe('pagination calculations', () => {
    it('should calculate totalPages correctly with different limits', () => {
      const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        orderNumber: `#${1000 + i + 1}`,
        customerName: `Customer ${i + 1}`,
        status: 'shipped',
        createdAt: '2024-01-15T10:30:00Z',
        customerEmail: `customer${i + 1}@example.com`,
        totalAmount: 99.99,
        currency: 'USD',
      }));
      
      store.dispatch({ 
        type: fetchOrders.fulfilled.type, 
        payload: mockOrders, 
      });
      
      const state = store.getState().orders;
      expect(state.pagination.total).toBe(25);
      expect(state.pagination.totalPages).toBe(3); // 25 items / 10 limit = 3 pages
    });
  });
});