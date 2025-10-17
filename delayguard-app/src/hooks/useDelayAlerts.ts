import { useCallback } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { fetchAlerts, updateAlert, deleteAlert } from '../store/slices/alertsSlice';
import { DelayAlert } from '../types';

export const useDelayAlerts = () => {
  const [state, actions] = useAsyncResource<DelayAlert[]>(
    () => fetchAlerts(),
    {
      cacheKey: 'delay-alerts',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 3,
      backgroundRefresh: true,
      backgroundRefreshInterval: 30 * 1000, // 30 seconds
    }
  );

  const { data: alerts = [], loading, error } = state;
  const { refetch: refreshAlerts, mutate: setAlerts } = actions;

  // Alert-specific filtering and sorting
  const getActiveAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'active');
  }, [alerts]);

  const getResolvedAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'resolved');
  }, [alerts]);

  const getDismissedAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'dismissed');
  }, [alerts]);

  const getHighPriorityAlerts = useCallback(() => {
    return alerts.filter(alert => alert.priority === 'high');
  }, [alerts]);

  const getMediumPriorityAlerts = useCallback(() => {
    return alerts.filter(alert => alert.priority === 'medium');
  }, [alerts]);

  const getLowPriorityAlerts = useCallback(() => {
    return alerts.filter(alert => alert.priority === 'low');
  }, [alerts]);

  const getAlertsByDelayDays = useCallback((minDays: number, maxDays?: number) => {
    return alerts.filter(alert => {
      if (maxDays) {
        return alert.delayDays >= minDays && alert.delayDays <= maxDays;
      }
      return alert.delayDays >= minDays;
    });
  }, [alerts]);

  // Search alerts by specific fields
  const searchAlertsByOrderNumber = useCallback((orderNumber: string) => {
    return alerts.filter(alert => 
      alert.orderId.toLowerCase().includes(orderNumber.toLowerCase())
    );
  }, [alerts]);

  const searchAlertsByCustomerName = useCallback((customerName: string) => {
    return alerts.filter(alert => 
      alert.customerName.toLowerCase().includes(customerName.toLowerCase())
    );
  }, [alerts]);

  // Sort alerts by specific fields
  const sortAlertsByDate = useCallback((direction: 'asc' | 'desc' = 'desc') => {
    return [...alerts].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [alerts]);

  const sortAlertsByPriority = useCallback((direction: 'asc' | 'desc' = 'desc') => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...alerts].sort((a, b) => {
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      return direction === 'asc' ? priorityA - priorityB : priorityB - priorityA;
    });
  }, [alerts]);

  // Statistics
  const getAlertStats = useCallback(() => {
    const total = alerts.length;
    const active = getActiveAlerts().length;
    const resolved = getResolvedAlerts().length;
    const dismissed = getDismissedAlerts().length;
    
    const avgResolutionTime = resolved > 0 
      ? alerts
          .filter(alert => alert.status === 'resolved' && alert.resolvedAt)
          .reduce((acc, alert) => {
            const created = new Date(alert.createdAt);
            const resolved = new Date(alert.resolvedAt!);
            const diffDays = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return acc + diffDays;
          }, 0) / resolved
      : 0;

    return {
      total,
      active,
      resolved,
      dismissed,
      avgResolutionTime: avgResolutionTime.toFixed(1),
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
    };
  }, [alerts, getActiveAlerts, getResolvedAlerts, getDismissedAlerts]);

  // CRUD operations
  const createNewAlert = useCallback((alert: Omit<DelayAlert, 'id' | 'createdAt'>) => {
    const newAlert: DelayAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAlerts([...alerts, newAlert]);
  }, [alerts, setAlerts]);

  const updateExistingAlert = useCallback((id: string, updates: Partial<DelayAlert>) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, ...updates } : alert
    ));
  }, [alerts, setAlerts]);

  const deleteExistingAlert = useCallback((id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  }, [alerts, setAlerts]);

  return {
    alerts,
    loading,
    error,
    createNewAlert,
    updateExistingAlert,
    deleteExistingAlert,
    refreshAlerts,
    getActiveAlerts,
    getResolvedAlerts,
    getDismissedAlerts,
    getHighPriorityAlerts,
    getMediumPriorityAlerts,
    getLowPriorityAlerts,
    getAlertsByDelayDays,
    searchAlertsByOrderNumber,
    searchAlertsByCustomerName,
    sortAlertsByDate,
    sortAlertsByPriority,
    getAlertStats,
  };
};