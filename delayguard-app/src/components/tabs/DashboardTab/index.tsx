import React from 'react';
// import { Card } from '../../ui/Card'; // Available for future use
// import { Button } from '../../ui/Button'; // Available for future use
import { SettingsCard } from './SettingsCard';
import { StatsCard } from './StatsCard';
import { AppSettings, StatsData } from '../../../types';

interface DashboardTabProps {
  shop: string | null;
  settings: AppSettings;
  stats: StatsData;
  loading: boolean;
  onSaveSettings: () => void;
  onTestDelayDetection: () => void;
  onConnectShopify: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export function DashboardTab({
  shop,
  settings,
  stats,
  loading,
  onSaveSettings,
  onTestDelayDetection,
  onConnectShopify,
  onSettingsChange,
}: DashboardTabProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <SettingsCard
        shop={shop}
        settings={settings}
        loading={loading}
        onSave={onSaveSettings}
        onTest={onTestDelayDetection}
        onConnect={onConnectShopify}
        onSettingsChange={onSettingsChange}
      />
      <StatsCard stats={stats} />
    </div>
  );
}

DashboardTab.displayName = 'DashboardTab';
