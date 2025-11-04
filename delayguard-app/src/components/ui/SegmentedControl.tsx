/**
 * SegmentedControl Component
 *
 * Shopify Polaris-style segmented button filter for toggling between options.
 * Phase B: Alert Filtering UX
 */

import React from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption {
  value: string;
  label: string;
  badge?: number;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps) {
  const handleClick = (optionValue: string) => {
    // Only call onChange if clicking a different option
    if (optionValue !== value) {
      onChange(optionValue);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
    // Handle Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(optionValue);
    }
  };

  return (
    <div className={`${styles.segmentedControl} ${className}`} role="group">
      {options.map((option) => {
        const isSelected = option.value === value;
        const ariaLabel = option.badge !== undefined
          ? `${option.label} (${option.badge})`
          : option.label;

        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.button} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleClick(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option.value)}
            aria-pressed={isSelected}
            aria-label={ariaLabel}
          >
            <span className={styles.label}>{option.label}</span>
            {option.badge !== undefined && (
              <span className={styles.badge}>{option.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = 'SegmentedControl';
