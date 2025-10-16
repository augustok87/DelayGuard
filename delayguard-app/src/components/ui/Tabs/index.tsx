import React, { useState, useCallback } from 'react';
import { TabsProps, TabItem } from '../../../types/ui';
import styles from './Tabs.module.css';

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveTab,
  activeTab,
  onTabChange,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultActiveTab || tabs[0]?.id || '',
  );

  const currentActiveTab = activeTab !== undefined ? activeTab : internalActiveTab;
  const isExplicitlyUndefined = activeTab === undefined;

  const handleTabClick = useCallback((tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  }, [onTabChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, tabId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabClick(tabId);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab && !nextTab.disabled) {
        handleTabClick(nextTab.id);
        // Focus the next tab
        const nextTabElement = document.getElementById(`tab-${nextTab.id}`);
        if (nextTabElement) {
          nextTabElement.focus();
        }
      }
    }
  }, [tabs, handleTabClick]);

  const activeTabContent = tabs.find(tab => tab.id === currentActiveTab)?.content;

  const tabsClasses = [
    styles.tabs,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={tabsClasses} {...props}>
      <div className={`tabs ${className}`} role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab) => {
          const isActive = isExplicitlyUndefined ? false : tab.id === currentActiveTab;
          const tabClasses = [
            styles.tab,
            isActive && 'active',
            tab.disabled && styles.tabDisabled,
          ].filter(Boolean).join(' ');

          return (
            <button
              key={tab.id}
              className={tabClasses}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              disabled={tab.disabled}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      <div className={styles.tabPanels}>
        {tabs.map((tab) => (
          tab.id === currentActiveTab && (
            <div
              key={tab.id}
              className={styles.tabPanel}
              role="tabpanel"
              id={`tabpanel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
            >
              {tab.content}
            </div>
          )
        ))}
      </div>
    </div>
  );
};
