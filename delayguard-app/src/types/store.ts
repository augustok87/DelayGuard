// Redux Store Types
import { AppSettings, DelayAlert, Order, Toast } from './index';
// import { StatsData } from './index'; // Available for future use

// Root State
export interface RootState {
  app: AppState;
  alerts: AlertsState;
  orders: OrdersState;
  settings: SettingsState;
  ui: UIState;
}

// App State
export interface AppState {
  loading: boolean;
  error: string | null;
  shop: string | null;
  initialized: boolean;
}

// Alerts State
export interface AlertsState {
  items: DelayAlert[];
  loading: boolean;
  error: string | null;
  filters: AlertFilters;
  pagination: PaginationState;
}

export interface AlertFilters {
  status?: 'active' | 'resolved' | 'dismissed';
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

// Orders State
export interface OrdersState {
  items: Order[];
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  pagination: PaginationState;
}

export interface OrderFilters {
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

// Settings State
export interface SettingsState {
  data: AppSettings;
  loading: boolean;
  error: string | null;
  lastSaved: string | null;
}

// UI State
export interface UIState {
  selectedTab: number;
  modals: ModalState;
  toasts: ToastState;
  theme: ThemeState;
  sidebar: SidebarState;
}

export interface ModalState {
  [key: string]: {
    isOpen: boolean;
    data?: any;
  };
}

export interface ToastState {
  items: Toast[];
}

export interface ThemeState {
  mode: 'light' | 'dark';
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

export interface SidebarState {
  isOpen: boolean;
  width: number;
}

// Pagination State
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Action Types
export interface BaseAction {
  type: string;
  payload?: any;
}

export interface AsyncAction extends BaseAction {
  meta?: {
    requestId: string;
    timestamp: number;
  };
}

// Thunk Types
export interface ThunkConfig {
  state: RootState;
  dispatch: AppDispatch;
  extra?: any;
  rejectValue?: string;
}

// Selector Types
export type Selector<T> = (state: RootState) => T;
export type ParametricSelector<T, P> = (state: RootState, params: P) => T;

// Hook Types
export type AppDispatch = any; // Will be properly typed in store.ts

export interface UseAppDispatch {
  (): AppDispatch;
}

export interface UseAppSelector {
  <T>(selector: Selector<T>): T;
  <T, P>(selector: ParametricSelector<T, P>, params: P): T;
}

// Store Configuration
export interface StoreConfig {
  preloadedState?: Partial<RootState>;
  middleware?: any[];
  devTools?: boolean;
}

// Persist Configuration
export interface PersistConfig {
  key: string;
  storage: any;
  whitelist?: string[];
  blacklist?: string[];
  transforms?: any[];
}

// Rehydration Types
export interface RehydrationState {
  _persist: {
    version: number;
    rehydrated: boolean;
  };
}

// Error Types
export interface StoreError {
  message: string;
  code: string;
  timestamp: number;
  action?: string;
  stack?: string;
}

// Loading States
export interface LoadingState {
  [key: string]: boolean;
}

// Cache Types
export interface CacheState {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

// Analytics Types
export interface AnalyticsState {
  events: AnalyticsEvent[];
  metrics: AnalyticsMetrics;
  enabled: boolean;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsMetrics {
  pageViews: number;
  userActions: number;
  errors: number;
  performance: {
    averageLoadTime: number;
    averageRenderTime: number;
  };
}
