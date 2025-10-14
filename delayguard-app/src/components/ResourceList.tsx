/// <reference path="../types/webComponents.d.ts" />

/**
 * ResourceList Web Component
 * 
 * A React wrapper for the Polaris Web Components ResourceList.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <ResourceList
 *   items={items}
 *   selectable
 *   renderItem={(item) => (
 *     <ResourceItem id={item.id} onClick={() => handleClick(item)}>
 *       {item.name}
 *     </ResourceItem>
 *   )}
 * />
 * ```
 */

import * as React from 'react';

export interface ResourceListProps {
  /** List of items to display */
  items?: any[];
  /** Whether items are selectable */
  selectable?: boolean;
  /** Function to render each item */
  renderItem?: (item: any) => React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const ResourceList = React.forwardRef<HTMLElement, ResourceListProps>(
  ({ 
    items = [],
    selectable = false,
    renderItem,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      items: JSON.stringify(items),
      selectable,
      ...props,
    }), [items, selectable, props]);

    return (
      <s-resource-list
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {/* Render items using renderItem function if provided */}
        {renderItem && items.map((item: any, index: number) => (
          <React.Fragment key={item.id || index}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </s-resource-list>
    );
  }
);

ResourceList.displayName = 'ResourceList';
