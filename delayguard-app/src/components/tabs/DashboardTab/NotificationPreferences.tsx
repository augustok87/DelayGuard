import React from 'react';
import { Card } from '../../ui/Card';
import { AppSettings } from '../../../types';

interface NotificationPreferencesProps {
  settings: AppSettings;
  loading?: boolean;
  onSettingsChange?: (settings: AppSettings) => void;
  onSave?: () => void;
}

/**
 * NotificationPreferences Component
 *
 * Placeholder for notification preferences settings.
 * TODO: Implement full notification preferences UI in future phase.
 */
export function NotificationPreferences({
  settings: _settings,
  loading: _loading = false,
  onSettingsChange: _onSettingsChange,
  onSave: _onSave,
}: NotificationPreferencesProps) {
  return (
    <Card
      title="Notification Preferences"
      subtitle="Configure how and when you receive delay notifications"
    >
      <div style={{ padding: '1.5rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.5' }}>
          Notification preferences will be available in a future update.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
          Coming soon:
        </p>
        <ul style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: '1.75' }}>
          <li>Email notification settings</li>
          <li>SMS notification settings</li>
          <li>Notification frequency preferences</li>
          <li>Quiet hours configuration</li>
          <li>Notification templates</li>
        </ul>
      </div>
    </Card>
  );
}

NotificationPreferences.displayName = 'NotificationPreferences';
