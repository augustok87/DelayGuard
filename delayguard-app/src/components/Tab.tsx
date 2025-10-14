/// <reference path="../types/webComponents.d.ts" />

/**
 * Tab Web Component
 * 
 * A React wrapper for the Polaris Web Components Tab.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Tab data-tab="tab1">
 *   Tab Content
 * </Tab>
 * ```
 */

import * as React from 'react';

export interface TabProps {
  /** Tab identifier */
  'data-tab'?: string;
  /** Tab content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Tab = React.forwardRef<HTMLElement, TabProps>(
  ({ 
    'data-tab': dataTab,
    children,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(dataTab && { 'data-tab': dataTab }),
      ...props,
    }), [dataTab, props]);

    return (
      <s-tab
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-tab>
    );
  }
);

Tab.displayName = 'Tab';
