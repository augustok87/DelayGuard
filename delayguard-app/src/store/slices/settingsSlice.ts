import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState } from '../../types/store';
import { AppSettings } from '../../types';

// Default settings
const defaultSettings: AppSettings = {
  delayThreshold: 2,
  notificationTemplate: 'default',
  emailNotifications: true,
  smsNotifications: false,
  autoResolveDays: 7,
  enableAnalytics: true,
  theme: 'light',
  language: 'en',
};

// Initial state
const initialState: SettingsState = {
  data: defaultSettings,
  loading: false,
  error: null,
  lastSaved: null,
};

// Async thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async(_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return defaultSettings;
    } catch (error) {
      return rejectWithValue('Failed to fetch settings');
    }
  },
);

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async(settings: AppSettings, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    } catch (error) {
      return rejectWithValue('Failed to save settings');
    }
  },
);

export const testDelayDetection = createAsyncThunk(
  'settings/testDelayDetection',
  async(_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, message: 'Delay detection test completed successfully' };
    } catch (error) {
      return rejectWithValue('Failed to test delay detection');
    }
  },
);

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    resetSettings: (state) => {
      state.data = defaultSettings;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Save settings
      .addCase(saveSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastSaved = new Date().toISOString();
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Test delay detection
      .addCase(testDelayDetection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(testDelayDetection.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(testDelayDetection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateSettings, resetSettings, clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
