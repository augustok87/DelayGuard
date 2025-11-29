import React, { useState } from 'react';
import { CheckCircle2, FileCheck, Trash2, BarChart3 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { AlertCard } from './AlertCard';
import { DelayAlert } from '../../../types';
import styles from './AlertsTab.module.css';

interface AlertsTabProps {
  alerts: DelayAlert[];
  loading: boolean;
  onAlertAction: (alertId: string, action: 'resolve' | 'dismiss' | 'reopen') => void;
}

type AlertStatus = 'active' | 'resolved' | 'dismissed';

export function AlertsTab({ alerts, loading, onAlertAction }: AlertsTabProps) {
  // Phase B: Alert filtering state
  const [activeTab, setActiveTab] = useState<AlertStatus>('active');

  // Calculate counts for all statuses
  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');
  const dismissedAlerts = alerts.filter(alert => alert.status === 'dismissed');

  if (loading) {
    return (
      <Card title="Delay Alerts" subtitle="Loading alerts...">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading delay alerts...</p>
        </div>
      </Card>
    );
  }

  // Phase B: Get filtered alerts based on active tab
  const getFilteredAlerts = (): DelayAlert[] => {
    switch (activeTab) {
      case 'active':
        return activeAlerts;
      case 'resolved':
        return resolvedAlerts;
      case 'dismissed':
        return dismissedAlerts;
      default:
        return activeAlerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  // Phase B: Get empty state message based on active tab
  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'active':
        return {
          icon: <CheckCircle2 size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No active alerts',
          subtitle: 'Great! All delays have been resolved or dismissed.',
        };
      case 'resolved':
        return {
          icon: <FileCheck size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No resolved alerts',
          subtitle: 'Resolved alerts will appear here after you mark them as handled.',
        };
      case 'dismissed':
        return {
          icon: <Trash2 size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No dismissed alerts',
          subtitle: 'Dismissed alerts will appear here.',
        };
      default:
        return {
          icon: <BarChart3 size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No alerts found',
          subtitle: 'Alerts will appear here when delays are detected.',
        };
    }
  };

  if (alerts.length === 0) {
    return (
      <Card title="Delay Alerts" subtitle="Monitor and manage shipping delay notifications">
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <BarChart3 size={48} aria-hidden={true} strokeWidth={1.5} />
          </div>
          <h3>No delay alerts found</h3>
          <p>Alerts will appear here when delays are detected.</p>
        </div>
      </Card>
    );
  }

  const emptyState = getEmptyStateMessage();

  return (
    <div className={styles.container}>
      {/* Phase B: Segmented Control Filter */}
      <div className={styles.filterBar}>
        <SegmentedControl
          options={[
            { value: 'active', label: 'Active', badge: activeAlerts.length },
            { value: 'resolved', label: 'Resolved', badge: resolvedAlerts.length },
            { value: 'dismissed', label: 'Dismissed', badge: dismissedAlerts.length },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as AlertStatus)}
        />
        <div className={styles.filterSummary}>
          Showing {filteredAlerts.length} {activeTab} {filteredAlerts.length === 1 ? 'alert' : 'alerts'}
        </div>
      </div>

      {/* Filtered Alerts */}
      {filteredAlerts.length > 0 ? (
        <div className={styles.alertsList}>
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAction={onAlertAction}
              variant={activeTab}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>{emptyState.icon}</div>
          <h3>{emptyState.title}</h3>
          <p>{emptyState.subtitle}</p>
        </div>
      )}
    </div>
  );
}

AlertsTab.displayName = 'AlertsTab';
