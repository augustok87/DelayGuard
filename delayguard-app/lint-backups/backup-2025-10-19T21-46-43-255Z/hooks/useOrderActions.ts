import { useCallback } from 'react';
import { useOrders } from './useOrders';
import { useToasts } from './useToasts';

export const useOrderActions = () => {
  const { updateOrder, deleteOrder } = useOrders();
  const { showSuccessToast, showErrorToast, showInfoToast } = useToasts();

  const trackOrder = useCallback(async(_orderId: string) => {
    try {
      // In a real app, this would open tracking in a new window or modal
      showInfoToast('Opening tracking information...');
      
      // Simulate tracking action
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccessToast('Tracking information opened!');
      return { success: true };
    } catch (error) {
      showErrorToast('Failed to open tracking information');
      return { success: false, error: 'Failed to open tracking information' };
    }
  }, [showInfoToast, showSuccessToast, showErrorToast]);

  const viewOrderDetails = useCallback(async(_orderId: string) => {
    try {
      // In a real app, this would open order details in a modal or new page
      showInfoToast('Loading order details...');
      
      // Simulate loading order details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showSuccessToast('Order details loaded!');
      return { success: true };
    } catch (error) {
      showErrorToast('Failed to load order details');
      return { success: false, error: 'Failed to load order details' };
    }
  }, [showInfoToast, showSuccessToast, showErrorToast]);

  const updateOrderStatus = useCallback(async(orderId: string, status: string) => {
    try {
      const result = await updateOrder(orderId, { status });

      if (result.success) {
        showSuccessToast(`Order status updated to ${status}!`);
      } else {
        showErrorToast(result.error || 'Failed to update order status');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [updateOrder, showSuccessToast, showErrorToast]);

  const addTrackingNumber = useCallback(async(orderId: string, trackingNumber: string, carrierCode?: string) => {
    try {
      const result = await updateOrder(orderId, { 
        trackingNumber, 
        carrierCode: carrierCode || 'Unknown', 
      });

      if (result.success) {
        showSuccessToast('Tracking number added successfully!');
      } else {
        showErrorToast(result.error || 'Failed to add tracking number');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [updateOrder, showSuccessToast, showErrorToast]);

  const deleteOrderPermanently = useCallback(async(orderId: string) => {
    try {
      const result = await deleteOrder(orderId);

      if (result.success) {
        showSuccessToast('Order deleted successfully!');
      } else {
        showErrorToast(result.error || 'Failed to delete order');
      }

      return result;
    } catch (error) {
      showErrorToast('An unexpected error occurred');
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [deleteOrder, showSuccessToast, showErrorToast]);

  const bulkUpdateOrderStatus = useCallback(async(orderIds: string[], status: string) => {
    const results = await Promise.allSettled(
      orderIds.map(id => updateOrderStatus(id, status)),
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success,
    ).length;

    const failed = results.length - successful;

    if (successful > 0) {
      showSuccessToast(`${successful} order(s) updated to ${status}!`);
    }

    if (failed > 0) {
      showErrorToast(`${failed} order(s) failed to update`);
    }

    return { successful, failed };
  }, [updateOrderStatus, showSuccessToast, showErrorToast]);

  const exportOrders = useCallback(async(_orderIds?: string[]) => {
    try {
      showInfoToast('Preparing order export...');
      
      // In a real app, this would generate and download a CSV/Excel file
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccessToast('Order export completed!');
      return { success: true };
    } catch (error) {
      showErrorToast('Failed to export orders');
      return { success: false, error: 'Failed to export orders' };
    }
  }, [showInfoToast, showSuccessToast, showErrorToast]);

  return {
    trackOrder,
    viewOrderDetails,
    updateOrderStatus,
    addTrackingNumber,
    deleteOrder: deleteOrderPermanently,
    bulkUpdateOrderStatus,
    exportOrders,
  };
};
