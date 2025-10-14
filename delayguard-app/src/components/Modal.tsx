/// <reference path="../types/webComponents.d.ts" />

/**
 * Modal Web Component
 * 
 * A React wrapper for the Polaris Web Components Modal.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   title="Modal Title"
 *   primaryAction={{
 *     content: 'Save',
 *     onAction: handleSave
 *   }}
 *   secondaryActions={[
 *     {
 *       content: 'Cancel',
 *       onAction: handleCancel
 *     }
 *   ]}
 *   onClose={handleClose}
 * >
 *   <Modal.Section>
 *     Modal content here
 *   </Modal.Section>
 * </Modal>
 * ```
 */

import * as React from 'react';

export interface ModalAction {
  content: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ModalProps {
  /** Whether the modal is open */
  open?: boolean;
  /** Modal title */
  title?: string;
  /** Primary action */
  primaryAction?: ModalAction;
  /** Secondary actions */
  secondaryActions?: ModalAction[];
  /** Close handler */
  onClose?: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

const ModalComponent = React.forwardRef<HTMLElement, ModalProps>(
  ({ 
    open = false,
    title,
    primaryAction,
    secondaryActions = [],
    onClose,
    children,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Event handling for modal close
    React.useEffect(() => {
      const element = webComponentRef.current;
      if (!element || !onClose) return;

      const handleClose = () => {
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
      };

      element.addEventListener('polaris-modal-close', handleClose);
      return () => element.removeEventListener('polaris-modal-close', handleClose);
    }, [onClose]);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      open,
      ...(title && { title }),
      ...(primaryAction && { primaryAction: JSON.stringify(primaryAction) }),
      ...(secondaryActions !== undefined && { secondaryActions: JSON.stringify(secondaryActions) }),
      ...props,
    }), [open, title, primaryAction, secondaryActions, props]);

    return (
      <s-modal
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {children as React.ReactNode}
      </s-modal>
    );
  }
);

ModalComponent.displayName = 'Modal';

// Modal.Section component
export interface ModalSectionProps {
  /** Section content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const ModalSection = React.forwardRef<HTMLDivElement, ModalSectionProps>(
  ({ 
    children,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    return (
      <div
        ref={_ref}
        className={className as string}
        data-testid={dataTestId as string}
        {...props}
      >
        {children as React.ReactNode}
      </div>
    );
  }
);

ModalSection.displayName = 'ModalSection';

// Create a compound component
const ModalWithSection = ModalComponent as typeof ModalComponent & {
  Section: typeof ModalSection;
};

ModalWithSection.Section = ModalSection;

export { ModalWithSection as Modal };
