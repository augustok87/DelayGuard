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
  setSidebarWidth
} from '../../../../src/store/slices/uiSlice';
import { configureStore } from '@reduxjs/toolkit';

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      ui: uiSlice,
    },
  });
};

describe('uiSlice', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('initial state', () => {
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

  describe('tab navigation', () => {
    it('should set selected tab', () => {
      store.dispatch(setSelectedTab(2));
      
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(2);
    });

    it('should handle negative tab indices', () => {
      store.dispatch(setSelectedTab(-1));
      
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(-1);
    });

    it('should handle large tab indices', () => {
      store.dispatch(setSelectedTab(999));
      
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(999);
    });
  });

  describe('modal management', () => {
    it('should open modal with data', () => {
      const modalData = { userId: '123', name: 'John Doe' };
      store.dispatch(openModal({ key: 'userModal', data: modalData }));
      
      const state = store.getState().ui;
      expect(state.modals.userModal).toEqual({
        isOpen: true,
        data: modalData,
      });
    });

    it('should open modal without data', () => {
      store.dispatch(openModal({ key: 'confirmModal' }));
      
      const state = store.getState().ui;
      expect(state.modals.confirmModal).toEqual({
        isOpen: true,
        data: undefined,
      });
    });

    it('should close specific modal', () => {
      // First open a modal
      store.dispatch(openModal({ key: 'testModal', data: { test: true } }));
      expect(store.getState().ui.modals.testModal.isOpen).toBe(true);
      
      // Then close it
      store.dispatch(closeModal('testModal'));
      
      const state = store.getState().ui;
      expect(state.modals.testModal.isOpen).toBe(false);
      expect(state.modals.testModal.data).toBeUndefined();
    });

    it('should handle closing non-existent modal', () => {
      store.dispatch(closeModal('nonExistentModal'));
      
      const state = store.getState().ui;
      expect(state.modals.nonExistentModal).toBeUndefined();
    });

    it('should close all modals', () => {
      // Open multiple modals
      store.dispatch(openModal({ key: 'modal1', data: { test: 1 } }));
      store.dispatch(openModal({ key: 'modal2', data: { test: 2 } }));
      store.dispatch(openModal({ key: 'modal3', data: { test: 3 } }));
      
      expect(store.getState().ui.modals.modal1.isOpen).toBe(true);
      expect(store.getState().ui.modals.modal2.isOpen).toBe(true);
      expect(store.getState().ui.modals.modal3.isOpen).toBe(true);
      
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
  });

  describe('toast management', () => {
    let mockDateNow: jest.SpyInstance;

    beforeEach(() => {
      // Mock Date.now to return consistent values
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      mockDateNow.mockRestore();
    });

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

    it('should show toast with custom values', () => {
      store.dispatch(showToast({ 
        message: 'Success!', 
        type: 'success', 
        duration: 3000 
      }));
      
      const state = store.getState().ui;
      expect(state.toasts.items[0]).toEqual({
        id: '1234567890',
        message: 'Success!',
        type: 'success',
        duration: 3000,
      });
    });

    it('should show multiple toasts', () => {
      store.dispatch(showToast({ message: 'First toast' }));
      store.dispatch(showToast({ message: 'Second toast', type: 'error' }));
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(2);
      expect(state.toasts.items[0].message).toBe('First toast');
      expect(state.toasts.items[1].message).toBe('Second toast');
      expect(state.toasts.items[1].type).toBe('error');
    });

    it('should hide specific toast', () => {
      // First toast with ID 1234567890
      store.dispatch(showToast({ message: 'Toast 1' }));
      
      // Second toast with ID 1234567891
      mockDateNow.mockReturnValue(1234567891);
      store.dispatch(showToast({ message: 'Toast 2' }));
      
      expect(store.getState().ui.toasts.items).toHaveLength(2);
      
      // Hide first toast
      store.dispatch(hideToast('1234567890'));
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(1);
      expect(state.toasts.items[0].message).toBe('Toast 2');
    });

    it('should clear all toasts', () => {
      store.dispatch(showToast({ message: 'Toast 1' }));
      store.dispatch(showToast({ message: 'Toast 2' }));
      store.dispatch(showToast({ message: 'Toast 3' }));
      
      expect(store.getState().ui.toasts.items).toHaveLength(3);
      
      store.dispatch(clearToasts());
      
      const state = store.getState().ui;
      expect(state.toasts.items).toHaveLength(0);
    });
  });

  describe('theme management', () => {
    it('should update theme partially', () => {
      store.dispatch(setTheme({ mode: 'dark' }));
      
      const state = store.getState().ui;
      expect(state.theme.mode).toBe('dark');
      expect(state.theme.primaryColor).toBe('#2563eb'); // Should remain unchanged
      expect(state.theme.fontSize).toBe('md'); // Should remain unchanged
    });

    it('should update multiple theme properties', () => {
      store.dispatch(setTheme({ 
        mode: 'dark', 
        primaryColor: '#ff0000', 
        fontSize: 'lg' 
      }));
      
      const state = store.getState().ui;
      expect(state.theme).toEqual({
        mode: 'dark',
        primaryColor: '#ff0000',
        fontSize: 'lg',
      });
    });

    it('should preserve existing theme properties', () => {
      // First update one property
      store.dispatch(setTheme({ mode: 'dark' }));
      expect(store.getState().ui.theme.primaryColor).toBe('#2563eb');
      
      // Then update another property
      store.dispatch(setTheme({ primaryColor: '#00ff00' }));
      
      const state = store.getState().ui;
      expect(state.theme.mode).toBe('dark'); // Should remain from previous update
      expect(state.theme.primaryColor).toBe('#00ff00');
      expect(state.theme.fontSize).toBe('md'); // Should remain from initial state
    });
  });

  describe('sidebar management', () => {
    it('should toggle sidebar', () => {
      expect(store.getState().ui.sidebar.isOpen).toBe(false);
      
      store.dispatch(toggleSidebar());
      expect(store.getState().ui.sidebar.isOpen).toBe(true);
      
      store.dispatch(toggleSidebar());
      expect(store.getState().ui.sidebar.isOpen).toBe(false);
    });

    it('should set sidebar open state', () => {
      store.dispatch(setSidebarOpen(true));
      expect(store.getState().ui.sidebar.isOpen).toBe(true);
      
      store.dispatch(setSidebarOpen(false));
      expect(store.getState().ui.sidebar.isOpen).toBe(false);
    });

    it('should set sidebar width', () => {
      store.dispatch(setSidebarWidth(400));
      
      const state = store.getState().ui;
      expect(state.sidebar.width).toBe(400);
      expect(state.sidebar.isOpen).toBe(false); // Should remain unchanged
    });

    it('should handle negative sidebar width', () => {
      store.dispatch(setSidebarWidth(-100));
      
      const state = store.getState().ui;
      expect(state.sidebar.width).toBe(-100);
    });
  });

  describe('complex interactions', () => {
    it('should handle multiple UI state changes', () => {
      // Change tab
      store.dispatch(setSelectedTab(3));
      
      // Open modal
      store.dispatch(openModal({ key: 'settingsModal', data: { setting: 'value' } }));
      
      // Show toast
      store.dispatch(showToast({ message: 'Settings saved', type: 'success' }));
      
      // Update theme
      store.dispatch(setTheme({ mode: 'dark' }));
      
      // Toggle sidebar
      store.dispatch(toggleSidebar());
      
      const state = store.getState().ui;
      expect(state.selectedTab).toBe(3);
      expect(state.modals.settingsModal.isOpen).toBe(true);
      expect(state.modals.settingsModal.data).toEqual({ setting: 'value' });
      expect(state.toasts.items).toHaveLength(1);
      expect(state.toasts.items[0].message).toBe('Settings saved');
      expect(state.theme.mode).toBe('dark');
      expect(state.sidebar.isOpen).toBe(true);
    });
  });
});