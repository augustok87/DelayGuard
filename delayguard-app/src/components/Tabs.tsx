/// <reference path="../types/webComponents.d.ts" />

/**
 * Tabs Web Component
 * 
 * A React wrapper for the Polaris Web Components Tabs.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Tabs
 *   tabs={[
 *     { id: 'tab1', content: 'Tab 1' },
 *     { id: 'tab2', content: 'Tab 2' }
 *   ]}
 *   selected={0}
 *   onSelect={setSelectedTab}
 * >
 *   <div>Tab 1 Content</div>
 *   <div>Tab 2 Content</div>
 * </Tabs>
 * ```
 */

import * as React from 'react';

export interface TabItem {
  id: string;
  content: string;
  url?: string;
  disabled?: boolean;
}

export interface TabsProps {
  /** Array of tab items */
  tabs?: TabItem[];
  /** Index of selected tab */
  selected?: number;
  /** Handler for tab selection */
  onSelect?: (selectedTabIndex: number) => void;
  /** Tab content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Tabs = React.forwardRef<HTMLElement, TabsProps>(
  ({ 
    tabs = [],
    selected = 0,
    onSelect,
    children,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Event handling for tab selection
    React.useEffect(() => {
      const element = webComponentRef.current;
      if (!element || !onSelect) return;

      const handleTabSelect = (event: Event) => {
        if (onSelect && typeof onSelect === 'function') {
          const customEvent = event as CustomEvent;
          const selectedIndex = customEvent.detail?.selectedIndex ?? customEvent.detail?.selected ?? 0;
          onSelect(selectedIndex);
        }
      };

      element.addEventListener('polaris-tab-select', handleTabSelect as EventListener);
      return () => element.removeEventListener('polaris-tab-select', handleTabSelect as EventListener);
    }, [onSelect]);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(tabs !== undefined && { tabs: JSON.stringify(tabs) }),
      selected,
      ...props,
    }), [tabs, selected, props]);

    return (
      <s-tabs
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-tabs>
    );
  }
);

Tabs.displayName = 'Tabs';
