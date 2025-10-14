/// <reference path="../types/webComponents.d.ts" />

/**
 * Section Web Component
 * 
 * A React wrapper for the Polaris Web Components Section.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Section title="Section Title" sectioned>
 *   Section content
 * </Section>
 * ```
 */

import * as React from 'react';

export interface SectionProps {
  /** Section content */
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Whether the section has sections */
  sectioned?: boolean;
  /** Whether the section has subdued styling */
  subdued?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
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
      <s-section
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-section>
    );
  }
);

Section.displayName = 'Section';
