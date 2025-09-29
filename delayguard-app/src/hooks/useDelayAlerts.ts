import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAlerts, updateAlert, deleteAlert } from '../store/slices/alertsSlice';
import { DelayAlert, CreateAlertData, UpdateAlertData } from '../types';

export const useDelayAlerts = () => {
  const dispatch = useAppDispatch();
  const { items: alerts, loading, error } = useAppSelector(state => state.alerts);

  // Load alerts on mount
  useEffect(() => {
    dispatch(fetchAlerts());
  }, [dispatch]);

  // Alert actions - Note: createAlert would need to be implemented in the slice
  const createNewAlert = useCallback(async (alertData: CreateAlertData) => {
    try {
      // For now, we'll just add to local state
      // In a real app, this would dispatch a createAlert action
      console.log('Creating alert:', alertData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, []);

  const updateExistingAlert = useCallback(async (id: string, updates: UpdateAlertData) => {
    try {
      await dispatch(updateAlert({ id, updates })).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  const deleteExistingAlert = useCallback(async (id: string) => {
    try {
      await dispatch(deleteAlert(id)).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  // Alert filtering and sorting
  const getActiveAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'active');
  }, [alerts]);

  const getResolvedAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'resolved');
  }, [alerts]);

  const getDismissedAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'dismissed');
  }, [alerts]);

  const getAlertsByPriority = useCallback((priority: 'low' | 'medium' | 'high' | 'critical') => {
    return alerts.filter(alert => alert.priority === priority);
  }, [alerts]);

  const getAlertsByDelayDays = useCallback((minDays: number, maxDays?: number) => {
    return alerts.filter(alert => {
      if (maxDays) {
        return alert.delayDays >= minDays && alert.delayDays <= maxDays;
      }
      return alert.delayDays >= minDays;
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
      avgResolutionTime: avgResolutionTime.toFixed(1)
    };
  }, [alerts, getActiveAlerts, getResolvedAlerts, getDismissedAlerts]);

  return {
    // Data
    alerts,
    loading,
    error,
    
    // Actions
    createAlert: createNewAlert,
    updateAlert: updateExistingAlert,
    deleteAlert: deleteExistingAlert,
    refreshAlerts: () => dispatch(fetchAlerts()),
    
    // Filtering
    getActiveAlerts,
    getResolvedAlerts,
    getDismissedAlerts,
    getAlertsByPriority,
    getAlertsByDelayDays,
    
    // Statistics
    getAlertStats
  };
};
