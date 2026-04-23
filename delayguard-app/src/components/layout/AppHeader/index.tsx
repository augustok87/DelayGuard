import React from 'react';
import { Shield, Check } from 'lucide-react';
import { StatsData } from '../../../types';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  stats: StatsData;
  loading?: boolean;
  shop?: string | null;
}

/**
 * AppHeader Component - v1.35 Anchour-Inspired Redesign
 *
 * Design inspiration: Lighthouse Credit Union, Payground (Anchour Portfolio)
 * - Deep navy gradient background (trust)
 * - Gold accent for active alerts (vigilance)
 * - Lucide icons replacing emojis (cross-platform consistency)
 * - Updated tagline (outcome-focused messaging)
 */
export function AppHeader({ stats, loading = false, shop }: AppHeaderProps) {
  // Truncate shop domain to just the store name (remove .myshopify.com)
  const displayShop = shop ? shop.replace('.myshopify.com', '') : null;

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.icon}>
          {/* v1.35: Replaced emoji with Lucide Shield icon */}
          <Shield size={40} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div>
          <h1 className={styles.title}>DelayGuard</h1>
          {/* v1.35: Updated tagline - Anchour-style outcome-focused messaging */}
          <p className={styles.subtitle}>Proactive Shipping Intelligence</p>
        </div>
      </div>

      {displayShop && (
        <div className={styles.connectionStatus} aria-label="Shopify connection status">
          <span className={styles.checkmark}>
            {/* v1.35: Replaced text checkmark with Lucide Check icon */}
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          </span>
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
        {/* v1.35: Changed from statBlue to statGold (brand accent - vigilance) */}
        <div className={`${styles.stat} ${styles.statGold}`}>
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
