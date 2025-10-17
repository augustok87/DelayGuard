import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSettings, saveSettings, resetSettings } from '../store/slices/settingsSlice';
import { AppSettings } from '../types';

export const useSettings = () => {
  const dispatch = useAppDispatch();
  const { data: settings, loading, error } = useAppSelector(state => state.settings);

  // Load settings on mount
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Individual setting updates
  const updateDelayThreshold = useCallback(async(threshold: number) => {
    return dispatch(saveSettings({ ...settings, delayThreshold: threshold }));
  }, [dispatch, settings]);

  const updateNotificationTemplate = useCallback(async(template: string) => {
    return dispatch(saveSettings({ ...settings, notificationTemplate: template }));
  }, [dispatch, settings]);

  const toggleEmailNotifications = useCallback(async() => {
    return dispatch(saveSettings({ ...settings, emailNotifications: !settings.emailNotifications }));
  }, [dispatch, settings]);

  const toggleSmsNotifications = useCallback(async() => {
    return dispatch(saveSettings({ ...settings, smsNotifications: !settings.smsNotifications }));
  }, [dispatch, settings]);

  const updateTheme = useCallback(async(theme: 'light' | 'dark') => {
    return dispatch(saveSettings({ ...settings, theme }));
  }, [dispatch, settings]);

  const updateLanguage = useCallback(async(language: string) => {
    return dispatch(saveSettings({ ...settings, language }));
  }, [dispatch, settings]);

  const updateAutoResolveDays = useCallback(async(days: number) => {
    return dispatch(saveSettings({ ...settings, autoResolveDays: days }));
  }, [dispatch, settings]);

  const toggleAnalytics = useCallback(async() => {
    return dispatch(saveSettings({ ...settings, enableAnalytics: !settings.enableAnalytics }));
  }, [dispatch, settings]);

  // Validation
  const validateSettings = useCallback((settingsToValidate: AppSettings) => {
    const errors: string[] = [];

    if (settingsToValidate.delayThreshold < 1 || settingsToValidate.delayThreshold > 30) {
      errors.push('Delay threshold must be between 1 and 30 days');
    }

    if (!settingsToValidate.notificationTemplate) {
      errors.push('Notification template is required');
    }

    if (!settingsToValidate.emailNotifications && !settingsToValidate.smsNotifications) {
      errors.push('At least one notification method must be enabled');
    }

    if (settingsToValidate.autoResolveDays && (settingsToValidate.autoResolveDays < 1 || settingsToValidate.autoResolveDays > 90)) {
      errors.push('Auto-resolve days must be between 1 and 90');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // Settings presets
  const applyPreset = useCallback(async(preset: 'conservative' | 'balanced' | 'aggressive') => {
    const presets: Record<string, Partial<AppSettings>> = {
      conservative: {
        delayThreshold: 5,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: false,
        autoResolveDays: 14,
      },
      balanced: {
        delayThreshold: 3,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 7,
      },
      aggressive: {
        delayThreshold: 1,
        notificationTemplate: 'minimal',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 3,
      },
    };

    return dispatch(saveSettings({ ...settings, ...presets[preset] }));
  }, [dispatch, settings]);

  // Export/Import settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'delayguard-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importSettings = useCallback(async(file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text) as AppSettings;
      const validation = validateSettings(importedSettings);
      
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      return dispatch(saveSettings(importedSettings));
    } catch (err) {
      return { success: false, error: 'Invalid settings file' };
    }
  }, [dispatch, validateSettings]);

  // Bulk update
  const updateSettings = useCallback(async(newSettings: Partial<AppSettings>) => {
    return dispatch(saveSettings({ ...settings, ...newSettings }));
  }, [dispatch, settings]);

  // Reset to defaults
  const resetToDefaults = useCallback(async() => {
    return dispatch(resetSettings());
  }, [dispatch]);

  // Refresh settings
  const refreshSettings = useCallback(async() => {
    return dispatch(fetchSettings());
  }, [dispatch]);

  return {
    // Data
    settings,
    loading,
    error,
    
    // Actions
    updateSettings,
    resetSettings: resetToDefaults,
    refreshSettings,
    
    // Individual updates
    updateDelayThreshold,
    updateNotificationTemplate,
    toggleEmailNotifications,
    toggleSmsNotifications,
    updateTheme,
    updateLanguage,
    updateAutoResolveDays,
    toggleAnalytics,
    
    // Utilities
    validateSettings,
    applyPreset,
    exportSettings,
    importSettings,
  };
};