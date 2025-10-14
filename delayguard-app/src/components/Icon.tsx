/// <reference path="../types/webComponents.d.ts" />

/**
 * Icon Web Component
 * 
 * A React wrapper for the Polaris Web Components Icon.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Icon source="add" />
 * ```
 */

import * as React from 'react';

export interface IconProps {
  /** Icon source/name */
  source?: string;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Icon = React.forwardRef<HTMLElement, IconProps>(
  ({ 
    source,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(source !== undefined && { source }),
      ...props,
    }), [source, props]);

    return (
      <s-icon
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      />
    );
  }
);

Icon.displayName = 'Icon';
