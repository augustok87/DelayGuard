import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSettings, updateSettings, resetSettings } from '../store/slices/settingsSlice';
import { AppSettings } from '../types';

export const useSettings = () => {
  const dispatch = useAppDispatch();
  const { data: settings, loading, error } = useAppSelector(state => state.settings);

  // Load settings on mount
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Settings actions
  const updateAppSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      dispatch(updateSettings(newSettings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  const resetToDefaults = useCallback(async () => {
    try {
      dispatch(resetSettings());
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  // Individual setting updates
  const updateDelayThreshold = useCallback(async (threshold: number) => {
    return updateAppSettings({ delayThreshold: threshold });
  }, [updateAppSettings]);

  const updateNotificationTemplate = useCallback(async (template: string) => {
    return updateAppSettings({ notificationTemplate: template });
  }, [updateAppSettings]);

  const toggleEmailNotifications = useCallback(async () => {
    return updateAppSettings({ emailNotifications: !settings.emailNotifications });
  }, [updateAppSettings, settings.emailNotifications]);

  const toggleSmsNotifications = useCallback(async () => {
    return updateAppSettings({ smsNotifications: !settings.smsNotifications });
  }, [updateAppSettings, settings.smsNotifications]);

  const updateTheme = useCallback(async (theme: 'light' | 'dark') => {
    return updateAppSettings({ theme });
  }, [updateAppSettings]);

  const updateLanguage = useCallback(async (language: string) => {
    return updateAppSettings({ language });
  }, [updateAppSettings]);

  const updateAutoResolveDays = useCallback(async (days: number) => {
    return updateAppSettings({ autoResolveDays: days });
  }, [updateAppSettings]);

  const toggleAnalytics = useCallback(async () => {
    return updateAppSettings({ enableAnalytics: !settings.enableAnalytics });
  }, [updateAppSettings, settings.enableAnalytics]);

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
      errors
    };
  }, []);

  // Settings presets
  const applyPreset = useCallback(async (preset: 'conservative' | 'balanced' | 'aggressive') => {
    const presets: Record<string, Partial<AppSettings>> = {
      conservative: {
        delayThreshold: 5,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: false,
        autoResolveDays: 14
      },
      balanced: {
        delayThreshold: 3,
        notificationTemplate: 'default',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 7
      },
      aggressive: {
        delayThreshold: 1,
        notificationTemplate: 'minimal',
        emailNotifications: true,
        smsNotifications: true,
        autoResolveDays: 3
      }
    };

    return updateAppSettings(presets[preset]);
  }, [updateAppSettings]);

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

  const importSettings = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text) as AppSettings;
      const validation = validateSettings(importedSettings);
      
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      return updateAppSettings(importedSettings);
    } catch (err) {
      return { success: false, error: 'Invalid settings file' };
    }
  }, [updateAppSettings, validateSettings]);

  return {
    // Data
    settings,
    loading,
    error,
    
    // Actions
    updateSettings: updateAppSettings,
    resetSettings: resetToDefaults,
    refreshSettings: () => dispatch(fetchSettings()),
    
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
    importSettings
  };
};
