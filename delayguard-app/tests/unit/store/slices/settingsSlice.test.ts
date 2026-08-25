import settingsSlice, {
  fetchSettings,
  saveSettings,
  testDelayDetection,
  updateSettings,
  resetSettings,
  clearError,
} from '../../../../src/store/slices/settingsSlice';
import { configureStore } from '@reduxjs/toolkit';
import { AppSettings } from '../../../../src/types';
import { apiClient } from '../../../../src/utils/api-client';

// G2: thunks call the real authenticated API client — mock the singleton.
jest.mock('../../../../src/utils/api-client', () => ({
  apiClient: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    updateMerchantSettings: jest.fn(),
    testAlert: jest.fn(),
  },
}));
const mockedGetSettings = apiClient.getSettings as jest.Mock;
const mockedUpdateSettings = apiClient.updateSettings as jest.Mock;
const mockedTestAlert = apiClient.testAlert as jest.Mock;
const mockedUpdateMerchantSettings = apiClient.updateMerchantSettings as jest.Mock;

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      settings: settingsSlice,
    },
  });
};

describe('settingsSlice', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().settings;
      expect(state).toEqual({
        data: {
          delayThreshold: 2,
          notificationTemplate: 'default',
          emailNotifications: true,
          smsNotifications: false,
          autoResolveDays: 7,
          enableAnalytics: true,
          theme: 'light',
          language: 'en',
        },
        loading: false,
        saving: false,
        error: null,
        lastSaved: null,
      });
    });
  });

  describe('synchronous actions', () => {
    it('should update settings', () => {
      const updates: Partial<AppSettings> = {
        delayThreshold: 3,
        emailNotifications: false,
        theme: 'dark',
      };
      
      store.dispatch(updateSettings(updates));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(3);
      expect(state.data.emailNotifications).toBe(false);
      expect(state.data.theme).toBe('dark');
      // Other settings should remain unchanged
      expect(state.data.notificationTemplate).toBe('default');
      expect(state.data.smsNotifications).toBe(false);
    });

    it('should reset settings to default', () => {
      // First update some settings
      store.dispatch(updateSettings({ delayThreshold: 5, theme: 'dark' }));
      expect(store.getState().settings.data.delayThreshold).toBe(5);
      expect(store.getState().settings.data.theme).toBe('dark');
      
      // Then reset
      store.dispatch(resetSettings());
      
      const state = store.getState().settings;
      expect(state.data).toEqual({
        delayThreshold: 2,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: false,
        autoResolveDays: 7,
        enableAnalytics: true,
        theme: 'light',
        language: 'en',
      });
      expect(state.error).toBeNull();
    });

    it('should clear error', () => {
      // First set an error
      store.dispatch({ type: 'settings/fetchSettings/rejected', payload: 'Test error' });
      expect(store.getState().settings.error).toBe('Test error');
      
      // Then clear it
      store.dispatch(clearError());
      expect(store.getState().settings.error).toBeNull();
    });
  });

  describe('fetchSettings async thunk', () => {
    it('should handle fetchSettings.pending', () => {
      store.dispatch({ type: fetchSettings.pending.type });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchSettings.fulfilled', () => {
      const mockSettings: AppSettings = {
        delayThreshold: 3,
        notificationTemplate: 'custom',
        emailNotifications: false,
        smsNotifications: true,
        autoResolveDays: 10,
        enableAnalytics: false,
        theme: 'dark',
        language: 'es',
      };

      store.dispatch({ 
        type: fetchSettings.fulfilled.type, 
        payload: mockSettings, 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.data).toEqual(mockSettings);
    });

    it('should handle fetchSettings.rejected', () => {
      const errorMessage = 'Failed to fetch settings';
      store.dispatch({ 
        type: fetchSettings.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('saveSettings async thunk', () => {
    it('should handle saveSettings.pending', () => {
      store.dispatch({ type: saveSettings.pending.type });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle saveSettings.fulfilled', () => {
      const mockSettings: AppSettings = {
        delayThreshold: 4,
        notificationTemplate: 'premium',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 14,
        enableAnalytics: true,
        theme: 'light',
        language: 'fr',
      };

      const mockDate = '2024-01-15T10:30:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      store.dispatch({ 
        type: saveSettings.fulfilled.type, 
        payload: mockSettings, 
      });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(false);
      expect(state.data).toEqual(mockSettings);
      expect(state.lastSaved).toBe(mockDate);
    });

    it('should handle saveSettings.rejected', () => {
      const errorMessage = 'Failed to save settings';
      store.dispatch({ 
        type: saveSettings.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('testDelayDetection async thunk', () => {
    it('should handle testDelayDetection.pending', () => {
      store.dispatch({ type: testDelayDetection.pending.type });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle testDelayDetection.fulfilled', () => {
      store.dispatch({ 
        type: testDelayDetection.fulfilled.type, 
        payload: { success: true, message: 'Test completed' },
      });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(false);
    });

    it('should handle testDelayDetection.rejected', () => {
      const errorMessage = 'Failed to test delay detection';
      store.dispatch({ 
        type: testDelayDetection.rejected.type, 
        payload: errorMessage, 
      });
      
      const state = store.getState().settings;
      expect(state.saving).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('thunks call the real API (G2)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetchSettings maps the snake_case wire settings over the defaults', async() => {
      mockedGetSettings.mockResolvedValueOnce({
        success: true,
        data: {
          delay_threshold_days: 5,
          email_enabled: false,
          sms_enabled: true,
          notification_template: 'custom',
          custom_message: null,
        },
      });

      await store.dispatch(fetchSettings());

      expect(mockedGetSettings).toHaveBeenCalledTimes(1);
      const state = store.getState().settings;
      expect(state.data).toMatchObject({
        delayThreshold: 5,
        emailNotifications: false,
        smsNotifications: true,
        notificationTemplate: 'custom',
        // local-only defaults survive the overlay
        autoResolveDays: 7,
        theme: 'light',
      });
    });

    it('fetchSettings rejects with the API error on failure', async() => {
      mockedGetSettings.mockResolvedValueOnce({
        success: false,
        error: 'Shop not found',
      });

      await store.dispatch(fetchSettings());

      expect(store.getState().settings.error).toBe('Shop not found');
    });

    it('saveSettings PUTs the snake_case wire body and stores the saved settings', async() => {
      mockedUpdateSettings.mockResolvedValueOnce({
        success: true,
        message: 'Settings updated successfully',
      });

      const newSettings: AppSettings = {
        delayThreshold: 4,
        notificationTemplate: 'custom',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 7,
        enableAnalytics: true,
        theme: 'light',
        language: 'en',
      };

      await store.dispatch(saveSettings(newSettings));

      expect(mockedUpdateSettings).toHaveBeenCalledWith({
        delay_threshold_days: 4,
        email_enabled: true,
        sms_enabled: true,
        notification_template: 'custom',
      });
      const state = store.getState().settings;
      expect(state.data).toEqual(newSettings);
      expect(state.lastSaved).not.toBeNull();
    });

    it('saveSettings rejects with the API error on failure', async() => {
      mockedUpdateSettings.mockResolvedValueOnce({
        success: false,
        error: 'delay_threshold_days must be between 1 and 30',
      });

      await store.dispatch(
        saveSettings({
          delayThreshold: 99,
          notificationTemplate: 'default',
          emailNotifications: true,
          smsNotifications: false,
        }),
      );

      expect(store.getState().settings.error).toBe(
        'delay_threshold_days must be between 1 and 30',
      );
    });

    it('testDelayDetection POSTs to /api/test-alert with a default warehouse delay', async() => {
      mockedTestAlert.mockResolvedValueOnce({
        success: true,
        data: {
          channelsAttempted: ['email'],
          recipientEmail: 'merchant@example.com',
          recipientPhone: null,
        },
      });

      const result = await store.dispatch(testDelayDetection());

      expect(mockedTestAlert).toHaveBeenCalledWith({ delayType: 'warehouse' });
      expect(testDelayDetection.fulfilled.match(result)).toBe(true);
      expect(
        (result.payload as { success: boolean; message: string }).message,
      ).toContain('email');
      expect(store.getState().settings.loading).toBe(false);
    });

    it('testDelayDetection forwards an explicit delay type', async() => {
      mockedTestAlert.mockResolvedValueOnce({
        success: true,
        data: { channelsAttempted: ['sms'], recipientEmail: null, recipientPhone: '+15555550100' },
      });

      await store.dispatch(testDelayDetection({ delayType: 'transit' }));

      expect(mockedTestAlert).toHaveBeenCalledWith({ delayType: 'transit' });
    });

    it('testDelayDetection reports when no channel could be attempted', async() => {
      mockedTestAlert.mockResolvedValueOnce({
        success: true,
        data: { channelsAttempted: [], recipientEmail: null, recipientPhone: null },
      });

      const result = await store.dispatch(testDelayDetection());

      expect(testDelayDetection.fulfilled.match(result)).toBe(true);
      expect(
        (result.payload as { message: string }).message.toLowerCase(),
      ).toContain('no channels');
    });

    it('testDelayDetection rejects with the API error on failure', async() => {
      mockedTestAlert.mockResolvedValueOnce({
        success: false,
        error: 'Merchant email not configured',
      });

      const result = await store.dispatch(testDelayDetection());

      expect(testDelayDetection.rejected.match(result)).toBe(true);
      expect(store.getState().settings.error).toBe(
        'Merchant email not configured',
      );
    });
  });

  describe('settings validation', () => {
    it('should handle partial settings updates correctly', () => {
      // Update only one field
      store.dispatch(updateSettings({ delayThreshold: 5 }));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(5);
      expect(state.data.emailNotifications).toBe(true); // Should remain unchanged
      expect(state.data.theme).toBe('light'); // Should remain unchanged
    });

    it('should handle multiple settings updates', () => {
      const updates: Partial<AppSettings> = {
        delayThreshold: 1,
        emailNotifications: false,
        smsNotifications: true,
        theme: 'dark',
        language: 'es',
      };
      
      store.dispatch(updateSettings(updates));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(1);
      expect(state.data.emailNotifications).toBe(false);
      expect(state.data.smsNotifications).toBe(true);
      expect(state.data.theme).toBe('dark');
      expect(state.data.language).toBe('es');
    });
  });

  /**
   * Regression: a *mutation* must not flip the same `loading` flag that gates
   * the dashboard's initial render.
   *
   * RefactoredApp.optimized combines `settingsLoading` into one `loading` prop
   * that DashboardTab uses to swap the form for a loading state. Because
   * saveSettings.pending set `loading = true`, and NotificationPreferences
   * saves on every keystroke, each typed character unmounted and remounted the
   * whole tab — the field lost focus and the view snapped back to the first
   * card. Typing a merchant email was impossible; only a paste worked.
   *
   * `loading` now means "doing the initial fetch"; `saving` means "a write is
   * in flight" and never gates rendering.
   */
  describe('a write in flight must not gate the initial-render loading flag', () => {
    it('saveSettings.pending sets saving, and leaves loading false', () => {
      store.dispatch({ type: saveSettings.pending.type });

      const state = store.getState().settings;
      expect(state.saving).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('testDelayDetection.pending sets saving, and leaves loading false', () => {
      store.dispatch({ type: testDelayDetection.pending.type });

      const state = store.getState().settings;
      expect(state.saving).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('fetchSettings.pending still sets loading — the initial load may gate render', () => {
      store.dispatch({ type: fetchSettings.pending.type });

      const state = store.getState().settings;
      expect(state.loading).toBe(true);
      expect(state.saving).toBe(false);
    });

    it('clears saving when a save settles, either way', () => {
      const saved: AppSettings = {
        delayThreshold: 3,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: false,
        autoResolveDays: 7,
        enableAnalytics: true,
        theme: 'light',
        language: 'en',
      };

      store.dispatch({ type: saveSettings.pending.type });
      store.dispatch({
        type: saveSettings.fulfilled.type,
        payload: saved,
      });
      expect(store.getState().settings.saving).toBe(false);

      store.dispatch({ type: saveSettings.pending.type });
      store.dispatch({
        type: saveSettings.rejected.type,
        payload: 'nope',
      });
      expect(store.getState().settings.saving).toBe(false);
    });
  });

  /**
   * Regression (LAUNCH_PLAN §6 R12).
   *
   * The dashboard's Merchant Email / Phone / Name fields reported
   * "Settings saved successfully!" on every keystroke and persisted
   * NOTHING: `shops.merchant_email` stayed empty and `shops.updated_at`
   * did not move for 26 days.
   *
   * Cause: `settingsToWire` emits only the four app_settings columns, and
   * `PUT /api/settings` reads only those. The contact fields have their own
   * endpoint — `PUT /api/merchant-settings`, camelCase body — which the
   * frontend never called, because `apiClient` had no method for it.
   * Server-side `updateMerchantSettings` gates its `UPDATE shops` on
   * `hasContactUpdates`, so absent fields meant no statement ran at all
   * and 200 was still returned.
   */
  describe('merchant contact fields actually persist', () => {
    const baseSettings: AppSettings = {
      delayThreshold: 2,
      notificationTemplate: 'default',
      emailNotifications: true,
      smsNotifications: false,
      autoResolveDays: 7,
      enableAnalytics: true,
      theme: 'light',
      language: 'en',
    };

    beforeEach(() => {
      mockedUpdateSettings.mockResolvedValue({ success: true, data: {} });
      mockedUpdateMerchantSettings.mockResolvedValue({ success: true, data: {} });
    });

    it('PUTs the contact fields to /api/merchant-settings', async() => {
      const withContact: AppSettings = {
        ...baseSettings,
        merchantEmail: 'owner@example.com',
        merchantPhone: '+1 (208) 757 3934',
        merchantName: 'Joonie',
      };

      await store.dispatch(saveSettings(withContact) as never);

      expect(mockedUpdateMerchantSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantEmail: 'owner@example.com',
          merchantPhone: '+1 (208) 757 3934',
          merchantName: 'Joonie',
        }),
      );
    });

    it('does not call the contact endpoint when no contact field is set', async() => {
      await store.dispatch(saveSettings(baseSettings) as never);

      expect(mockedUpdateMerchantSettings).not.toHaveBeenCalled();
    });

    it('still PUTs the app_settings columns to /api/settings', async() => {
      const withContact: AppSettings = {
        ...baseSettings,
        merchantEmail: 'owner@example.com',
      };

      await store.dispatch(saveSettings(withContact) as never);

      expect(mockedUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ delay_threshold_days: expect.anything() }),
      );
    });
  });
});
