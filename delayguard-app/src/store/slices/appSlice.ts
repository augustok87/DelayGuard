import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppState } from '../../types/store';
import { apiClient } from '../../utils/api-client';
import { mapAnalyticsToStats, mapShopDomain } from '../../utils/api-mappers';

// Initial state
const initialState: AppState = {
  loading: false,
  error: null,
  shop: null,
  initialized: false,
  stats: null,
};

// Async thunks — G2: real API calls through the session-token
// authenticated apiClient (previously hardcoded to a fake shop domain).
export const initializeApp = createAsyncThunk(
  'app/initialize',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getShop();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to initialize app');
      }
      const shopDomain = mapShopDomain(response.data);
      if (!shopDomain) {
        return rejectWithValue('Failed to initialize app');
      }
      return shopDomain;
    } catch {
      return rejectWithValue('Failed to initialize app');
    }
  },
);

// In an embedded app the OAuth install already happened — "connect"
// verifies the live session by re-fetching the shop.
export const connectShopify = createAsyncThunk(
  'app/connectShopify',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getShop();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to connect to Shopify');
      }
      const shopDomain = mapShopDomain(response.data);
      if (!shopDomain) {
        return rejectWithValue('Failed to connect to Shopify');
      }
      return shopDomain;
    } catch {
      return rejectWithValue('Failed to connect to Shopify');
    }
  },
);

/**
 * G2: header stats from GET /api/analytics. Failure is non-fatal — the
 * reducer leaves `stats` null and does NOT set the global error (a stats
 * hiccup must not blank the dashboard; alerts/orders surface real errors).
 */
export const fetchDashboardStats = createAsyncThunk(
  'app/fetchDashboardStats',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getAnalytics();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch analytics');
      }
      return mapAnalyticsToStats(response.data);
    } catch {
      return rejectWithValue('Failed to fetch analytics');
    }
  },
);

// Slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setShop: (state, action: PayloadAction<string | null>) => {
      state.shop = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize app
      .addCase(initializeApp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.loading = false;
        state.shop = action.payload;
        state.initialized = true;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Connect Shopify
      .addCase(connectShopify.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectShopify.fulfilled, (state, action) => {
        state.loading = false;
        state.shop = action.payload;
      })
      .addCase(connectShopify.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Dashboard stats (non-fatal — no global loading/error churn)
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state) => {
        state.stats = null;
      });
  },
});

export const { clearError, setLoading, setShop } = appSlice.actions;
export default appSlice.reducer;
