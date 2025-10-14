/// <reference path="../types/webComponents.d.ts" />

/**
 * Card Web Component
 * 
 * A React wrapper for the Polaris Web Components Card.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Card title="Card Title" sectioned>
 *   Card content
 * </Card>
 * ```
 */

import * as React from 'react';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card title */
  title?: string;
  /** Whether the card has sections */
  sectioned?: boolean;
  /** Whether the card has subdued styling */
  subdued?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ 
    children, 
    title,
    sectioned = false,
    subdued = false,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(title !== undefined && { title }),
      sectioned,
      subdued,
      ...props,
    }), [title, sectioned, subdued, props]);

    return (
      <s-card
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-card>
    );
  }
);

Card.displayName = 'Card';
