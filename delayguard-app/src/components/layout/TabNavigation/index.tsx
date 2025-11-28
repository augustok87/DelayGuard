import React from 'react';
import { Settings, AlertTriangle, Package, type LucideIcon } from 'lucide-react';
import styles from './TabNavigation.module.css';

interface TabNavigationProps {
  selectedTab: number;
  onTabChange: (tabIndex: number) => void;
  loading?: boolean;
}

interface Tab {
  id: number;
  label: string;
  icon: LucideIcon;
}

const tabs: Tab[] = [
  { id: 0, label: 'Settings', icon: Settings },
  { id: 1, label: 'Delay Alerts', icon: AlertTriangle },
  { id: 2, label: 'Orders', icon: Package },
];

export function TabNavigation({ selectedTab, onTabChange, loading = false }: TabNavigationProps) {
  return (
    <nav className={styles.navigation}>
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${selectedTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
            disabled={loading}
            aria-selected={selectedTab === tab.id}
            role="tab"
          >
            <span className={styles.tabIcon}>
              <IconComponent size={20} aria-hidden={true} strokeWidth={2} />
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

TabNavigation.displayName = 'TabNavigation';
