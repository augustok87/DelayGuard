import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrdersState, OrderFilters, PaginationState } from '../../types/store';
import { Order } from '../../types';

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

// Mock data
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
  {
    id: '2',
    orderNumber: '#1002',
    customerName: 'Sarah Johnson',
    status: 'delivered',
    trackingNumber: '1Z999BB9876543210',
    carrierCode: 'UPS',
    createdAt: '2024-01-14T14:20:00Z',
    customerEmail: 'sarah@example.com',
    totalAmount: 149.99,
    currency: 'USD',
  },
  {
    id: '3',
    orderNumber: '#1003',
    customerName: 'Mike Wilson',
    status: 'processing',
    createdAt: '2024-01-16T08:45:00Z',
    customerEmail: 'mike@example.com',
    totalAmount: 79.99,
    currency: 'USD',
  },
];

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockOrders;
    } catch (error) {
      return rejectWithValue('Failed to fetch orders');
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async ({ id, updates }: { id: string; updates: Partial<Order> }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, updates };
    } catch (error) {
      return rejectWithValue('Failed to update order');
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return id;
    } catch (error) {
      return rejectWithValue('Failed to delete order');
    }
  }
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
