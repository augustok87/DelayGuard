/// <reference path="../types/webComponents.d.ts" />

/**
 * Spinner Web Component
 * 
 * A React wrapper for the Polaris Web Components Spinner.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Spinner size="large" />
 * ```
 */

import * as React from 'react';

export interface SpinnerProps {
  /** Spinner size */
  size?: 'small' | 'large';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Spinner = React.forwardRef<HTMLElement, SpinnerProps>(
  ({ 
    size = 'small',
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      size,
      ...props,
    }), [size, props]);

    return (
      <s-spinner
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      />
    );
  }
);

Spinner.displayName = 'Spinner';
