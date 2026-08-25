// Redux Store Types
import { AppSettings, DelayAlert, Order, StatsData, Toast } from "./index";

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
  // G2: dashboard stats from GET /api/analytics (null until fetched or
  // when the fetch fails — the header renders a quiet zero fallback).
  stats: StatsData | null;
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
  status?: "active" | "resolved" | "dismissed";
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
  /** True only during the initial fetch. May gate rendering. */
  loading: boolean;
  /**
   * True while a write (save / test-alert) is in flight. Deliberately
   * separate from `loading`: a mutation must never blank the form it was
   * dispatched from. See settingsSlice for the regression this prevents.
   */
  saving: boolean;
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
    data?: Record<string, unknown>;
  };
}

export interface ToastState {
  items: Toast[];
}

export interface ThemeState {
  mode: "light" | "dark";
  primaryColor: string;
  fontSize: "sm" | "md" | "lg";
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
  payload?: Record<string, unknown>;
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
  extra?: Record<string, unknown>;
  rejectValue?: string;
}

// Selector Types
export type Selector<T> = (state: RootState) => T;
export type ParametricSelector<T, P> = (state: RootState, params: P) => T;

// Hook Types
export type AppDispatch = ReturnType<
  typeof import("../store/store").store.dispatch
>;

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
  middleware?: Array<Record<string, unknown>>;
  devTools?: boolean;
}

// Persist Configuration
export interface PersistConfig {
  key: string;
  storage: Record<string, unknown>;
  whitelist?: string[];
  blacklist?: string[];
  transforms?: Array<Record<string, unknown>>;
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
    data: Record<string, unknown>;
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
  properties: Record<string, unknown>;
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
