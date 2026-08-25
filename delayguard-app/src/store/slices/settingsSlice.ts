import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState } from '../../types/store';
import { AppSettings } from '../../types';
import { apiClient } from '../../utils/api-client';
import {
  mapSettingsRow,
  settingsToWire,
  contactToWire,
} from '../../utils/api-mappers';

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
  saving: false,
  error: null,
  lastSaved: null,
};

// Async thunks — G2: real API calls through the session-token
// authenticated apiClient.
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async(_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getSettings();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch settings');
      }
      // Overlay the persisted wire columns onto the defaults; local-only
      // fields (theme, language, …) keep their defaults.
      return mapSettingsRow(response.data, defaultSettings);
    } catch {
      return rejectWithValue('Failed to fetch settings');
    }
  },
);

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async(settings: AppSettings, { rejectWithValue }) => {
    try {
      const response = await apiClient.updateSettings(settingsToWire(settings));
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to save settings');
      }

      // Contact details live on `shops`, not `app_settings`, and have their
      // own endpoint. PUT /api/settings reads neither, so sending them there
      // reported success and wrote nothing (LAUNCH_PLAN §6 R12). Only call
      // it when there is something to write — the server gates its
      // `UPDATE shops` on at least one contact field being present.
      const contact = contactToWire(settings);
      if (contact) {
        const contactResponse = await apiClient.updateMerchantSettings(contact);
        if (!contactResponse.success) {
          return rejectWithValue(
            contactResponse.error || 'Failed to save contact details',
          );
        }
      }

      return settings;
    } catch {
      return rejectWithValue('Failed to save settings');
    }
  },
);

/**
 * Phase 2.1.f: the dashboard test button — POST /api/test-alert
 * dispatches a synthesized sample alert to the merchant's configured
 * contact (dry-run: no delay_alerts row, no queue enqueue).
 */
export const testDelayDetection = createAsyncThunk(
  'settings/testDelayDetection',
  async(
    options: { delayType?: 'warehouse' | 'carrier' | 'transit' } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.testAlert({
        delayType: options?.delayType ?? 'warehouse',
      });
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to send test alert');
      }
      const channels = response.data?.channelsAttempted ?? [];
      const message =
        channels.length > 0
          ? `Test alert sent via ${channels.join(' + ')}`
          : 'No channels attempted — enable email/SMS and set a merchant contact in Settings';
      return { success: true, message };
    } catch {
      return rejectWithValue('Failed to send test alert');
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
      // Save settings — `saving`, never `loading`. NotificationPreferences
      // writes on every keystroke, and `loading` gates whether DashboardTab
      // renders the form at all; using it here unmounted the form mid-type.
      .addCase(saveSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.lastSaved = new Date().toISOString();
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      // Test delay detection — a write too; same reasoning as above.
      .addCase(testDelayDetection.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(testDelayDetection.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(testDelayDetection.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateSettings, resetSettings, clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
