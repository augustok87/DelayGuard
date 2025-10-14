/// <reference path="../types/webComponents.d.ts" />

/**
 * Toast Web Component
 * 
 * A React wrapper for the Polaris Web Components Toast.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Toast
 *   content="Success message"
 *   onDismiss={() => setToastMessage(null)}
 * />
 * ```
 */

import * as React from 'react';

export interface ToastProps {
  /** Toast content */
  content?: string;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const Toast = React.forwardRef<HTMLElement, ToastProps>(
  ({ 
    content,
    onDismiss,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Event handling for toast dismiss
    React.useEffect(() => {
      const element = webComponentRef.current;
      if (!element || !onDismiss) return;

      const handleDismiss = () => {
        if (onDismiss && typeof onDismiss === 'function') {
          onDismiss();
        }
      };

      element.addEventListener('polaris-toast-dismiss', handleDismiss);
      return () => element.removeEventListener('polaris-toast-dismiss', handleDismiss);
    }, [onDismiss]);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(content !== undefined && { content }),
      ...props,
    }), [content, props]);

    return (
      <s-toast
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {content}
      </s-toast>
    );
  }
);

Toast.displayName = 'Toast';
