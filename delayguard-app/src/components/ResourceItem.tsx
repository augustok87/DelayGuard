/// <reference path="../types/webComponents.d.ts" />

/**
 * ResourceItem Web Component
 * 
 * A React wrapper for the Polaris Web Components ResourceItem.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <ResourceItem id="item-1" onClick={() => handleClick(item)}>
 *   Item Content
 * </ResourceItem>
 * ```
 */

import * as React from 'react';

export interface ResourceItemProps {
  /** Unique identifier for the item */
  id?: string;
  /** Click handler for the item */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Item content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const ResourceItem = React.forwardRef<HTMLElement, ResourceItemProps>(
  ({ 
    id,
    onClick,
    children,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Event handling for onClick
    React.useEffect(() => {
      const element = webComponentRef.current;
      if (!element || !onClick) return;

      const handleClick = (event: Event) => {
        if (onClick && typeof onClick === 'function') {
          onClick(event as unknown as React.MouseEvent<HTMLElement>);
        }
      };

      element.addEventListener('click', handleClick);
      return () => element.removeEventListener('click', handleClick);
    }, [onClick]);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(id !== undefined && { id }),
      ...props,
    }), [id, props]);

    return (
      <s-resource-item
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-resource-item>
    );
  }
);

ResourceItem.displayName = 'ResourceItem';
