/**
 * InfoTooltip Component
 *
 * Reusable info icon with hover tooltip for providing contextual help.
 * Phase A: Quick UX Wins - Alert & Badge Clarity
 *
 * Features:
 * - Small (?) icon indicator
 * - Tooltip shows on hover and focus
 * - Keyboard accessible
 * - ARIA compliant
 *
 * Usage:
 * <InfoTooltip text="This is helpful information" />
 */

import React, { useState, useId } from 'react';
import styles from './InfoTooltip.module.css';

export interface InfoTooltipProps {
  /** Tooltip text to display on hover/focus */
  text: string;
  /** Custom CSS class for the wrapper */
  className?: string;
}

export function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const showTooltip = () => {
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <span className={`${styles.tooltipWrapper} ${className}`}>
      <span
        data-testid="info-tooltip-icon"
        className={styles.icon}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        role="button"
        tabIndex={0}
        aria-label="More information"
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        ?
      </span>
      {isVisible && text && (
        <span
          id={tooltipId}
          className={styles.tooltipContent}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}

InfoTooltip.displayName = 'InfoTooltip';
