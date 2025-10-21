import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useModals } from '../../../src/hooks/useModals';
import { Provider } from 'react-redux';
import { store } from '../../../src/store/store';
import { DelayAlert, Order, AppSettings } from '../../../src/types';

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn((selector: (state: any) => any) => selector({ 
  ui: { 
    modals: {},
    toasts: { items: [], nextId: 1 },
  }, 
}));

jest.mock('../../../src/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

jest.mock('../../../src/store/slices/uiSlice', () => ({
  openModal: jest.fn((payload) => ({ type: 'ui/openModal', payload })),
  closeModal: jest.fn((key) => ({ type: 'ui/closeModal', payload: key })),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(Provider, { store, children });
};

describe('useModals Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSettings: AppSettings = {
    delayThreshold: 2,
    notificationTemplate: 'default',
    emailNotifications: true,
    smsNotifications: false,
    theme: 'light',
  };

  const mockAlert: DelayAlert = {
    id: 'alert-1',
    orderId: 'order-123',
    customerName: 'John Doe',
    trackingNumber: '1Z999AA10123456784',
    customerEmail: 'customer@example.com',
    delayDays: 3,
    status: 'active',
    createdAt: '2024-01-01T10:00:00Z',
  };

  const mockOrder: Order = {
    id: 'order-123',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: 'processing',
    trackingNumber: '1Z999AA10123456784',
    createdAt: '2024-01-01T10:00:00Z',
  };

  describe('Modal State', () => {
    it('should check if modal is closed', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      expect(result.current.isModalOpen('settings')).toBe(false);
    });

    it('should return false for non-existent modals', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      expect(result.current.isModalOpen('nonExistent')).toBe(false);
    });

    it('should return undefined for non-existent modal data', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      expect(result.current.getModalData('nonExistent')).toBeUndefined();
    });
  });

  describe('Settings Modal', () => {
    it('should open settings modal', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.openSettingsModal();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should open settings modal with data', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.openSettingsModal(mockSettings);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should close modal', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.closeModal('settings');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Alert Details Modal', () => {
    it('should open alert details modal', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.openAlertDetailsModal(mockAlert);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Order Tracking Modal', () => {
    it('should open order tracking modal', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.openOrderTrackingModal(mockOrder);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Multiple Modals', () => {
    it('should handle opening multiple modals', () => {
      const { result } = renderHook(() => useModals(), { wrapper });
      
      act(() => {
        result.current.openSettingsModal();
        result.current.openAlertDetailsModal(mockAlert);
      });
      
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Callback Stability', () => {
    it('should maintain callback references across renders', () => {
      const { result, rerender } = renderHook(() => useModals(), { wrapper });
      
      const firstRender = {
        openSettingsModal: result.current.openSettingsModal,
        closeModal: result.current.closeModal,
      };
      
      rerender();
      
      expect(result.current.openSettingsModal).toBe(firstRender.openSettingsModal);
      expect(result.current.closeModal).toBe(firstRender.closeModal);
    });
  });
});
