import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ModalState, ToastState, ThemeState, SidebarState } from '../../types/store';
import { Toast } from '../../types/ui';

// Initial state
const initialState: UIState = {
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
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedTab: (state, action: PayloadAction<number>) => {
      state.selectedTab = action.payload;
    },
    openModal: (state, action: PayloadAction<{ key: string; data?: any }>) => {
      state.modals[action.payload.key] = {
        isOpen: true,
        data: action.payload.data,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
        state.modals[action.payload].data = undefined;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = {
          isOpen: false,
          data: undefined,
        };
      });
    },
    showToast: (state, action: PayloadAction<{ message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }>) => {
      const { message, type = 'info', duration = 5000 } = action.payload;
      const id = Date.now().toString();
      const toast = {
        id,
        message,
        type,
        duration,
      };
      state.toasts.items.push(toast);
    },
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts.items = state.toasts.items.filter((toast: any) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts.items = [];
    },
    setTheme: (state, action: PayloadAction<Partial<ThemeState>>) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isOpen = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebar.width = action.payload;
    },
  },
});

export const {
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
} = uiSlice.actions;

export default uiSlice.reducer;
