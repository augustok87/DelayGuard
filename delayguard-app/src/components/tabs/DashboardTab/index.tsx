import React, { useState } from 'react';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SettingsCard } from './SettingsCard';
import { NotificationPreferences } from './NotificationPreferences';
import { AppSettings } from '../../../types';
import styles from './DashboardTab.module.css';

interface DashboardTabProps {
  shop: string | null;
  settings: AppSettings;
  loading: boolean;
  onSaveSettings: () => void;
  onTestDelayDetection: () => void;
  onConnectShopify: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

type SettingsFilter = 'rules' | 'notifications';

export function DashboardTab({
  shop,
  settings,
  loading,
  onSaveSettings,
  onTestDelayDetection,
  onConnectShopify,
  onSettingsChange,
}: DashboardTabProps) {
  const [selectedFilter, setSelectedFilter] = useState<SettingsFilter>('rules');

  const filterOptions = [
    { value: 'rules' as SettingsFilter, label: 'Delay Detection Rules' },
    { value: 'notifications' as SettingsFilter, label: 'Notification Preferences' },
  ];

  const getFilterLabel = (filter: SettingsFilter): string => {
    switch (filter) {
      case 'rules':
        return 'Delay Detection Rules';
      case 'notifications':
        return 'Notification Preferences';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (selectedFilter) {
      case 'rules':
        return (
          <SettingsCard
            shop={shop}
            settings={settings}
            loading={loading}
            onSave={onSaveSettings}
            onTest={onTestDelayDetection}
            onConnect={onConnectShopify}
            onSettingsChange={onSettingsChange}
          />
        );
      case 'notifications':
        return (
          <NotificationPreferences
            settings={settings}
            loading={loading}
            onSettingsChange={onSettingsChange}
            onSave={onSaveSettings}
            onTest={onTestDelayDetection}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className={styles.filterBar}>
        <SegmentedControl
          options={filterOptions}
          value={selectedFilter}
          onChange={(value) => setSelectedFilter(value as SettingsFilter)}
        />
        <div className={styles.filterSummary}>
          Showing {getFilterLabel(selectedFilter)}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}

DashboardTab.displayName = 'DashboardTab';
