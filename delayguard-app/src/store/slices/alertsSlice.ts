import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AlertsState, AlertFilters, PaginationState } from '../../types/store';
import { DelayAlert } from '../../types';

// Initial state
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

// Mock data
const mockAlerts: DelayAlert[] = [
  {
    id: '1',
    orderId: '1001',
    customerName: 'John Smith',
    delayDays: 3,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    customerEmail: 'john@example.com',
    trackingNumber: '1Z999AA1234567890',
    carrierCode: 'UPS',
    priority: 'high',
  },
  {
    id: '2',
    orderId: '1002',
    customerName: 'Sarah Johnson',
    delayDays: 5,
    status: 'resolved',
    createdAt: '2024-01-14T14:20:00Z',
    resolvedAt: '2024-01-16T09:15:00Z',
    customerEmail: 'sarah@example.com',
    trackingNumber: '1Z999BB9876543210',
    carrierCode: 'UPS',
    priority: 'medium',
  },
  {
    id: '3',
    orderId: '1003',
    customerName: 'Mike Wilson',
    delayDays: 2,
    status: 'active',
    createdAt: '2024-01-16T08:45:00Z',
    customerEmail: 'mike@example.com',
    trackingNumber: '1Z999CC1122334455',
    carrierCode: 'FedEx',
    priority: 'low',
  },
];

// Async thunks
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async(_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAlerts;
    } catch (error) {
      return rejectWithValue('Failed to fetch alerts');
    }
  },
);

export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async({ id, updates }: { id: string; updates: Partial<DelayAlert> }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, updates };
    } catch (error) {
      return rejectWithValue('Failed to update alert');
    }
  },
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async(id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return id;
    } catch (error) {
      return rejectWithValue('Failed to delete alert');
    }
  },
);

// Slice
const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AlertFilters>) => {
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
      // Fetch alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = Math.ceil(action.payload.length / state.pagination.limit);
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update alert
      .addCase(updateAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAlert.fulfilled, (state, action) => {
        state.loading = false;
        const { id, updates } = action.payload;
        const index = state.items.findIndex(alert => alert.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      })
      .addCase(updateAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete alert
      .addCase(deleteAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(alert => alert.id !== action.payload);
        state.pagination.total = state.items.length;
        state.pagination.totalPages = Math.ceil(state.items.length / state.pagination.limit);
      })
      .addCase(deleteAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPagination, clearError } = alertsSlice.actions;
export default alertsSlice.reducer;
