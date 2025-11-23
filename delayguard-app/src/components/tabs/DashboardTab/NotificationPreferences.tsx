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

        {/* Merchant Contact Information */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Merchant Contact Information</h3>
          <p className={styles.sectionSubtitle}>
            Receive warehouse delay notifications at these contact details
          </p>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="merchant-email" className={styles.formLabel}>
                Merchant Email
              </label>
              <input
                id="merchant-email"
                type="email"
                className={styles.input}
                value={settings.merchantEmail || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantEmail: e.target.value })}
                placeholder="merchant@yourstore.com"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Warehouse delay notifications will be sent here instead of to customers
              </p>
            </div>

            <div className={styles.formField}>
              <label htmlFor="merchant-phone" className={styles.formLabel}>
                Merchant Phone
              </label>
              <input
                id="merchant-phone"
                type="tel"
                className={styles.input}
                value={settings.merchantPhone || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantPhone: e.target.value })}
                placeholder="+1-555-1234"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Optional: Receive SMS notifications for warehouse delays
              </p>
            </div>

            <div className={styles.formField}>
              <label htmlFor="merchant-name" className={styles.formLabel}>
                Merchant Name
              </label>
              <input
                id="merchant-name"
                type="text"
                className={styles.input}
                value={settings.merchantName || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantName: e.target.value })}
                placeholder="Shop Owner"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Your name for personalized notifications
              </p>
            </div>
          </div>
        </div>

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
