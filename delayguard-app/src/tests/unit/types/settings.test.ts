/**
 * Settings Type Tests
 *
 * Test suite for settings validation, merging, and default configuration.
 * Follows TDD best practices with comprehensive coverage.
 */

import {
  AppSettings,
  DelayDetectionRules,
  NotificationPreferences,
  MonitoringConfig,
  DEFAULT_SETTINGS,
  validateDetectionRules,
  validateMonitoringConfig,
  validateSettings,
  mergeWithDefaults,
} from '../../../types/settings'; // Direct import from settings.ts

describe('Settings Types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have valid default detection rules', () => {
      expect(DEFAULT_SETTINGS.detectionRules.preShipmentAlertDays).toBe(3);
      expect(DEFAULT_SETTINGS.detectionRules.autoDetectTransitDelays).toBe(true);
      expect(DEFAULT_SETTINGS.detectionRules.extendedTransitAlertDays).toBe(7);
    });

    it('should have valid default notification preferences', () => {
      expect(DEFAULT_SETTINGS.notifications.emailEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.emailRecipients).toEqual(['customers']);
      expect(DEFAULT_SETTINGS.notifications.smsEnabled).toBe(false);
      expect(DEFAULT_SETTINGS.notifications.smsRecipients).toEqual(['customers']);
    });

    it('should have valid default monitoring config', () => {
      expect(DEFAULT_SETTINGS.monitoring.updateIntervalMinutes).toBe(120);
      expect(DEFAULT_SETTINGS.monitoring.systemStatus).toBe('active');
    });
  });

  describe('validateDetectionRules', () => {
    it('should validate valid detection rules', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: 5,
        autoDetectTransitDelays: true,
        extendedTransitAlertDays: 10,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow 0 days for pre-shipment alerts (disabled)', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: 0,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative pre-shipment alert days', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: -1,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pre-shipment alert days cannot be negative');
    });

    it('should reject pre-shipment alert days > 30', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: 31,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pre-shipment alert days cannot exceed 30');
    });

    it('should allow 0 days for extended transit alerts (disabled)', () => {
      const rules: Partial<DelayDetectionRules> = {
        extendedTransitAlertDays: 0,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative extended transit alert days', () => {
      const rules: Partial<DelayDetectionRules> = {
        extendedTransitAlertDays: -5,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Extended transit alert days cannot be negative');
    });

    it('should reject extended transit alert days > 30', () => {
      const rules: Partial<DelayDetectionRules> = {
        extendedTransitAlertDays: 35,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Extended transit alert days cannot exceed 30');
    });

    it('should accumulate multiple validation errors', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: -1,
        extendedTransitAlertDays: 40,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Pre-shipment alert days cannot be negative');
      expect(result.errors).toContain('Extended transit alert days cannot exceed 30');
    });

    it('should allow partial rules (only some fields)', () => {
      const rules: Partial<DelayDetectionRules> = {
        preShipmentAlertDays: 5,
      };

      const result = validateDetectionRules(rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateMonitoringConfig', () => {
    it('should validate valid monitoring config', () => {
      const config: Partial<MonitoringConfig> = {
        updateIntervalMinutes: 120,
      };

      const result = validateMonitoringConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow minimum interval of 30 minutes', () => {
      const config: Partial<MonitoringConfig> = {
        updateIntervalMinutes: 30,
      };

      const result = validateMonitoringConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow maximum interval of 1440 minutes (24 hours)', () => {
      const config: Partial<MonitoringConfig> = {
        updateIntervalMinutes: 1440,
      };

      const result = validateMonitoringConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject interval < 30 minutes', () => {
      const config: Partial<MonitoringConfig> = {
        updateIntervalMinutes: 15,
      };

      const result = validateMonitoringConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Update interval cannot be less than 30 minutes');
    });

    it('should reject interval > 1440 minutes', () => {
      const config: Partial<MonitoringConfig> = {
        updateIntervalMinutes: 2000,
      };

      const result = validateMonitoringConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Update interval cannot exceed 24 hours (1440 minutes)');
    });
  });

  describe('validateSettings', () => {
    it('should validate complete valid settings', () => {
      const settings: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 3,
          autoDetectTransitDelays: true,
          extendedTransitAlertDays: 7,
        },
        monitoring: {
          updateIntervalMinutes: 120,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate settings with only detection rules', () => {
      const settings: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 5,
          autoDetectTransitDelays: true,
          extendedTransitAlertDays: 10,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate settings with only monitoring config', () => {
      const settings: Partial<AppSettings> = {
        monitoring: {
          updateIntervalMinutes: 60,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate errors from detection rules', () => {
      const settings: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: -1,
          autoDetectTransitDelays: true,
          extendedTransitAlertDays: 7,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pre-shipment alert days cannot be negative');
    });

    it('should accumulate errors from monitoring config', () => {
      const settings: Partial<AppSettings> = {
        monitoring: {
          updateIntervalMinutes: 10,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Update interval cannot be less than 30 minutes');
    });

    it('should accumulate errors from multiple sections', () => {
      const settings: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 40,
          autoDetectTransitDelays: true,
          extendedTransitAlertDays: -5,
        },
        monitoring: {
          updateIntervalMinutes: 5,
        },
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Pre-shipment alert days cannot exceed 30');
      expect(result.errors).toContain('Extended transit alert days cannot be negative');
      expect(result.errors).toContain('Update interval cannot be less than 30 minutes');
    });

    it('should allow empty settings object', () => {
      const settings: Partial<AppSettings> = {};

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge empty object with defaults', () => {
      const partial: Partial<AppSettings> = {};

      const result = mergeWithDefaults(partial);

      expect(result.detectionRules).toEqual(DEFAULT_SETTINGS.detectionRules);
      expect(result.notifications).toEqual(DEFAULT_SETTINGS.notifications);
      expect(result.monitoring.updateIntervalMinutes).toBe(120);
      expect(result.monitoring.systemStatus).toBe('active');
      expect(result.updatedAt).toBeDefined();
    });

    it('should merge partial detection rules', () => {
      const partial: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 5,
        } as DelayDetectionRules,
      };

      const result = mergeWithDefaults(partial);

      expect(result.detectionRules.preShipmentAlertDays).toBe(5);
      expect(result.detectionRules.autoDetectTransitDelays).toBe(true); // from defaults
      expect(result.detectionRules.extendedTransitAlertDays).toBe(7); // from defaults
    });

    it('should merge partial notification preferences', () => {
      const partial: Partial<AppSettings> = {
        notifications: {
          smsEnabled: true,
        } as NotificationPreferences,
      };

      const result = mergeWithDefaults(partial);

      expect(result.notifications.smsEnabled).toBe(true);
      expect(result.notifications.emailEnabled).toBe(true); // from defaults
      expect(result.notifications.emailRecipients).toEqual(['customers']); // from defaults
    });

    it('should merge partial monitoring config', () => {
      const partial: Partial<AppSettings> = {
        monitoring: {
          updateIntervalMinutes: 60,
        },
      };

      const result = mergeWithDefaults(partial);

      expect(result.monitoring.updateIntervalMinutes).toBe(60);
      expect(result.monitoring.systemStatus).toBe('active'); // from defaults
    });

    it('should include shop domain if provided', () => {
      const partial: Partial<AppSettings> = {
        shopDomain: 'my-store.myshopify.com',
      };

      const result = mergeWithDefaults(partial);

      expect(result.shopDomain).toBe('my-store.myshopify.com');
    });

    it('should set updatedAt timestamp', () => {
      const beforeMerge = new Date().toISOString();
      const partial: Partial<AppSettings> = {};

      const result = mergeWithDefaults(partial);

      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt!).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThanOrEqual(new Date(beforeMerge).getTime());
    });

    it('should merge multiple sections at once', () => {
      const partial: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 10,
          autoDetectTransitDelays: false,
        } as DelayDetectionRules,
        notifications: {
          emailEnabled: false,
          smsEnabled: true,
        } as NotificationPreferences,
        monitoring: {
          updateIntervalMinutes: 240,
        },
        shopDomain: 'test-store.myshopify.com',
      };

      const result = mergeWithDefaults(partial);

      expect(result.detectionRules.preShipmentAlertDays).toBe(10);
      expect(result.detectionRules.autoDetectTransitDelays).toBe(false);
      expect(result.detectionRules.extendedTransitAlertDays).toBe(7); // from defaults
      expect(result.notifications.emailEnabled).toBe(false);
      expect(result.notifications.smsEnabled).toBe(true);
      expect(result.monitoring.updateIntervalMinutes).toBe(240);
      expect(result.shopDomain).toBe('test-store.myshopify.com');
      expect(result.updatedAt).toBeDefined();
    });

    it('should not mutate the input object', () => {
      const partial: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 5,
        } as DelayDetectionRules,
      };

      const originalRules = { ...partial.detectionRules };

      mergeWithDefaults(partial);

      expect(partial.detectionRules).toEqual(originalRules);
    });

    it('should not mutate DEFAULT_SETTINGS', () => {
      const originalDefaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      const partial: Partial<AppSettings> = {
        detectionRules: {
          preShipmentAlertDays: 99,
        } as DelayDetectionRules,
      };

      mergeWithDefaults(partial);

      expect(DEFAULT_SETTINGS).toEqual(originalDefaults);
    });
  });
});
