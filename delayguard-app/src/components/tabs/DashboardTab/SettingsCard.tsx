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

  const handleTemplateChange = (template: string) => {
    onSettingsChange({ ...settings, notificationTemplate: template });
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
      subtitle="Configure your delay detection preferences"
    >
      <div className={styles.content}>
        {/* Shopify Connection Status */}
        {shop ? (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <div className={styles.alertIcon}>✅</div>
            <div>
              <strong>Connected to Shopify:</strong> {shop}
            </div>
          </div>
        ) : (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <div className={styles.alertIcon}>⚠️</div>
            <div>
              <strong>Not connected to Shopify.</strong> Click below to authenticate.
            </div>
          </div>
        )}
        
        {/* Delay Threshold Setting */}
        <div className={styles.setting}>
          <label htmlFor="delay-threshold" className={styles.label}>
            Delay Threshold (days)
          </label>
          <input
            id="delay-threshold"
            type="number"
            className={styles.input}
            value={settings.delayThreshold}
            onChange={(e) => handleDelayThresholdChange(parseInt(e.target.value) || 0)}
            min="1"
            max="30"
            disabled={loading}
          />
          <p className={styles.helpText}>
            Minimum delay in days before sending notifications
          </p>
        </div>
        
        {/* Notification Template Setting */}
        <div className={styles.setting}>
          <label htmlFor="notification-template" className={styles.label}>
            Notification Template
          </label>
          <select
            id="notification-template"
            className={styles.select}
            value={settings.notificationTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={loading}
          >
            <option value="default">Default Template</option>
            <option value="custom">Custom Template</option>
            <option value="minimal">Minimal Template</option>
          </select>
        </div>

        {/* Notification Preferences */}
        <div className={styles.setting}>
          <label htmlFor="notification-preferences" className={styles.label}>Notification Preferences</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={handleEmailToggle}
                disabled={loading}
              />
              <span>Email Notifications</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={handleSmsToggle}
                disabled={loading}
              />
              <span>SMS Notifications</span>
            </label>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={loading}
          >
            Save Settings
          </Button>
          <Button
            variant="secondary"
            onClick={onTest}
            disabled={loading}
          >
            Test Delay Detection
          </Button>
          {!shop && (
            <Button
              variant="secondary"
              onClick={onConnect}
              disabled={loading}
            >
              Connect to Shopify
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

SettingsCard.displayName = 'SettingsCard';
