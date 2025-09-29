import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppState } from '../../types/store';

// Initial state
const initialState: AppState = {
  loading: false,
  error: null,
  shop: null,
  initialized: false,
};

// Async thunks
export const initializeApp = createAsyncThunk(
  'app/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call to get shop info
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'my-awesome-store.myshopify.com';
    } catch (error) {
      return rejectWithValue('Failed to initialize app');
    }
  }
);

export const connectShopify = createAsyncThunk(
  'app/connectShopify',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'my-awesome-store.myshopify.com';
    } catch (error) {
      return rejectWithValue('Failed to connect to Shopify');
    }
  }
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
      });
  },
});

export const { clearError, setLoading, setShop } = appSlice.actions;
export default appSlice.reducer;
