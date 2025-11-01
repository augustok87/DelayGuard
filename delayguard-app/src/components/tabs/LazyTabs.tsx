import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DashboardTabProps, AlertsTabProps, OrdersTabProps } from '../../types/ui';

// Lazy load tab components with proper typing
export const LazyDashboardTab = lazy(() => import('./DashboardTab').then(module => ({ default: module.DashboardTab })));
export const LazyAlertsTab = lazy(() => import('./AlertsTab').then(module => ({ default: module.AlertsTab })));
export const LazyOrdersTab = lazy(() => import('./OrdersTab').then(module => ({ default: module.OrdersTab })));

// Lazy load individual components
export const LazyAlertCard = lazy(() => import('./AlertsTab/AlertCard').then(module => ({ default: module.AlertCard })));
export const LazyOrderCard = lazy(() => import('./OrdersTab/OrderCard').then(module => ({ default: module.OrderCard })));
export const LazySettingsCard = lazy(() => import('./DashboardTab/SettingsCard').then(module => ({ default: module.SettingsCard })));
export const LazyStatsCard = lazy(() => import('./DashboardTab/StatsCard').then(module => ({ default: module.StatsCard })));

// Wrapper components with Suspense
export const DashboardTabWithSuspense: React.FC<DashboardTabProps> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Dashboard..." />}>
    <LazyDashboardTab {...props} />
  </Suspense>
);

export const AlertsTabWithSuspense: React.FC<AlertsTabProps> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Alerts..." />}>
    <LazyAlertsTab {...props} />
  </Suspense>
);

export const OrdersTabWithSuspense: React.FC<OrdersTabProps> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Orders..." />}>
    <LazyOrdersTab {...props} />
  </Suspense>
);
