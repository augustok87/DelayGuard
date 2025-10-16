import { useCallback } from 'react';
import { useAsyncResource, useItemFilters } from './useAsyncResource';
import { fetchAlerts, updateAlert, deleteAlert } from '../store/slices/alertsSlice';
import { DelayAlert, CreateAlertData, UpdateAlertData } from '../types';

export const useDelayAlerts = () => {
  const {
    items: alerts,
    loading,
    error,
    createItem: createNewAlert,
    updateItem: updateExistingAlert,
    deleteItem: deleteExistingAlert,
    refreshItems: refreshAlerts,
  } = useAsyncResource<DelayAlert>(
    'alert',
    fetchAlerts,
    updateAlert,
    deleteAlert,
    (state) => state.alerts,
    undefined // createAlert not implemented yet
  );

  const {
    getItemsByStatus: getAlertsByStatus,
    getItemsByPriority: getAlertsByPriority,
    searchItems: searchAlerts,
    sortItems: sortAlerts,
  } = useItemFilters<DelayAlert>(
    alerts,
    (alert) => alert.status,
    (alert) => alert.priority || 'low'
  );

  // Alert-specific filtering and sorting
  const getActiveAlerts = useCallback(() => {
    return getAlertsByStatus('active');
  }, [getAlertsByStatus]);

  const getResolvedAlerts = useCallback(() => {
    return getAlertsByStatus('resolved');
  }, [getAlertsByStatus]);

  const getDismissedAlerts = useCallback(() => {
    return getAlertsByStatus('dismissed');
  }, [getAlertsByStatus]);

  const getHighPriorityAlerts = useCallback(() => {
    return getAlertsByPriority('high');
  }, [getAlertsByPriority]);

  const getMediumPriorityAlerts = useCallback(() => {
    return getAlertsByPriority('medium');
  }, [getAlertsByPriority]);

  const getLowPriorityAlerts = useCallback(() => {
    return getAlertsByPriority('low');
  }, [getAlertsByPriority]);

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
    return searchAlerts(orderNumber, ['orderId']);
  }, [searchAlerts]);

  const searchAlertsByCustomerName = useCallback((customerName: string) => {
    return searchAlerts(customerName, ['customerName']);
  }, [searchAlerts]);

  // Sort alerts by specific fields
  const sortAlertsByDate = useCallback((direction: 'asc' | 'desc' = 'desc') => {
    return sortAlerts('createdAt', direction);
  }, [sortAlerts]);

  const sortAlertsByPriority = useCallback((direction: 'asc' | 'desc' = 'desc') => {
    return sortAlerts('priority', direction);
  }, [sortAlerts]);

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
    getAlertsByPriority,
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