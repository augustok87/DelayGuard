/**
 * Web Components Index
 * 
 * This file exports all the Polaris Web Components that have been migrated
 * from @shopify/polaris to use Web Components under the hood.
 * 
 * Phase 1: Basic Components (Button, Text, Card, Badge, Spinner, EmptyState, Section, Divider, Icon)
 * Phase 2: Layout Components (Layout, Page, Banner, FormLayout, Checkbox, RangeSlider, Avatar, ButtonGroup, Popover, ActionList, SkeletonBodyText, SkeletonDisplayText, Frame)
 * Phase 3: Complex Components (DataTable, ResourceList, ResourceItem, Tabs, Tab, Modal, Toast)
 */

// Phase 1: Basic Components
export { Button } from './Button';
export { Text } from './Text';
export { Card } from './Card';
export { Badge } from './Badge';
export { Spinner } from './Spinner';
export { EmptyState } from './EmptyState';
export { Section } from './Section';
export { Divider } from './Divider';
export { Icon } from './Icon';

// Phase 2: Layout Components
// Note: These are not yet implemented in Web Components
// export { Layout } from './Layout';
// export { Page } from './Page';
// export { Banner } from './Banner';
// export { FormLayout } from './FormLayout';
// export { Checkbox } from './Checkbox';
// export { RangeSlider } from './RangeSlider';
// export { Avatar } from './Avatar';
// export { ButtonGroup } from './ButtonGroup';
// export { Popover } from './Popover';
// export { ActionList } from './ActionList';
// export { SkeletonBodyText } from './SkeletonBodyText';
// export { SkeletonDisplayText } from './SkeletonDisplayText';
// export { Frame } from './Frame';

// Phase 3: Complex Components
export { DataTable } from './DataTable';
export { ResourceList } from './ResourceList';
export { ResourceItem } from './ResourceItem';
export { Tabs } from './Tabs';
export { Tab } from './Tab';
export { Modal } from './Modal';
export { Toast } from './Toast';

// Re-export types
export type { ButtonProps } from './Button';
export type { TextProps } from './Text';
export type { CardProps } from './Card';
export type { BadgeProps } from './Badge';
export type { SpinnerProps } from './Spinner';
export type { EmptyStateProps } from './EmptyState';
export type { SectionProps } from './Section';
export type { DividerProps } from './Divider';
export type { IconProps } from './Icon';
export type { DataTableProps } from './DataTable';
export type { ResourceListProps } from './ResourceList';
export type { ResourceItemProps } from './ResourceItem';
export type { TabsProps } from './Tabs';
export type { TabProps } from './Tab';
export type { ModalProps, ModalSectionProps } from './Modal';
export type { ToastProps } from './Toast';
