import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { ToastContextType, Toast } from '../../../types/ui';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { showToast, hideToast } from '../../../store/slices/uiSlice';
import { ToastContainer } from './ToastContainer';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
useToast.displayName = 'useToast';

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(state => state.ui.toasts.items);

  const showToastHandler = useCallback((message: string, type: Toast['type'] = 'info') => {
    dispatch(showToast({ message, type }));
  }, [dispatch]);

  const hideToastHandler = useCallback((id: string) => {
    dispatch(hideToast(id));
  }, [dispatch]);

  // Auto-hide toasts after their duration
  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration && toast.duration > 0) {
        const timer = setTimeout(() => {
          hideToastHandler(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [toasts, hideToastHandler]);

  const contextValue: ToastContextType = {
    showToast: showToastHandler,
    hideToast: hideToastHandler,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToastHandler} />
    </ToastContext.Provider>
  );
};
