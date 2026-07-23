import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AlertsState, AlertFilters, PaginationState } from '../../types/store';
import { DelayAlert } from '../../types';
import { apiClient } from '../../utils/api-client';
import { mapAlertRows } from '../../utils/api-mappers';

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

// Async thunks — G2: real API calls through the session-token
// authenticated apiClient (the hardcoded mock alerts are gone; the tabs
// render designed empty states when the shop has no data yet).
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getAlerts();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch alerts');
      }
      return mapAlertRows(response.data ?? []);
    } catch {
      return rejectWithValue('Failed to fetch alerts');
    }
  },
);

// A status change (resolve/dismiss/reopen) is persisted through
// PUT /api/alerts/:id/status so it survives a reload; any other field
// update stays dashboard-local. The optimistic local update happens in the
// fulfilled reducer regardless — a failed persist rejects the thunk (leaving
// local state untouched) and surfaces the error.
export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async(
    { id, updates }: { id: string; updates: Partial<DelayAlert> },
    { rejectWithValue },
  ) => {
    if (updates.status) {
      try {
        const response = await apiClient.updateAlertStatus(id, updates.status);
        if (!response.success) {
          return rejectWithValue(
            response.error || 'Failed to update alert status',
          );
        }
      } catch {
        return rejectWithValue('Failed to update alert status');
      }
    }
    return { id, updates };
  },
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async(id: string) => {
    return id;
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
