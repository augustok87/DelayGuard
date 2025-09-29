// UI Component Types
import { AppSettings, DelayAlert, Order, StatsData } from './index';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: boolean;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  className?: string;
  'aria-label'?: string;
}

export interface BadgeProps {
  status: 'active' | 'resolved' | 'dismissed' | 'shipped' | 'delivered' | 'processing';
  children: React.ReactNode;
  className?: string;
}

export interface TableProps {
  headers: string[];
  rows: TableRow[];
  caption?: string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export interface TableRow {
  id: string;
  cells: React.ReactNode[];
  onClick?: () => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface FormFieldProps {
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  value: any;
  onChange: (value: any) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
  hideToast: (id: string) => void;
}

// Layout Types
export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface HeaderProps {
  stats: StatsData;
  onConnectShopify: () => void;
  className?: string;
}

export interface NavigationProps {
  selectedTab: number;
  onTabChange: (tab: number) => void;
  className?: string;
}

// Feature Component Types
export interface DashboardTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSaveSettings: () => void;
  onTestDelay: () => void;
  loading?: boolean;
  className?: string;
}

export interface AlertsTabProps {
  alerts: DelayAlert[];
  onAlertAction: (alertId: string, action: string) => void;
  loading?: boolean;
  className?: string;
}

export interface OrdersTabProps {
  orders: Order[];
  onOrderAction: (orderId: string, action: string) => void;
  loading?: boolean;
  className?: string;
}

export interface SettingsFormProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onTest: () => void;
  loading?: boolean;
  className?: string;
}
