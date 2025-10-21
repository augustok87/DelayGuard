import React from 'react';
import { StatsData } from '../../../types';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  stats: StatsData;
  loading?: boolean;
}

export function AppHeader({ stats, loading = false }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.icon}>🛡️</div>
        <div>
          <h1 className={styles.title}>DelayGuard</h1>
          <p className={styles.subtitle}>Proactive Shipping Delay Notifications</p>
        </div>
      </div>
      
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.totalAlerts}
          </div>
          <div className={styles.statLabel}>Total Alerts</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.activeAlerts}
          </div>
          <div className={styles.statLabel}>Active</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.resolvedAlerts}
          </div>
          <div className={styles.statLabel}>Resolved</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.supportTicketReduction}
          </div>
          <div className={styles.statLabel}>Ticket Reduction</div>
        </div>
      </div>
    </header>
  );
}

AppHeader.displayName = 'AppHeader';
