/* eslint-disable @typescript-eslint/no-explicit-any */
// Lazy loading wrapper with dynamic imports
import React, { Suspense, lazy, ComponentType } from 'react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  fallback = <LoadingSpinner message="Loading..." />, 
  children, 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Higher-order component for lazy loading
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode,
) => {
  const LazyComponent = lazy(() => 
    Promise.resolve({ default: Component }),
  );

  const WrappedComponent: React.FC<P> = (props) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...(props as any)} />
    </LazyWrapper>
  );

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Utility function to create lazy components
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode,
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...(props as any)} />
    </LazyWrapper>
  );
};
