/// <reference path="../types/webComponents.d.ts" />

/**
 * EmptyState Web Component
 * 
 * A React wrapper for the Polaris Web Components EmptyState.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <EmptyState heading="No items found" image="empty-state.svg">
 *   <p>Try adding some items to get started.</p>
 * </EmptyState>
 * ```
 */

import * as React from 'react';

export interface EmptyStateProps {
  /** EmptyState content */
  children: React.ReactNode;
  /** EmptyState heading */
  heading?: string;
  /** EmptyState image */
  image?: string;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const EmptyState = React.forwardRef<HTMLElement, EmptyStateProps>(
  ({ 
    children, 
    heading,
    image,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(heading !== undefined && { heading }),
      ...(image !== undefined && { image }),
      ...props,
    }), [heading, image, props]);

    return (
      <s-empty-state
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-empty-state>
    );
  }
);

EmptyState.displayName = 'EmptyState';
