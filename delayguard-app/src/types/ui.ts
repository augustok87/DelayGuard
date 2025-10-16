// UI Component Types
import { AppSettings, DelayAlert, Order, StatsData } from './index';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
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
  status?: 'active' | 'resolved' | 'dismissed' | 'shipped' | 'delivered' | 'processing';
  tone?: 'critical' | 'warning' | 'success' | 'info' | 'base' | 'subdued';
  children: React.ReactNode;
  className?: string;
}

export interface TextProps {
  variant?: 'headingLg' | 'headingMd' | 'headingSm' | 'bodyLg' | 'bodyMd' | 'bodySm';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  tone?: 'base' | 'subdued' | 'critical' | 'warning' | 'success' | 'info';
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
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

export interface ModalAction {
  content: string;
  onAction: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  primaryAction?: ModalAction;
  secondaryActions?: ModalAction[];
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

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export interface DataTableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: DataTableRow) => React.ReactNode;
}

export interface DataTableRow {
  id: string;
  [key: string]: any;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data?: DataTableRow[];
  rows?: DataTableRow[];
  loading?: boolean;
  emptyMessage?: string;
  sortable?: boolean;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: DataTableRow) => void;
  className?: string;
  'aria-label'?: string;
  // Bulk selection props
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSelectAll?: (selected: boolean) => void;
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultActiveTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  'aria-label'?: string;
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
