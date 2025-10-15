import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showToast, hideToast, clearToasts } from '../store/slices/uiSlice';

export const useToasts = () => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(state => state.ui.toasts.items);

  const showSuccessToast = useCallback((message: string, duration = 5000) => {
    dispatch(showToast({ message, type: 'success', duration }));
  }, [dispatch]);

  const showErrorToast = useCallback((message: string, duration = 7000) => {
    dispatch(showToast({ message, type: 'error', duration }));
  }, [dispatch]);

  const showWarningToast = useCallback((message: string, duration = 6000) => {
    dispatch(showToast({ message, type: 'warning', duration }));
  }, [dispatch]);

  const showInfoToast = useCallback((message: string, duration = 5000) => {
    dispatch(showToast({ message, type: 'info', duration }));
  }, [dispatch]);

  const hideToastById = useCallback((id: string) => {
    dispatch(hideToast(id));
  }, [dispatch]);

  const clearAllToasts = useCallback(() => {
    dispatch(clearToasts());
  }, [dispatch]);

  // Convenience methods for common scenarios
  const showSaveSuccessToast = useCallback(() => {
    showSuccessToast('Settings saved successfully!');
  }, [showSuccessToast]);

  const showSaveErrorToast = useCallback(() => {
    showErrorToast('Failed to save settings. Please try again.');
  }, [showErrorToast]);

  const showDeleteSuccessToast = useCallback((itemName: string) => {
    showSuccessToast(`${itemName} deleted successfully!`);
  }, [showSuccessToast]);

  const showDeleteErrorToast = useCallback((itemName: string) => {
    showErrorToast(`Failed to delete ${itemName}. Please try again.`);
  }, [showErrorToast]);

  const showConnectionSuccessToast = useCallback(() => {
    showSuccessToast('Successfully connected to Shopify!');
  }, [showSuccessToast]);

  const showConnectionErrorToast = useCallback(() => {
    showErrorToast('Failed to connect to Shopify. Please check your credentials.');
  }, [showErrorToast]);

  const showTestSuccessToast = useCallback(() => {
    showSuccessToast('Delay detection test completed successfully!');
  }, [showSuccessToast]);

  const showTestErrorToast = useCallback(() => {
    showErrorToast('Delay detection test failed. Please check your configuration.');
  }, [showErrorToast]);

  return {
    // State
    toasts,
    
    // Basic actions
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    hideToast: hideToastById,
    clearAllToasts,
    
    // Convenience methods
    showSaveSuccessToast,
    showSaveErrorToast,
    showDeleteSuccessToast,
    showDeleteErrorToast,
    showConnectionSuccessToast,
    showConnectionErrorToast,
    showTestSuccessToast,
    showTestErrorToast,
  };
};
