import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useToasts } from '../../../src/hooks/useToasts';
import { Provider } from 'react-redux';
import { store } from '../../../src/store/store';

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn((selector: (state: any) => any) => selector({ 
  ui: { 
    toasts: { items: [], nextId: 1 },
    modals: {},
  }, 
}));

jest.mock('../../../src/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

jest.mock('../../../src/store/slices/uiSlice', () => ({
  showToast: jest.fn((payload) => ({ type: 'ui/showToast', payload })),
  hideToast: jest.fn((id) => ({ type: 'ui/hideToast', payload: id })),
  clearToasts: jest.fn(() => ({ type: 'ui/clearToasts' })),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(Provider, { store, children });
};

describe('useToasts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector: (state: any) => any) => selector({ 
      ui: { 
        toasts: { items: [], nextId: 1 },
        modals: {},
      }, 
    }));
  });

  describe('Toast State', () => {
    it('should initialize with empty toasts', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe('Success Toasts', () => {
    it('should show success toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showSuccessToast('Success message');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show success toast with custom duration', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showSuccessToast('Success message', 3000);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show save success toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showSaveSuccessToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show delete success toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showDeleteSuccessToast('Alert');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show connection success toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showConnectionSuccessToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show test success toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showTestSuccessToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Error Toasts', () => {
    it('should show error toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showErrorToast('Error message');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show error toast with custom duration', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showErrorToast('Error message', 5000);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show save error toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showSaveErrorToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show delete error toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showDeleteErrorToast('Order');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show connection error toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showConnectionErrorToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show test error toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showTestErrorToast();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Warning Toasts', () => {
    it('should show warning toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showWarningToast('Warning message');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show warning toast with custom duration', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showWarningToast('Warning message', 4000);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Info Toasts', () => {
    it('should show info toast', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showInfoToast('Info message');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show info toast with custom duration', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showInfoToast('Info message', 2000);
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Toast Management', () => {
    it('should hide toast by id', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.hideToast('toast-id-1');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should clear all toasts', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.clearAllToasts();
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Callback Stability', () => {
    it('should maintain callback references across renders', () => {
      const { result, rerender } = renderHook(() => useToasts(), { wrapper });
      
      const firstRender = {
        showSuccessToast: result.current.showSuccessToast,
        hideToast: result.current.hideToast,
        clearAllToasts: result.current.clearAllToasts,
      };
      
      rerender();
      
      expect(result.current.showSuccessToast).toBe(firstRender.showSuccessToast);
      expect(result.current.hideToast).toBe(firstRender.hideToast);
      expect(result.current.clearAllToasts).toBe(firstRender.clearAllToasts);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        result.current.showSuccessToast('');
      });
      
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle rapid toast additions', () => {
      const { result } = renderHook(() => useToasts(), { wrapper });
      
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.showSuccessToast(`Toast ${i}`);
        }
      });
      
      expect(mockDispatch).toHaveBeenCalledTimes(10);
    });
  });
});
