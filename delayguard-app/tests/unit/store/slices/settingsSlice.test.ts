import { configureStore } from '@reduxjs/toolkit';
import settingsSlice, { 
  setSettings, 
  updateSetting, 
  clearError, 
  resetSettings,
  fetchSettings,
  saveSettings,
  testDelayDetection,
  connectToShopify
} from '../../../src/store/slices/settingsSlice';

describe('settingsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        settings: settingsSlice.reducer
      }
    });
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
          language: 'en'
        },
        loading: false,
        error: null,
        lastSaved: null
      });
    });
  });

  describe('setSettings', () => {
    it('should set settings correctly', () => {
      const newSettings = {
        delayThreshold: 5,
        notificationTemplate: 'custom',
        emailNotifications: false,
        smsNotifications: true,
        autoResolveDays: 14,
        enableAnalytics: false,
        theme: 'dark',
        language: 'es'
      };
      
      store.dispatch(setSettings(newSettings));
      
      const state = store.getState().settings;
      expect(state.data).toEqual(newSettings);
    });

    it('should handle partial settings update', () => {
      const partialSettings = {
        delayThreshold: 3,
        emailNotifications: false
      };
      
      store.dispatch(setSettings(partialSettings));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(3);
      expect(state.data.emailNotifications).toBe(false);
      expect(state.data.notificationTemplate).toBe('default'); // Should remain unchanged
    });
  });

  describe('updateSetting', () => {
    it('should update single setting', () => {
      store.dispatch(updateSetting({ key: 'delayThreshold', value: 7 }));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(7);
    });

    it('should update boolean setting', () => {
      store.dispatch(updateSetting({ key: 'emailNotifications', value: false }));
      
      const state = store.getState().settings;
      expect(state.data.emailNotifications).toBe(false);
    });

    it('should update string setting', () => {
      store.dispatch(updateSetting({ key: 'theme', value: 'dark' }));
      
      const state = store.getState().settings;
      expect(state.data.theme).toBe('dark');
    });

    it('should handle invalid setting key gracefully', () => {
      const initialState = store.getState().settings;
      
      store.dispatch(updateSetting({ key: 'invalidKey' as any, value: 'test' }));
      
      const state = store.getState().settings;
      expect(state).toEqual(initialState); // Should remain unchanged
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      // First set an error
      store.dispatch({ type: 'settings/saveSettings/rejected', payload: 'Test error' });
      
      let state = store.getState().settings;
      expect(state.error).toBe('Test error');
      
      // Then clear it
      store.dispatch(clearError());
      
      state = store.getState().settings;
      expect(state.error).toBeNull();
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', () => {
      // First modify settings
      store.dispatch(setSettings({
        delayThreshold: 10,
        notificationTemplate: 'custom',
        emailNotifications: false,
        smsNotifications: true,
        autoResolveDays: 30,
        enableAnalytics: false,
        theme: 'dark',
        language: 'fr'
      }));
      
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
        language: 'en'
      });
    });
  });

  describe('fetchSettings', () => {
    it('should handle pending state', () => {
      store.dispatch({ type: 'settings/fetchSettings/pending' });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const mockSettings = {
        delayThreshold: 3,
        notificationTemplate: 'premium',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 10,
        enableAnalytics: true,
        theme: 'dark',
        language: 'en'
      };
      
      store.dispatch({ 
        type: 'settings/fetchSettings/fulfilled', 
        payload: mockSettings
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.data).toEqual(mockSettings);
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', () => {
      store.dispatch({ 
        type: 'settings/fetchSettings/rejected', 
        payload: 'Failed to fetch settings'
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch settings');
    });
  });

  describe('saveSettings', () => {
    it('should handle pending state', () => {
      store.dispatch({ type: 'settings/saveSettings/pending' });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const mockSettings = {
        delayThreshold: 4,
        notificationTemplate: 'custom',
        emailNotifications: false,
        smsNotifications: true,
        autoResolveDays: 14,
        enableAnalytics: false,
        theme: 'dark',
        language: 'es'
      };
      
      store.dispatch({ 
        type: 'settings/saveSettings/fulfilled', 
        payload: mockSettings
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.data).toEqual(mockSettings);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeDefined();
    });

    it('should handle rejected state', () => {
      store.dispatch({ 
        type: 'settings/saveSettings/rejected', 
        payload: 'Failed to save settings'
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to save settings');
    });
  });

  describe('testDelayDetection', () => {
    it('should handle pending state', () => {
      store.dispatch({ type: 'settings/testDelayDetection/pending' });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
    });

    it('should handle fulfilled state', () => {
      const testResult = { success: true, message: 'Delay detection test passed' };
      
      store.dispatch({ 
        type: 'settings/testDelayDetection/fulfilled', 
        payload: testResult
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', () => {
      store.dispatch({ 
        type: 'settings/testDelayDetection/rejected', 
        payload: 'Delay detection test failed'
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Delay detection test failed');
    });
  });

  describe('connectToShopify', () => {
    it('should handle pending state', () => {
      store.dispatch({ type: 'settings/connectToShopify/pending' });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
    });

    it('should handle fulfilled state', () => {
      const connectionResult = { 
        success: true, 
        shop: 'test-shop.myshopify.com',
        message: 'Successfully connected to Shopify'
      };
      
      store.dispatch({ 
        type: 'settings/connectToShopify/fulfilled', 
        payload: connectionResult
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', () => {
      store.dispatch({ 
        type: 'settings/connectToShopify/rejected', 
        payload: 'Failed to connect to Shopify'
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to connect to Shopify');
    });
  });

  describe('edge cases', () => {
    it('should handle null settings', () => {
      store.dispatch(setSettings(null as any));
      
      const state = store.getState().settings;
      expect(state.data).toBeNull();
    });

    it('should handle undefined settings', () => {
      store.dispatch(setSettings(undefined as any));
      
      const state = store.getState().settings;
      expect(state.data).toBeUndefined();
    });

    it('should handle empty settings object', () => {
      store.dispatch(setSettings({}));
      
      const state = store.getState().settings;
      expect(state.data).toEqual({});
    });

    it('should handle invalid setting values', () => {
      store.dispatch(updateSetting({ key: 'delayThreshold', value: -1 }));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(-1); // Should accept the value
    });

    it('should handle very large setting values', () => {
      store.dispatch(updateSetting({ key: 'delayThreshold', value: 999999 }));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(999999);
    });

    it('should handle special characters in string settings', () => {
      store.dispatch(updateSetting({ key: 'notificationTemplate', value: 'custom@#$%^&*()' }));
      
      const state = store.getState().settings;
      expect(state.data.notificationTemplate).toBe('custom@#$%^&*()');
    });

    it('should handle concurrent updates', () => {
      store.dispatch(updateSetting({ key: 'delayThreshold', value: 3 }));
      store.dispatch(updateSetting({ key: 'emailNotifications', value: false }));
      store.dispatch(updateSetting({ key: 'theme', value: 'dark' }));
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(3);
      expect(state.data.emailNotifications).toBe(false);
      expect(state.data.theme).toBe('dark');
    });

    it('should handle multiple error states', () => {
      store.dispatch({ type: 'settings/fetchSettings/rejected', payload: 'Fetch error' });
      store.dispatch({ type: 'settings/saveSettings/rejected', payload: 'Save error' });
      
      const state = store.getState().settings;
      expect(state.error).toBe('Save error'); // Should be the last error
    });
  });

  describe('state persistence', () => {
    it('should maintain state across multiple actions', () => {
      // Set initial settings
      store.dispatch(setSettings({
        delayThreshold: 5,
        emailNotifications: false
      }));
      
      // Update single setting
      store.dispatch(updateSetting({ key: 'theme', value: 'dark' }));
      
      // Save settings
      store.dispatch({ 
        type: 'settings/saveSettings/fulfilled', 
        payload: {
          delayThreshold: 5,
          notificationTemplate: 'default',
          emailNotifications: false,
          smsNotifications: false,
          autoResolveDays: 7,
          enableAnalytics: true,
          theme: 'dark',
          language: 'en'
        }
      });
      
      const state = store.getState().settings;
      expect(state.data.delayThreshold).toBe(5);
      expect(state.data.emailNotifications).toBe(false);
      expect(state.data.theme).toBe('dark');
      expect(state.lastSaved).toBeDefined();
    });
  });
});
