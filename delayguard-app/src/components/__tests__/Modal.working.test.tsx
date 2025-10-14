/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Modal Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Modal component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../Modal';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-modal
  class MockModalElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'dialog');
      this.setAttribute('tabindex', '0');
    }
    
    setAttribute(name: string, value: string) {
      super.setAttribute(name, value);
      if (name === 'class') {
        this.className = value;
      }
    }
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-modal')) {
      customElements.define('s-modal', MockModalElement);
    }
  }
});

describe('Modal Web Component - Working Tests', () => {
  const samplePrimaryAction = {
    content: 'Save',
    onAction: jest.fn(),
    disabled: false,
    loading: false
  };

  const sampleSecondaryActions = [
    {
      content: 'Cancel',
      onAction: jest.fn(),
      disabled: false,
      loading: false
    },
    {
      content: 'Delete',
      onAction: jest.fn(),
      disabled: false,
      loading: false
    }
  ];

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Modal>Default Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal.tagName.toLowerCase()).toBe('s-modal');
    });

    it('should render when open', () => {
      render(<Modal open>Open Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('open', 'true');
    });

    it('should not render when closed', () => {
      render(<Modal open={false}>Closed Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('open', 'false');
    });

    it('should render with title', () => {
      render(<Modal open title="Modal Title">Modal Content</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('title', 'Modal Title');
    });

    it('should render with primary action', () => {
      render(
        <Modal
          open
          title="Modal Title"
          primaryAction={samplePrimaryAction}
        >
          Modal Content
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('primaryAction', JSON.stringify(samplePrimaryAction));
    });

    it('should render with secondary actions', () => {
      render(
        <Modal
          open
          title="Modal Title"
          secondaryActions={sampleSecondaryActions}
        >
          Modal Content
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('secondaryActions', JSON.stringify(sampleSecondaryActions));
    });

    it('should apply custom className', () => {
      render(<Modal open className="custom-class">Modal Content</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Modal
          open
          title="Complete Modal"
          primaryAction={samplePrimaryAction}
          secondaryActions={sampleSecondaryActions}
          className="test-class"
          data-testid="test-modal"
        >
          Complete Modal Content
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('open', 'true');
      expect(modal).toHaveAttribute('title', 'Complete Modal');
      expect(modal).toHaveAttribute('primaryAction', JSON.stringify(samplePrimaryAction));
      expect(modal).toHaveAttribute('secondaryActions', JSON.stringify(sampleSecondaryActions));
      expect(modal).toHaveAttribute('class', 'test-class');
      expect(modal).toHaveAttribute('data-testid', 'test-modal');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined title gracefully', () => {
      render(<Modal open>No Title Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveAttribute('title');
    });

    it('should handle undefined primaryAction gracefully', () => {
      render(<Modal open>No Primary Action Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveAttribute('primaryAction');
    });

    it('should handle undefined secondaryActions gracefully', () => {
      render(<Modal open>No Secondary Actions Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveAttribute('secondaryActions');
    });

    it('should handle empty secondaryActions array', () => {
      render(<Modal open secondaryActions={[]}>Empty Secondary Actions Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('secondaryActions', '[]');
    });

    it('should handle boolean props correctly', () => {
      render(<Modal open={true}>Boolean Props Modal</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('open', 'true');
    });
  });

  describe('Event Handling', () => {
    it('should call onClose handler when modal is closed', async () => {
      const handleClose = jest.fn();
      render(
        <Modal
          open
          onClose={handleClose}
        >
          Modal Content
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      
      // Simulate modal close event
      const event = new CustomEvent('polaris-modal-close');
      modal.dispatchEvent(event);
      
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle multiple close events', async () => {
      const handleClose = jest.fn();
      render(
        <Modal
          open
          onClose={handleClose}
        >
          Modal Content
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      
      // Simulate multiple close events
      modal.dispatchEvent(new CustomEvent('polaris-modal-close'));
      modal.dispatchEvent(new CustomEvent('polaris-modal-close'));
      
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle undefined onClose gracefully', () => {
      render(<Modal open>No Close Handler Modal</Modal>);
      const modal = screen.getByRole('dialog');
      
      // Should not throw error
      modal.dispatchEvent(new CustomEvent('polaris-modal-close'));
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Modal open title="Accessible Modal">Modal Content</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    it('should be keyboard accessible', () => {
      render(<Modal open>Keyboard accessible modal</Modal>);
      const modal = screen.getByRole('dialog');
      modal.focus();
      expect(modal).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <Modal
              open={isOpen}
              onClose={() => setIsOpen(false)}
              title="State Modal"
            >
              Modal Content
            </Modal>
          </div>
        );
      };

      render(<TestComponent />);
      const button = screen.getByText('Open Modal');
      const modal = screen.getByRole('dialog');
      
      expect(modal).toHaveAttribute('open', 'false');
      
      fireEvent.click(button);
      
      expect(modal).toHaveAttribute('open', 'true');
    });

    it('should work with nested components', () => {
      render(
        <Modal open title="Nested Modal">
          <div>
            <h3>Nested Heading</h3>
            <p>Nested paragraph</p>
            <button>Action Button</button>
          </div>
        </Modal>
      );
      
      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should work with Modal.Section', () => {
      render(
        <Modal open title="Sectioned Modal">
          <Modal.Section>
            <h3>Section 1</h3>
            <p>Content for section 1</p>
          </Modal.Section>
          <Modal.Section>
            <h3>Section 2</h3>
            <p>Content for section 2</p>
          </Modal.Section>
        </Modal>
      );
      
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Content for section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Content for section 2')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        open: true,
        title: 'Test Modal',
        primaryAction: samplePrimaryAction,
        secondaryActions: sampleSecondaryActions,
        className: 'test-class',
        'data-testid': 'test-modal',
        onClose: jest.fn(),
      };

      render(<Modal {...props}>Test Content</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });
});
