import { configureStore } from '@reduxjs/toolkit';
import uiSlice, {
  setSelectedTab,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  hideToast,
  clearToasts,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setSidebarWidth,
} from '../../../src/store/slices/uiSlice';
import { UIState } from '../../../src/types/store';

// Mock Date.now to ensure consistent toast IDs
const mockDateNow = jest.spyOn(Date, 'now');
beforeEach(() => {
  mockDateNow.mockReturnValue(1234567890);
});

afterEach(() => {
  mockDateNow.mockRestore();
});

describe('uiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ui: uiSlice,
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().ui;
      expect(state).toEqual({
        selectedTab: 0,
        modals: {},
        toasts: {
          items: [],
        },
        theme: {
          mode: 'light',
          primaryColor: '#2563eb',
          fontSize: 'md',
        },
        sidebar: {
          isOpen: false,
          width: 280,
        },
      });
    });
  });

  describe('Tab Management', () => {
    it('should set selected tab', () => {
      store.dispatch(setSelectedTab(2));
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(2);
    });

    it('should handle negative tab index', () => {
      store.dispatch(setSelectedTab(-1));
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(-1);
    });

    it('should handle large tab index', () => {
      store.dispatch(setSelectedTab(999));
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(999);
    });
  });

  describe('Modal Management', () => {
    it('should open modal with data', () => {
      const modalData = { title: 'Test Modal', content: 'Test Content' };
      store.dispatch(openModal({ key: 'testModal', data: modalData }));
      
      const state = store.getState().ui;
      expect(state.modals.testModal).toEqual({
        isOpen: true,
        data: modalData,
      });
    });

    it('should open modal without data', () => {
      store.dispatch(openModal({ key: 'simpleModal' }));
      
      const state = store.getState().ui;
      expect(state.modals.simpleModal).toEqual({
        isOpen: true,
        data: undefined,
      });
    });

    it('should close specific modal', () => {
      // First open a modal
      store.dispatch(openModal({ key: 'testModal', data: { test: 'data' } }));
      
      // Then close it
      store.dispatch(closeModal('testModal'));
      
      const state = store.getState().ui;
      expect(state.modals.testModal).toEqual({
        isOpen: false,
        data: undefined,
      });
    });

    it('should handle closing non-existent modal', () => {
      store.dispatch(closeModal('nonExistentModal'));
      
      const state = store.getState().ui;
      expect(state.modals.nonExistentModal).toBeUndefined();
    });

    it('should close all modals', () => {
      // Open multiple modals
      store.dispatch(openModal({ key: 'modal1', data: { test: 'data1' } }));
      store.dispatch(openModal({ key: 'modal2', data: { test: 'data2' } }));
      store.dispatch(openModal({ key: 'modal3' }));
      
      // Close all
      store.dispatch(closeAllModals());
      
      const state = store.getState().ui;
      expect(state.modals.modal1.isOpen).toBe(false);
      expect(state.modals.modal1.data).toBeUndefined();
      expect(state.modals.modal2.isOpen).toBe(false);
      expect(state.modals.modal2.data).toBeUndefined();
      expect(state.modals.modal3.isOpen).toBe(false);
      expect(state.modals.modal3.data).toBeUndefined();
    });

    it('should handle multiple modals with same key', () => {
      store.dispatch(openModal({ key: 'duplicateModal', data: { first: 'data' } }));
      store.dispatch(openModal({ key: 'duplicateModal', data: { second: 'data' } }));
      
      const state = store.getState().ui;
      expect(state.modals.duplicateModal.data).toEqual({ second: 'data' });
    });
  });

  describe('Toast Management', () => {
    it('should show toast with default values', () => {
      store.dispatch(showToast({ message: 'Test message' }));
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(1);
      expect(state.toasts.items[0]).toEqual({
        id: '1234567890',
        message: 'Test message',
        type: 'info',
        duration: 5000,
      });
    });

    it('should show toast with custom type and duration', () => {
      store.dispatch(showToast({ 
        message: 'Success message', 
        type: 'success', 
        duration: 3000 
      }));
      
      const state = store.getState().ui;
      expect(state.toasts.items[0]).toEqual({
        id: '1234567890',
        message: 'Success message',
        type: 'success',
        duration: 3000,
      });
    });

    it('should show multiple toasts', () => {
      store.dispatch(showToast({ message: 'First toast' }));
      store.dispatch(showToast({ message: 'Second toast', type: 'error' }));
      store.dispatch(showToast({ message: 'Third toast', type: 'warning' }));
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(3);
      expect(state.toasts.items[0].message).toBe('First toast');
      expect(state.toasts.items[1].message).toBe('Second toast');
      expect(state.toasts.items[1].type).toBe('error');
      expect(state.toasts.items[2].message).toBe('Third toast');
      expect(state.toasts.items[2].type).toBe('warning');
    });

    it('should hide specific toast', () => {
      store.dispatch(showToast({ message: 'First toast' }));
      store.dispatch(showToast({ message: 'Second toast' }));
      
      const state = store.getState().ui;
      const firstToastId = state.toasts.items[0].id;
      
      store.dispatch(hideToast(firstToastId));
      
      const newState = store.getState().ui;
      expect(newState.toasts.items).toHaveLength(1);
      expect(newState.toasts.items[0].message).toBe('Second toast');
    });

    it('should handle hiding non-existent toast', () => {
      store.dispatch(showToast({ message: 'Test toast' }));
      store.dispatch(hideToast('non-existent-id'));
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(1);
    });

    it('should clear all toasts', () => {
      store.dispatch(showToast({ message: 'First toast' }));
      store.dispatch(showToast({ message: 'Second toast' }));
      store.dispatch(showToast({ message: 'Third toast' }));
      
      store.dispatch(clearToasts());
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(0);
    });

    it('should handle all toast types', () => {
      const toastTypes = ['success', 'error', 'warning', 'info'] as const;
      
      toastTypes.forEach(type => {
        store.dispatch(showToast({ message: `${type} message`, type }));
      });
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(4);
      
      toastTypes.forEach((type, index) => {
        expect(state.toasts.items[index].type).toBe(type);
        expect(state.toasts.items[index].message).toBe(`${type} message`);
      });
    });
  });

  describe('Theme Management', () => {
    it('should set theme mode', () => {
      store.dispatch(setTheme({ mode: 'dark' }));
      
      const state = store.getState().ui;
      expect(state.theme.mode).toBe('dark');
      expect(state.theme.primaryColor).toBe('#2563eb'); // Should remain unchanged
      expect(state.theme.fontSize).toBe('md'); // Should remain unchanged
    });

    it('should set primary color', () => {
      store.dispatch(setTheme({ primaryColor: '#ff0000' }));
      
      const state = store.getState().ui;
      expect(state.theme.primaryColor).toBe('#ff0000');
      expect(state.theme.mode).toBe('light'); // Should remain unchanged
      expect(state.theme.fontSize).toBe('md'); // Should remain unchanged
    });

    it('should set font size', () => {
      store.dispatch(setTheme({ fontSize: 'lg' }));
      
      const state = store.getState().ui;
      expect(state.theme.fontSize).toBe('lg');
      expect(state.theme.mode).toBe('light'); // Should remain unchanged
      expect(state.theme.primaryColor).toBe('#2563eb'); // Should remain unchanged
    });

    it('should set multiple theme properties', () => {
      store.dispatch(setTheme({ 
        mode: 'dark', 
        primaryColor: '#00ff00', 
        fontSize: 'sm' 
      }));
      
      const state = store.getState().ui;
      expect(state.theme).toEqual({
        mode: 'dark',
        primaryColor: '#00ff00',
        fontSize: 'sm',
      });
    });

    it('should handle partial theme updates', () => {
      // First set some properties
      store.dispatch(setTheme({ mode: 'dark', primaryColor: '#ff0000' }));
      
      // Then update only one property
      store.dispatch(setTheme({ fontSize: 'xl' }));
      
      const state = store.getState().ui;
      expect(state.theme).toEqual({
        mode: 'dark',
        primaryColor: '#ff0000',
        fontSize: 'xl',
      });
    });
  });

  describe('Sidebar Management', () => {
    it('should toggle sidebar', () => {
      const initialState = store.getState().ui;
      expect(initialState.sidebar.isOpen).toBe(false);
      
      store.dispatch(toggleSidebar());
      let state = store.getState().ui;
      expect(state.sidebar.isOpen).toBe(true);
      
      store.dispatch(toggleSidebar());
      state = store.getState().ui;
      expect(state.sidebar.isOpen).toBe(false);
    });

    it('should set sidebar open state', () => {
      store.dispatch(setSidebarOpen(true));
      let state = store.getState().ui;
      expect(state.sidebar.isOpen).toBe(true);
      
      store.dispatch(setSidebarOpen(false));
      state = store.getState().ui;
      expect(state.sidebar.isOpen).toBe(false);
    });

    it('should set sidebar width', () => {
      store.dispatch(setSidebarWidth(320));
      let state = store.getState().ui;
      expect(state.sidebar.width).toBe(320);
      expect(state.sidebar.isOpen).toBe(false); // Should remain unchanged
      
      store.dispatch(setSidebarWidth(200));
      state = store.getState().ui;
      expect(state.sidebar.width).toBe(200);
    });

    it('should handle edge case widths', () => {
      store.dispatch(setSidebarWidth(0));
      let state = store.getState().ui;
      expect(state.sidebar.width).toBe(0);
      
      store.dispatch(setSidebarWidth(-100));
      state = store.getState().ui;
      expect(state.sidebar.width).toBe(-100);
      
      store.dispatch(setSidebarWidth(9999));
      state = store.getState().ui;
      expect(state.sidebar.width).toBe(9999);
    });
  });

  describe('Complex State Interactions', () => {
    it('should handle multiple state changes', () => {
      // Open modal
      store.dispatch(openModal({ key: 'testModal', data: { test: 'data' } }));
      
      // Show toast
      store.dispatch(showToast({ message: 'Test toast', type: 'success' }));
      
      // Change theme
      store.dispatch(setTheme({ mode: 'dark' }));
      
      // Toggle sidebar
      store.dispatch(toggleSidebar());
      
      // Change tab
      store.dispatch(setSelectedTab(3));
      
      const state = store.getState().ui;
      expect(state.modals.testModal.isOpen).toBe(true);
      expect(state.toasts.items).toHaveLength(1);
      expect(state.theme.mode).toBe('dark');
      expect(state.sidebar.isOpen).toBe(true);
      expect(state.selectedTab).toBe(3);
    });

    it('should handle rapid state changes', () => {
      // Rapidly dispatch multiple actions
      for (let i = 0; i < 10; i++) {
        store.dispatch(showToast({ message: `Toast ${i}` }));
        store.dispatch(setSelectedTab(i));
      }
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(10);
      expect(state.selectedTab).toBe(9);
    });

    it('should maintain state consistency after complex operations', () => {
      // Open multiple modals
      store.dispatch(openModal({ key: 'modal1' }));
      store.dispatch(openModal({ key: 'modal2', data: { test: 'data' } }));
      
      // Show multiple toasts
      store.dispatch(showToast({ message: 'Toast 1' }));
      store.dispatch(showToast({ message: 'Toast 2', type: 'error' }));
      
      // Close one modal
      store.dispatch(closeModal('modal1'));
      
      // Hide one toast
      const state = store.getState().ui;
      const firstToastId = state.toasts.items[0].id;
      store.dispatch(hideToast(firstToastId));
      
      // Change theme and sidebar
      store.dispatch(setTheme({ mode: 'dark', primaryColor: '#ff0000' }));
      store.dispatch(setSidebarWidth(300));
      
      const finalState = store.getState().ui;
      expect(finalState.modals.modal1.isOpen).toBe(false);
      expect(finalState.modals.modal2.isOpen).toBe(true);
      expect(finalState.toasts.items).toHaveLength(1);
      expect(finalState.theme.mode).toBe('dark');
      expect(finalState.sidebar.width).toBe(300);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string modal key', () => {
      store.dispatch(openModal({ key: '' }));
      const state = store.getState().ui;
      expect(state.modals['']).toEqual({
        isOpen: true,
        data: undefined,
      });
    });

    it('should handle empty toast message', () => {
      store.dispatch(showToast({ message: '' }));
      const state = store.getState().ui;
      expect(state.toasts.items[0].message).toBe('');
    });

    it('should handle very long toast message', () => {
      const longMessage = 'a'.repeat(1000);
      store.dispatch(showToast({ message: longMessage }));
      const state = store.getState().ui;
      expect(state.toasts.items[0].message).toBe(longMessage);
    });

    it('should handle invalid theme values', () => {
      store.dispatch(setTheme({ 
        mode: 'invalid' as any, 
        primaryColor: 'invalid-color',
        fontSize: 'invalid-size' as any
      }));
      
      const state = store.getState().ui;
      expect(state.theme.mode).toBe('invalid');
      expect(state.theme.primaryColor).toBe('invalid-color');
      expect(state.theme.fontSize).toBe('invalid-size');
    });
  });
});
