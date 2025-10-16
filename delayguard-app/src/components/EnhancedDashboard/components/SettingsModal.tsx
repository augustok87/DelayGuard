// SettingsModal component for managing app settings
import React from 'react';
import { Modal, Button, Text } from '../../ui';
import { AppSettings } from '../../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: () => void;
  onTest: () => void;
  onConnect: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onTest,
  onConnect,
  onSettingsChange,
}) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleInputChange = (field: keyof AppSettings, value: string | number | boolean) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const validateSettings = (settingsToValidate: AppSettings): boolean => {
    const newErrors: Record<string, string> = {};

    if (settingsToValidate.delayThreshold <= 0) {
      newErrors.delayThreshold = 'Delay threshold must be positive';
    }

    if (settingsToValidate.autoResolveDays && settingsToValidate.autoResolveDays <= 0) {
      newErrors.autoResolveDays = 'Auto-resolve days must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings(settings)) {
      onSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      primaryAction={{
        content: 'Save Settings',
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '10px' }}>
            Delay Detection
          </Text>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="delayThreshold">
              <Text variant="bodyMd" as="span">Delay Threshold (days):</Text>
            </label>
            <input
              id="delayThreshold"
              type="number"
              value={settings.delayThreshold}
              onChange={(e) => handleInputChange('delayThreshold', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: errors.delayThreshold ? '1px solid #ff0000' : '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            {errors.delayThreshold && (
              <Text variant="bodySm" as="span" style={{ color: '#ff0000', marginTop: '4px' }}>
                {errors.delayThreshold}
              </Text>
            )}
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="autoResolve">
              <Text variant="bodyMd" as="span">Auto-resolve after (days):</Text>
            </label>
            <input
              id="autoResolve"
              type="number"
              value={settings.autoResolveDays}
              onChange={(e) => handleInputChange('autoResolveDays', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '10px' }}>
            Notifications
          </Text>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
              />
              <Text variant="bodyMd" as="span">Enable email notifications</Text>
            </label>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
              />
              <Text variant="bodyMd" as="span">Enable SMS notifications</Text>
            </label>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="notificationTemplate">
              <Text variant="bodyMd" as="span">Notification Template:</Text>
            </label>
            <textarea
              id="notificationTemplate"
              value={settings.notificationTemplate}
              onChange={(e) => handleInputChange('notificationTemplate', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '10px' }}>
            Analytics
          </Text>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={(e) => handleInputChange('enableAnalytics', e.target.checked)}
              />
              <Text variant="bodyMd" as="span">Enable analytics tracking</Text>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <Button onClick={onTest} variant="secondary">
            Test Delay Detection
          </Button>
          <Button onClick={onConnect} variant="secondary">
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
};
