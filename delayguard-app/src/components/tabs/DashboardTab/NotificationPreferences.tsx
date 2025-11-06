import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { AppSettings } from '../../../types';
import styles from './SettingsCard.module.css'; // Reuse same styles

interface NotificationPreferencesProps {
  settings: AppSettings;
  loading?: boolean;
  onSettingsChange: (settings: AppSettings) => void;
  onSave?: () => void;
  onTest?: () => void;
}

/**
 * NotificationPreferences Component
 *
 * Manages notification settings (email and SMS).
 * Moved from SettingsCard in v1.20 to separate tab.
 */
export function NotificationPreferences({
  settings,
  loading = false,
  onSettingsChange,
  onSave: _onSave,
  onTest,
}: NotificationPreferencesProps) {
  // Handle notification changes
  const handleEmailToggle = () => {
    onSettingsChange({ ...settings, emailNotifications: !settings.emailNotifications });
  };

  const handleSmsToggle = () => {
    onSettingsChange({ ...settings, smsNotifications: !settings.smsNotifications });
  };

  return (
    <Card
      title="Notification Preferences"
      subtitle="Configure how and when you receive delay notifications"
    >
      <div className={styles.cardBody}>
        {/* Email Notifications */}
        <div className={styles.setting}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={handleEmailToggle}
              disabled={loading}
              aria-label="Enable email notifications"
            />
            <span>
              <strong>Email Notifications</strong>
              <span className={styles.helpText}>Send email alerts to customers when delays are detected</span>
            </span>
          </label>
        </div>

        {/* SMS Notifications */}
        <div className={styles.setting}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={handleSmsToggle}
              disabled={loading}
              aria-label="Enable SMS notifications"
            />
            <span>
              <strong>SMS Notifications</strong>
              <span className={styles.helpText}>Send text message alerts to customers (requires phone numbers)</span>
            </span>
          </label>
        </div>

        {/* Warning when no notifications are enabled */}
        {!settings.emailNotifications && !settings.smsNotifications && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <span className={styles.alertIcon}>⚠</span>
            <div className={styles.alertContent}>
              <strong>No notifications enabled</strong>
              <p className={styles.alertText}>Customers won&apos;t be notified about delays. Enable at least one notification method.</p>
            </div>
          </div>
        )}

        {/* Test Alert Button */}
        {onTest && (
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={onTest}
              disabled={loading || (!settings.emailNotifications && !settings.smsNotifications)}
            >
              Send Test Alert
            </Button>
            <p className={styles.helpText} style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
              Test your notification system by sending a sample delay alert to your email/SMS. This helps you verify that notifications are working correctly before going live.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

NotificationPreferences.displayName = 'NotificationPreferences';
