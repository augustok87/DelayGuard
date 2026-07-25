import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrdersState, OrderFilters, PaginationState } from '../../types/store';
import { Order } from '../../types';
import { apiClient } from '../../utils/api-client';
import { mapOrderRows } from '../../utils/api-mappers';

// How many orders the dashboard requests per load (server caps at 200).
const ORDERS_FETCH_LIMIT = 50;

// Initial state
const initialState: OrdersState = {
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

// Async thunks — G2: real API calls through the session-token
// authenticated apiClient (mock orders deleted; the Orders tab renders
// its designed empty state for a fresh shop).
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getOrders(ORDERS_FETCH_LIMIT);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch orders');
      }
      return mapOrderRows(response.data ?? []);
    } catch {
      return rejectWithValue('Failed to fetch orders');
    }
  },
);

// NOTE (G2): the backend exposes no PUT/DELETE /api/orders/:id — orders
// are Shopify-canonical and read-only in DelayGuard. These thunks only
// adjust dashboard-local presentation state.
export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async({ id, updates }: { id: string; updates: Partial<Order> }) => {
    return { id, updates };
  },
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async(id: string) => {
    return id;
  },
);

// Slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<OrderFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = Math.ceil(action.payload.length / state.pagination.limit);
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update order
      .addCase(updateOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.loading = false;
        const { id, updates } = action.payload;
        const index = state.items.findIndex(order => order.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete order
      .addCase(deleteOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(order => order.id !== action.payload);
        state.pagination.total = state.items.length;
        state.pagination.totalPages = Math.ceil(state.items.length / state.pagination.limit);
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPagination, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
