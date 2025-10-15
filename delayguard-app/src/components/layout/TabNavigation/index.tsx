import React from 'react';
import styles from './TabNavigation.module.css';

interface TabNavigationProps {
  selectedTab: number;
  onTabChange: (tabIndex: number) => void;
  loading?: boolean;
}

const tabs = [
  { id: 0, label: 'Dashboard', icon: '📊' },
  { id: 1, label: 'Delay Alerts', icon: '🚨' },
  { id: 2, label: 'Orders', icon: '📦' },
];

export function TabNavigation({ selectedTab, onTabChange, loading = false }: TabNavigationProps) {
  return (
    <nav className={styles.navigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${selectedTab === tab.id ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tab.id)}
          disabled={loading}
          aria-selected={selectedTab === tab.id}
          role="tab"
        >
          <span className={styles.tabIcon}>{tab.icon}</span>
          <span className={styles.tabLabel}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
