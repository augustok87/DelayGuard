/**
 * Text Web Component
 * 
 * A React wrapper for the Polaris Web Components Text.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Text variant="headingLg" as="h1">
 *   Main Heading
 * </Text>
 * ```
 */

import React, { useMemo } from 'react';

export interface TextProps {
  /** Text content */
  children: React.ReactNode;
  /** Text variant for styling */
  variant?: 'headingLg' | 'headingMd' | 'headingSm' | 'bodyLg' | 'bodyMd' | 'bodySm';
  /** HTML element to render as */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  /** Text tone/color */
  tone?: 'base' | 'subdued' | 'critical' | 'warning' | 'success' | 'info';
  /** Font weight */
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** ID of element that describes this text */
  'aria-describedby'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Text: React.FC<TextProps> = ({ 
  children, 
  variant = 'bodyMd',
  as = 'p',
  tone = 'base',
  fontWeight,
  className,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props 
}) => {
  // Convert React props to Web Component attributes
  const webComponentProps = useMemo(() => ({
    variant,
    as,
    tone,
    ...(fontWeight && { fontWeight }),
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props
  }), [variant, as, tone, fontWeight, ariaLabel, ariaDescribedBy, props]);

  return (
    <s-text
      className={className}
      data-testid={dataTestId}
      {...webComponentProps}
    >
      {children}
    </s-text>
  );
};
