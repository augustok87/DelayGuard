import settingsSlice, { 
  fetchSettings, 
  saveSettings, 
  testDelayDetection,
  updateSettings,
  resetSettings,
  clearError
} from '../../../../src/store/slices/settingsSlice';
import { configureStore } from '@reduxjs/toolkit';
import { AppSettings } from '../../../../src/types';

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
        theme: 'dark'
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
        payload: mockSettings 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.data).toEqual(mockSettings);
    });

    it('should handle fetchSettings.rejected', () => {
      const errorMessage = 'Failed to fetch settings';
      store.dispatch({ 
        type: fetchSettings.rejected.type, 
        payload: errorMessage 
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
      expect(state.loading).toBe(true);
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
        payload: mockSettings 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.data).toEqual(mockSettings);
      expect(state.lastSaved).toBe(mockDate);
    });

    it('should handle saveSettings.rejected', () => {
      const errorMessage = 'Failed to save settings';
      store.dispatch({ 
        type: saveSettings.rejected.type, 
        payload: errorMessage 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('testDelayDetection async thunk', () => {
    it('should handle testDelayDetection.pending', () => {
      store.dispatch({ type: testDelayDetection.pending.type });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle testDelayDetection.fulfilled', () => {
      store.dispatch({ 
        type: testDelayDetection.fulfilled.type, 
        payload: { success: true, message: 'Test completed' }
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
    });

    it('should handle testDelayDetection.rejected', () => {
      const errorMessage = 'Failed to test delay detection';
      store.dispatch({ 
        type: testDelayDetection.rejected.type, 
        payload: errorMessage 
      });
      
      const state = store.getState().settings;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
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
        language: 'es'
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
});