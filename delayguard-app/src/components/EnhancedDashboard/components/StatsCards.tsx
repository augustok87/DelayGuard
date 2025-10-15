// StatsCards component for displaying dashboard statistics
import React from 'react';
import { Card, Text } from '../../ui';
import { StatsData } from '../../../types';
import { DASHBOARD_CONFIG } from '../constants';

interface StatsCardsProps {
  stats: StatsData;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const statsData = [
    {
      title: 'Total Alerts',
      value: stats.totalAlerts,
      color: 'var(--delayguard-primary)',
    },
    {
      title: 'Active Alerts',
      value: stats.activeAlerts,
      color: 'var(--delayguard-warning)',
    },
    {
      title: 'Resolved Alerts',
      value: stats.resolvedAlerts,
      color: 'var(--delayguard-success)',
    },
    {
      title: 'Avg Resolution',
      value: stats.avgResolutionTime,
      color: 'var(--delayguard-info)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: DASHBOARD_CONFIG.GRID_COLUMNS,
        gap: DASHBOARD_CONFIG.GRID_GAP,
        marginBottom: DASHBOARD_CONFIG.MARGIN_BOTTOM,
      }}
    >
      {statsData.map((stat, index) => (
        <Card key={index} title={stat.title}>
          <div style={{ textAlign: 'center' }}>
            <Text
              variant="headingLg"
              as="div"
              style={{ color: stat.color, fontWeight: 'bold' }}
            >
              {stat.value}
            </Text>
          </div>
        </Card>
      ))}
    </div>
  );
};
