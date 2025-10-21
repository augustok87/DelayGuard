import React from 'react';
import { Card } from '../../ui/Card';
import { StatsData } from '../../../types';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  stats: StatsData;
}

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <Card
      title="Performance Metrics"
      subtitle="Real-time insights into your delay management"
    >
      <div className={styles.content}>
        <div className={styles.metricsGrid}>
          <div className={styles.metric}>
            <div className={styles.metricValue} style={{ color: '#10b981' }}>
              {stats.customerSatisfaction}
            </div>
            <div className={styles.metricLabel}>Customer Satisfaction</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue} style={{ color: '#2563eb' }}>
              {stats.avgResolutionTime}
            </div>
            <div className={styles.metricLabel}>Avg Resolution Time</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
              {stats.totalAlerts}
            </div>
            <div className={styles.metricLabel}>Total Alerts</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue} style={{ color: '#ef4444' }}>
              {stats.activeAlerts}
            </div>
            <div className={styles.metricLabel}>Active Alerts</div>
          </div>
        </div>
        
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Resolved Alerts:</span>
            <span className={styles.summaryValue}>{stats.resolvedAlerts}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Support Ticket Reduction:</span>
            <span className={styles.summaryValue}>{stats.supportTicketReduction}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

StatsCard.displayName = 'StatsCard';
