/// <reference path="../types/webComponents.d.ts" />

/**
 * Divider Web Component
 * 
 * A React wrapper for the Polaris Web Components Divider.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Divider />
 * ```
 */

import * as React from 'react';

export interface DividerProps {
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Divider = React.forwardRef<HTMLElement, DividerProps>(
  ({ 
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...props,
    }), [props]);

    return (
      <s-divider
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      />
    );
  }
);

Divider.displayName = 'Divider';
