/// <reference path="../types/webComponents.d.ts" />

/**
 * Badge Web Component
 * 
 * A React wrapper for the Polaris Web Components Badge.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Badge tone="success">Success</Badge>
 * ```
 */

import * as React from 'react';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Badge tone/color */
  tone?: 'info' | 'success' | 'warning' | 'critical' | 'attention';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Badge = React.forwardRef<HTMLElement, BadgeProps>(
  ({ 
    children, 
    tone = 'info',
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      tone,
      ...props,
    }), [tone, props]);

    return (
      <s-badge
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-badge>
    );
  }
);

Badge.displayName = 'Badge';
