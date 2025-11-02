/**
 * React Components Index
 * 
 * This file exports all the custom React components for a consistent,
 * maintainable, and world-class architecture.
 */

// Basic Components
export { Button } from './Button';
export { Card } from './Card';
export { Text } from './Text';
export { Badge } from '../Badge';
export { Spinner } from './Spinner';
export { LoadingSpinner } from './LoadingSpinner';
export { CommunicationStatusBadge } from './CommunicationStatusBadge'; // Phase 1.3

// Complex Components
export { Modal } from './Modal';
export { Tabs } from './Tabs';
export { DataTable } from './DataTable';
export { Toast } from './Toast';
export { Accordion } from './Accordion';

// Common Components
export { EmptyState } from '../common/EmptyState';
export { EmptyState as EnhancedEmptyState } from './EmptyState';
export { ErrorState } from '../common/ErrorState';

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

// Phase 1.3: Communication Status Badge types
export type { CommunicationStatusBadgeProps } from './CommunicationStatusBadge';

// Accordion types
export type { AccordionProps } from './Accordion';
