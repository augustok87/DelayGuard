/**
 * Enhanced Button Component
 * World-class button with variants, sizes, and micro-interactions
 * @version 2.0.0
 */

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './Button.enhanced.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'size'> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Icon to display before button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after button text */
  rightIcon?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button children */
  children?: React.ReactNode;
}

/**
 * Enhanced Button component with world-class design and micro-interactions
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" leftIcon={<Icon />}>
 *   Click Me
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const buttonClasses = [
      styles.button,
      styles[`button--${variant}`],
      styles[`button--${size}`],
      fullWidth && styles['button--full-width'],
      loading && styles['button--loading'],
      disabled && styles['button--disabled'],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
        {...props}
      >
        {loading && (
          <span className={styles.spinner}>
            <svg className={styles.spinnerSvg} viewBox="0 0 24 24">
              <circle
                className={styles.spinnerCircle}
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="3"
              />
            </svg>
          </span>
        )}
        
        {!loading && leftIcon && (
          <span className={styles.leftIcon}>{leftIcon}</span>
        )}
        
        {children && <span className={styles.content}>{children}</span>}
        
        {!loading && rightIcon && (
          <span className={styles.rightIcon}>{rightIcon}</span>
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
