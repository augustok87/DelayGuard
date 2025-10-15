/**
 * React Components Index
 * 
 * This file exports all the custom React components that replace
 * the Web Components for a consistent, maintainable architecture.
 */

// Basic Components
export { Button } from './Button';
export { Card } from './Card';
export { Text } from './Text';
export { Badge } from '../Badge';
export { Spinner } from './Spinner';
export { LoadingSpinner } from './LoadingSpinner';

// Complex Components
export { Modal } from './Modal';
export { Tabs } from './Tabs';
export { DataTable } from './DataTable';
export { Toast } from './Toast';

// Re-export types
export type {
  ButtonProps,
  CardProps,
  TextProps,
  BadgeProps,
  LoadingSpinnerProps,
  ModalProps,
  TabsProps,
  TabItem,
  DataTableProps,
  DataTableColumn,
  DataTableRow,
  ToastProps,
} from '../../types/ui';
