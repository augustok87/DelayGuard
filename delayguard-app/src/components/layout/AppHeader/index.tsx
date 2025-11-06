import React from 'react';
import { StatsData } from '../../../types';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  stats: StatsData;
  loading?: boolean;
  shop?: string | null;
}

export function AppHeader({ stats, loading = false, shop }: AppHeaderProps) {
  // Truncate shop domain to just the store name (remove .myshopify.com)
  const displayShop = shop ? shop.replace('.myshopify.com', '') : null;

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.icon}>🛡️</div>
        <div>
          <h1 className={styles.title}>DelayGuard</h1>
          <p className={styles.subtitle}>Proactive Shipping Delay Notifications</p>
        </div>
      </div>

      {displayShop && (
        <div className={styles.connectionStatus} aria-label="Shopify connection status">
          <span className={styles.checkmark}>✓</span>
          <span className={styles.connectionText}>Connected to {displayShop}</span>
        </div>
      )}

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.statAmber}`}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.totalAlerts}
          </div>
          <div className={styles.statLabel}>Total Alerts</div>
        </div>
        <div className={`${styles.stat} ${styles.statBlue}`}>
          <div className={styles.statValue}>
            {loading ? '...' : stats.activeAlerts}
          </div>
          <div className={styles.statLabel}>Active</div>
        </div>
        <div className={`${styles.stat} ${styles.statGreen}`}>
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
