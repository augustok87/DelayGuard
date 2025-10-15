import { useCallback } from 'react';
import { useDelayAlerts } from './useDelayAlerts';
import { useToasts } from './useToasts';

export const useAlertActions = () => {
  const { updateAlert, deleteAlert } = useDelayAlerts();
  const { showSuccessToast, showErrorToast, showDeleteSuccessToast, showDeleteErrorToast } = useToasts();

  const resolveAlert = useCallback(async(alertId: string) => {
    try {
      const result = await updateAlert(alertId, {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
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

  const dismissAlert = useCallback(async(alertId: string) => {
    try {
      const result = await updateAlert(alertId, {
        status: 'dismissed',
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

  const deleteAlertPermanently = useCallback(async(alertId: string) => {
    try {
      const result = await deleteAlert(alertId);

      if (result.success) {
        showDeleteSuccessToast('Alert deleted permanently!');
      } else {
        showDeleteErrorToast('Cannot delete active alert');
      }

      return result;
    } catch (error) {
      showDeleteErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [deleteAlert, showDeleteSuccessToast, showDeleteErrorToast, showErrorToast]);

  const bulkResolveAlerts = useCallback(async(alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(async(id) => {
        try {
          const result = await updateAlert(id, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
          });
          return result;
        } catch (error) {
          return { success: false, error: 'An unexpected error occurred' };
        }
      }),
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success,
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} alerts resolved successfully!`);
    } else if (results.length === 0) {
      showSuccessToast('0 alerts resolved successfully!');
    }

    if (failed > 0) {
      showErrorToast(`${failed} alerts failed to resolve`);
    }

    return { 
      success: successful > 0 || alertIds.length === 0, 
      resolvedCount: successful, 
      totalCount: alertIds.length, 
    };
  }, [updateAlert, showSuccessToast, showErrorToast]);

  const bulkDismissAlerts = useCallback(async(alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(async(id) => {
        try {
          const result = await updateAlert(id, {
            status: 'dismissed',
          });
          return result;
        } catch (error) {
          return { success: false, error: 'An unexpected error occurred' };
        }
      }),
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success,
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} alerts dismissed successfully!`);
    }

    if (failed > 0) {
      showErrorToast(`${failed} alerts failed to dismiss`);
    }

    return { 
      success: successful > 0 || alertIds.length === 0, 
      dismissedCount: successful, 
      totalCount: alertIds.length, 
    };
  }, [updateAlert, showSuccessToast, showErrorToast]);

  const bulkDeleteAlerts = useCallback(async(alertIds: string[]) => {
    const results = await Promise.allSettled(
      alertIds.map(async(id) => {
        try {
          const result = await deleteAlert(id);
          return result;
        } catch (error) {
          return { success: false, error: 'An unexpected error occurred' };
        }
      }),
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success,
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showDeleteSuccessToast(`${successful} alerts deleted successfully!`);
    }

    if (failed > 0) {
      showDeleteErrorToast(`${failed} alerts failed to delete`);
    }

    return { 
      success: successful > 0 || alertIds.length === 0, 
      deletedCount: successful, 
      totalCount: alertIds.length, 
    };
  }, [deleteAlert, showDeleteSuccessToast, showDeleteErrorToast]);

  return {
    resolveAlert,
    dismissAlert,
    deleteAlert: deleteAlertPermanently,
    bulkResolveAlerts,
    bulkDismissAlerts,
    bulkDeleteAlerts,
  };
};
