import { useCallback } from 'react';
import { useDelayAlerts } from './useDelayAlerts';
import { useToasts } from './useToasts';

export const useAlertActions = () => {
  const { updateAlert, deleteAlert } = useDelayAlerts();
  const { showSuccessToast, showErrorToast, showDeleteSuccessToast, showDeleteErrorToast } = useToasts();

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const result = await updateAlert(alertId, {
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      });

      if (result.success) {
        showSuccessToast('Alert resolved successfully!');
      } else {
        showErrorToast(result.error || 'Failed to resolve alert');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [updateAlert, showSuccessToast, showErrorToast]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const result = await updateAlert(alertId, {
        status: 'dismissed'
      });

      if (result.success) {
        showSuccessToast('Alert dismissed successfully!');
      } else {
        showErrorToast(result.error || 'Failed to dismiss alert');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [updateAlert, showSuccessToast, showErrorToast]);

  const deleteAlertPermanently = useCallback(async (alertId: string) => {
    try {
      const result = await deleteAlert(alertId);

      if (result.success) {
        showDeleteSuccessToast('Alert');
      } else {
        showDeleteErrorToast('Alert');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [deleteAlert, showDeleteSuccessToast, showDeleteErrorToast, showErrorToast]);

  const bulkResolveAlerts = useCallback(async (alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(id => resolveAlert(id))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} alert(s) resolved successfully!`);
    }

    if (failed > 0) {
      showErrorToast(`${failed} alert(s) failed to resolve`);
    }

    return { successful, failed };
  }, [resolveAlert, showSuccessToast, showErrorToast]);

  const bulkDismissAlerts = useCallback(async (alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(id => dismissAlert(id))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} alert(s) dismissed successfully!`);
    }

    if (failed > 0) {
      showErrorToast(`${failed} alert(s) failed to dismiss`);
    }

    return { successful, failed };
  }, [dismissAlert, showSuccessToast, showErrorToast]);

  const bulkDeleteAlerts = useCallback(async (alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(id => deleteAlertPermanently(id))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} alert(s) deleted successfully!`);
    }

    if (failed > 0) {
      showErrorToast(`${failed} alert(s) failed to delete`);
    }

    return { successful, failed };
  }, [deleteAlertPermanently, showSuccessToast, showErrorToast]);

  return {
    resolveAlert,
    dismissAlert,
    deleteAlert: deleteAlertPermanently,
    bulkResolveAlerts,
    bulkDismissAlerts,
    bulkDeleteAlerts
  };
};
