/**
 * DelayGuard Settings Types
 *
 * Defines the configuration options for delay detection and notification preferences.
 * These types represent the merchant-facing settings that control how DelayGuard
 * monitors orders and sends notifications.
 */

/**
 * Delay detection rules configuration
 * Controls when and how delay alerts are triggered
 */
export interface DelayDetectionRules {
  /**
   * Pre-shipment alert: Notify when orders haven't shipped within X days
   * Set to 0 to disable pre-shipment alerts
   * @default 3
   * @min 0
   * @max 30
   */
  preShipmentAlertDays: number;

  /**
   * In-transit alerts: Automatically detect delays from carrier updates
   * When enabled, alerts are created immediately when carrier reports delay/exception
   * @default true
   */
  autoDetectTransitDelays: boolean;

  /**
   * Extended transit alert: Notify when packages are in transit longer than X days
   * Helps identify potentially lost packages
   * Set to 0 to disable extended transit alerts
   * @default 7
   * @min 0
   * @max 30
   */
  extendedTransitAlertDays: number;
}

/**
 * Notification delivery preferences
 * Controls how notifications are sent to customers and merchants
 */
export interface NotificationPreferences {
  /**
   * Enable email notifications
   * @default true
   */
  emailEnabled: boolean;

  /**
   * Email notification recipients
   * @default ['customers']
   */
  emailRecipients: Array<"merchant" | "customers">;

  /**
   * Enable SMS notifications (requires Pro plan)
   * @default false
   */
  smsEnabled: boolean;

  /**
   * SMS notification recipients
   * @default ['customers']
   */
  smsRecipients: Array<"merchant" | "customers">;
}

/**
 * Monitoring configuration
 * Controls how often DelayGuard checks for updates
 */
export interface MonitoringConfig {
  /**
   * How often to check for tracking updates (in minutes)
   * @default 120 (2 hours)
   * @min 30
   * @max 1440 (24 hours)
   */
  updateIntervalMinutes: number;

  /**
   * Last successful sync timestamp
   * ISO 8601 format
   */
  lastSyncAt?: string;

  /**
   * Number of orders currently being monitored
   */
  activeOrderCount?: number;

  /**
   * System status indicator
   */
  systemStatus?: "active" | "paused" | "error";
}

/**
 * Complete application settings
 * Combines all configuration sections
 */
export interface AppSettings {
  /**
   * Delay detection rules
   */
  detectionRules: DelayDetectionRules;

  /**
   * Notification preferences
   */
  notifications: NotificationPreferences;

  /**
   * Monitoring configuration
   */
  monitoring: MonitoringConfig;

  /**
   * Shopify shop domain (read-only)
   */
  shopDomain?: string;

  /**
   * Settings last updated timestamp
   * ISO 8601 format
   */
  updatedAt?: string;
}

/**
 * Partial settings update payload
 * Used when merchants update specific settings sections
 */
export type SettingsUpdatePayload = Partial<{
  detectionRules: Partial<DelayDetectionRules>;
  notifications: Partial<NotificationPreferences>;
  monitoring: Partial<MonitoringConfig>;
}>;

/**
 * Default settings configuration
 * Used for new merchant accounts
 */
export const DEFAULT_SETTINGS: AppSettings = {
  detectionRules: {
    preShipmentAlertDays: 3,
    autoDetectTransitDelays: true,
    extendedTransitAlertDays: 7,
  },
  notifications: {
    emailEnabled: true,
    emailRecipients: ["customers"],
    smsEnabled: false,
    smsRecipients: ["customers"],
  },
  monitoring: {
    updateIntervalMinutes: 120, // 2 hours
    systemStatus: "active",
  },
};

/**
 * Validates delay detection rules
 * Ensures all values are within acceptable ranges
 */
export function validateDetectionRules(rules: Partial<DelayDetectionRules>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (rules.preShipmentAlertDays !== undefined) {
    if (rules.preShipmentAlertDays < 0) {
      errors.push("Pre-shipment alert days cannot be negative");
    }
    if (rules.preShipmentAlertDays > 30) {
      errors.push("Pre-shipment alert days cannot exceed 30");
    }
  }

  if (rules.extendedTransitAlertDays !== undefined) {
    if (rules.extendedTransitAlertDays < 0) {
      errors.push("Extended transit alert days cannot be negative");
    }
    if (rules.extendedTransitAlertDays > 30) {
      errors.push("Extended transit alert days cannot exceed 30");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates monitoring configuration
 * Ensures update interval is within acceptable range
 */
export function validateMonitoringConfig(config: Partial<MonitoringConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.updateIntervalMinutes !== undefined) {
    if (config.updateIntervalMinutes < 30) {
      errors.push("Update interval cannot be less than 30 minutes");
    }
    if (config.updateIntervalMinutes > 1440) {
      errors.push("Update interval cannot exceed 24 hours (1440 minutes)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates complete settings object
 * Performs comprehensive validation across all sections
 */
export function validateSettings(settings: Partial<AppSettings>): {
  valid: boolean;
  errors: string[];
} {
  const allErrors: string[] = [];

  if (settings.detectionRules) {
    const detectionValidation = validateDetectionRules(settings.detectionRules);
    allErrors.push(...detectionValidation.errors);
  }

  if (settings.monitoring) {
    const monitoringValidation = validateMonitoringConfig(settings.monitoring);
    allErrors.push(...monitoringValidation.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Merges partial settings with defaults
 * Creates a complete AppSettings object from partial updates
 */
export function mergeWithDefaults(partial: Partial<AppSettings>): AppSettings {
  return {
    detectionRules: {
      ...DEFAULT_SETTINGS.detectionRules,
      ...partial.detectionRules,
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...partial.notifications,
    },
    monitoring: {
      ...DEFAULT_SETTINGS.monitoring,
      ...partial.monitoring,
    },
    shopDomain: partial.shopDomain,
    updatedAt: new Date().toISOString(),
  };
}
