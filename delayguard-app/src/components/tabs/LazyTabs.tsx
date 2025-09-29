import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// Lazy load tab components with proper typing
export const LazyDashboardTab = lazy(() => import('./DashboardTab/DashboardTab.memo').then(module => ({ default: module.DashboardTab })));
export const LazyAlertsTab = lazy(() => import('./AlertsTab/AlertsTab.memo').then(module => ({ default: module.AlertsTab })));
export const LazyOrdersTab = lazy(() => import('./OrdersTab/OrdersTab.memo').then(module => ({ default: module.OrdersTab })));

// Lazy load individual components
export const LazyAlertCard = lazy(() => import('./AlertsTab/AlertCard.memo').then(module => ({ default: module.AlertCard })));
export const LazyOrderCard = lazy(() => import('./OrdersTab/OrderCard.memo').then(module => ({ default: module.OrderCard })));
export const LazySettingsCard = lazy(() => import('./DashboardTab/SettingsCard').then(module => ({ default: module.SettingsCard })));
export const LazyStatsCard = lazy(() => import('./DashboardTab/StatsCard').then(module => ({ default: module.StatsCard })));

// Wrapper components with Suspense
export const DashboardTabWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading Dashboard..." />}>
    <LazyDashboardTab {...props} />
  </Suspense>
);

export const AlertsTabWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading Alerts..." />}>
    <LazyAlertsTab {...props} />
  </Suspense>
);

export const OrdersTabWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading Orders..." />}>
    <LazyOrdersTab {...props} />
  </Suspense>
);
