/**
 * Components Index
 *
 * This file exports all components for easy importing
 */

// Main App Components
export { App } from "./App";
export { AppProvider } from "./AppProvider";
export { default as MinimalApp } from "./MinimalApp";
export { default as RefactoredApp } from "./RefactoredApp";
export { default as EnhancedDashboard } from "./EnhancedDashboard";
export { default as ThemeCustomizer } from "./ThemeCustomizer";

// UI Components
export * from "./ui";

// Layout Components
export { AppHeader } from "./layout/AppHeader";
export { TabNavigation } from "./layout/TabNavigation";

// Common Components
export { ErrorAlert } from "./common/ErrorAlert";
export { ErrorBoundary } from "./common/ErrorBoundary";
export { ToastProvider } from "./common/ToastProvider";

// Tab Components
export {
  DashboardTabWithSuspense,
  AlertsTabWithSuspense,
  OrdersTabWithSuspense,
} from "./tabs/LazyTabs";

// Analytics
export { default as AnalyticsDashboard } from "./AnalyticsDashboard";
