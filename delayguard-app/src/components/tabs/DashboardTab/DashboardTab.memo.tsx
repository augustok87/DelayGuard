import React, { memo, useMemo } from 'react';
import { Card } from '../../ui/Card';
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

const DashboardTabComponent: React.FC<DashboardTabProps> = ({
  shop,
  settings,
  stats,
  loading,
  onSaveSettings,
  onTestDelayDetection,
  onConnectShopify,
  onSettingsChange,
}) => {
  // Memoize the grid style to prevent recalculation
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  }), []);

  return (
    <div style={gridStyle}>
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
};

// Memoized version with custom comparison
export const DashboardTab = memo(DashboardTabComponent, (prevProps, nextProps) => {
  return (
    prevProps.shop === nextProps.shop &&
    prevProps.loading === nextProps.loading &&
    // Deep comparison for settings object
    JSON.stringify(prevProps.settings) === JSON.stringify(nextProps.settings) &&
    // Deep comparison for stats object
    JSON.stringify(prevProps.stats) === JSON.stringify(nextProps.stats) &&
    // Function references should be stable (useCallback in parent)
    prevProps.onSaveSettings === nextProps.onSaveSettings &&
    prevProps.onTestDelayDetection === nextProps.onTestDelayDetection &&
    prevProps.onConnectShopify === nextProps.onConnectShopify &&
    prevProps.onSettingsChange === nextProps.onSettingsChange
  );
});

DashboardTab.displayName = 'DashboardTab';
