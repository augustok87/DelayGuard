import React from 'react';
// import { Card } from '../../ui/Card'; // Available for future use
// import { Button } from '../../ui/Button'; // Available for future use
import { SettingsCard } from './SettingsCard';
import { AppSettings } from '../../../types';

interface DashboardTabProps {
  shop: string | null;
  settings: AppSettings;
  loading: boolean;
  onSaveSettings: () => void;
  onTestDelayDetection: () => void;
  onConnectShopify: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export function DashboardTab({
  shop,
  settings,
  loading,
  onSaveSettings,
  onTestDelayDetection,
  onConnectShopify,
  onSettingsChange,
}: DashboardTabProps) {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <SettingsCard
        shop={shop}
        settings={settings}
        loading={loading}
        onSave={onSaveSettings}
        onTest={onTestDelayDetection}
        onConnect={onConnectShopify}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}

DashboardTab.displayName = 'DashboardTab';
