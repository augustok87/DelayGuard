import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openModal, closeModal } from '../store/slices/uiSlice';
import { DelayAlert, Order, AppSettings } from '../types';

export const useModals = () => {
  const dispatch = useAppDispatch();
  const modals = useAppSelector(state => state.ui.modals);

  const openSettingsModal = useCallback((data?: AppSettings) => {
    dispatch(openModal({ key: 'settings', data }));
  }, [dispatch]);

  const openAlertDetailsModal = useCallback((alertData: DelayAlert) => {
    dispatch(openModal({ key: 'alertDetails', data: alertData }));
  }, [dispatch]);

  const openOrderTrackingModal = useCallback((orderData: Order) => {
    dispatch(openModal({ key: 'orderTracking', data: orderData }));
  }, [dispatch]);

  const closeCurrentModal = useCallback((key: string) => {
    dispatch(closeModal(key));
  }, [dispatch]);

  const isModalOpen = (key: string) => modals[key]?.isOpen || false;
  const getModalData = (key: string) => modals[key]?.data;

  return {
    // State
    isModalOpen,
    getModalData,
    
    // Actions
    openSettingsModal,
    openAlertDetailsModal,
    openOrderTrackingModal,
    closeModal: closeCurrentModal,
  };
};
