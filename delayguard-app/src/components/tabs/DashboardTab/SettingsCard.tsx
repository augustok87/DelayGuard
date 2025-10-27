/**
 * SettingsCard Component (Enhanced UX - Priority 1)
 *
 * Improved settings interface with:
 * - Clearer delay threshold explanation
 * - Better organized sections
 * - Removed fake "Notification Template" dropdown
 * - System status visibility
 *
 * Maintains backward compatibility with existing AppSettings interface
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { AppSettings } from '../../../types';
import styles from './SettingsCard.module.css';

interface SettingsCardProps {
  shop: string | null;
  settings: AppSettings;
  loading: boolean;
  onSave: () => void;
  onTest: () => void;
  onConnect: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsCard({
  shop,
  settings,
  loading,
  onSave,
  onTest,
  onConnect,
  onSettingsChange,
}: SettingsCardProps) {
  const handleDelayThresholdChange = (value: number) => {
    onSettingsChange({ ...settings, delayThreshold: value });
  };

  const handleEmailToggle = () => {
    onSettingsChange({ ...settings, emailNotifications: !settings.emailNotifications });
  };

  const handleSmsToggle = () => {
    onSettingsChange({ ...settings, smsNotifications: !settings.smsNotifications });
  };

  return (
    <Card
      title="App Settings"
      subtitle="Configure your delay detection and notification preferences"
    >
      <div className={styles.content}>
        {/* System Status Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>System Status</h3>

          {/* Shopify Connection Status */}
          {shop ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <span className={styles.alertIcon}>✓</span>
              <div className={styles.alertContent}>
                <strong>Connected to Shopify</strong>
                <p className={styles.alertText}>Shop: {shop}</p>
              </div>
            </div>
          ) : (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}>⚠</span>
              <div className={styles.alertContent}>
                <strong>Not Connected</strong>
                <p className={styles.alertText}>Connect your Shopify store to start monitoring orders</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onConnect}
                  disabled={loading}
                >
                  Connect to Shopify
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delay Detection Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Delay Detection</h3>

          <div className={styles.setting}>
            <label htmlFor="delay-threshold" className={styles.settingLabel}>
              Alert threshold (days)
              <span className={styles.helpText}>
                Create alerts when orders haven&apos;t shipped within this many days after placement
              </span>
            </label>
            <div className={styles.inputGroup}>
              <input
                id="delay-threshold"
                type="number"
                className={styles.input}
                value={settings.delayThreshold}
                onChange={(e) => handleDelayThresholdChange(parseInt(e.target.value) || 0)}
                min="0"
                max="30"
                disabled={loading}
              />
              <span className={styles.inputSuffix}>days</span>
            </div>
          </div>

          <div className={styles.infoBox}>
            <span className={styles.infoIcon}>ℹ️</span>
            <div className={styles.infoContent}>
              <strong>How it works:</strong>
              <p>DelayGuard monitors your orders continuously. When an order hasn&apos;t shipped within {settings.delayThreshold} days, an alert is automatically created and customers are notified based on your notification settings below.</p>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Notification Preferences</h3>

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

          {!settings.emailNotifications && !settings.smsNotifications && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}>⚠</span>
              <div className={styles.alertContent}>
                <strong>No notifications enabled</strong>
                <p className={styles.alertText}>Customers won&apos;t be notified about delays. Enable at least one notification method.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            variant="secondary"
            onClick={onTest}
            disabled={loading || !shop}
          >
            Send Test Alert
          </Button>
        </div>
      </div>
    </Card>
  );
}

SettingsCard.displayName = 'SettingsCard';
