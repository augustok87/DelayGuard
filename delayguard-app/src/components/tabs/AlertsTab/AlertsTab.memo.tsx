import React, { memo, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { AlertCard } from './AlertCard';
import { DelayAlert } from '../../../types';
import styles from './AlertsTab.module.css';

interface AlertsTabProps {
  alerts: DelayAlert[];
  loading: boolean;
  onAlertAction: (alertId: string, action: 'resolve' | 'dismiss') => void;
}

const AlertsTabComponent: React.FC<AlertsTabProps> = ({ 
  alerts, 
  loading, 
  onAlertAction 
}) => {
  // Memoize filtered alerts to prevent recalculation
  const { activeAlerts, resolvedAlerts, dismissedAlerts } = useMemo(() => {
    return {
      activeAlerts: alerts.filter(alert => alert.status === 'active'),
      resolvedAlerts: alerts.filter(alert => alert.status === 'resolved'),
      dismissedAlerts: alerts.filter(alert => alert.status === 'dismissed')
    };
  }, [alerts]);

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

  if (alerts.length === 0) {
    return (
      <Card title="Delay Alerts" subtitle="Monitor and manage shipping delay notifications">
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h3>No delay alerts found</h3>
          <p>Alerts will appear here when delays are detected.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card 
          title={`Active Alerts (${activeAlerts.length})`}
          subtitle="Requires immediate attention"
        >
          <div className={styles.alertsList}>
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={onAlertAction}
                variant="active"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Card 
          title={`Resolved Alerts (${resolvedAlerts.length})`}
          subtitle="Successfully resolved delays"
        >
          <div className={styles.alertsList}>
            {resolvedAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={onAlertAction}
                variant="resolved"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Dismissed Alerts */}
      {dismissedAlerts.length > 0 && (
        <Card 
          title={`Dismissed Alerts (${dismissedAlerts.length})`}
          subtitle="Manually dismissed alerts"
        >
          <div className={styles.alertsList}>
            {dismissedAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={onAlertAction}
                variant="dismissed"
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Memoized version with custom comparison
export const AlertsTab = memo(AlertsTabComponent, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.alerts.length === nextProps.alerts.length &&
    // Deep comparison for alerts array
    JSON.stringify(prevProps.alerts) === JSON.stringify(nextProps.alerts) &&
    // Function reference should be stable (useCallback in parent)
    prevProps.onAlertAction === nextProps.onAlertAction
  );
});

AlertsTab.displayName = 'AlertsTab';
