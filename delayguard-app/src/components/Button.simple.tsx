/// <reference path="../types/webComponents.d.ts" />

/**
 * Simple Button Web Component
 * 
 * A basic React wrapper for the Polaris Web Components Button.
 */

import * as React from 'react';

export interface ButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button type for forms */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Whether the button is disabled for accessibility */
  'aria-disabled'?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
  ...props 
}) => {
  const webComponentRef = React.useRef<HTMLButtonElement>(null);

  // Simple event handling
  React.useEffect(() => {
    const element = webComponentRef.current;
    if (!element || !onClick || disabled || loading) return;

    const handleClick = (event: Event) => {
      if (onClick) {
        onClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    };

    element.addEventListener('polaris-click', handleClick);
    return () => element.removeEventListener('polaris-click', handleClick);
  }, [onClick, disabled, loading]);

  // Convert React props to Web Component attributes
  const webComponentProps = React.useMemo(() => ({
    variant,
    size,
    disabled: disabled || loading,
    loading,
    type,
    'aria-label': ariaLabel,
    'aria-disabled': ariaDisabled || disabled || loading,
    ...props,
  }), [variant, size, disabled, loading, type, ariaLabel, ariaDisabled, props]);

  return (
    <s-button
      ref={webComponentRef}
      className={className}
      data-testid={dataTestId}
      {...webComponentProps}
    >
      {children}
    </s-button>
  );
};

Button.displayName = 'Button';