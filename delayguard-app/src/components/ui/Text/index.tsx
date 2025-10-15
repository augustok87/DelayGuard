import React from 'react';
import { TextProps } from '../../../types/ui';
import styles from './Text.module.css';

export const Text: React.FC<TextProps> = ({
  variant = 'bodyMd',
  as: Component = 'p',
  tone = 'base',
  fontWeight = 'regular',
  children,
  className = '',
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...props
}) => {
  const textClasses = [
    styles.text,
    styles[variant],
    styles[tone],
    styles[fontWeight],
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={textClasses}
      style={style}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      {...props}
    >
      {children}
    </Component>
  );
};
