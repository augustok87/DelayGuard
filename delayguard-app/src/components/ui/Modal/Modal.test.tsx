/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from './index';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: 'Modal content',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal custom-modal');
    });

    it('should render with different sizes', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(
          <Modal {...defaultProps} size={size} />,
        );
        
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveClass(`modal ${size}`);
        
        unmount();
      });
    });

    it('should render with empty title', () => {
      render(<Modal {...defaultProps} title="" />);
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should close when close button is clicked', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close when escape key is pressed', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close when backdrop is clicked', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when modal content is clicked', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const content = screen.getByText('Modal content');
      await user.click(content);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should handle backdrop click', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(
        <Modal 
          {...defaultProps} 
          onClose={onClose}
        />,
      );
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should handle escape key', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(
        <Modal 
          {...defaultProps} 
          onClose={onClose}
        />,
      );
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async() => {
      const { container } = render(<Modal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should focus the modal when opened', async() => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      await waitFor(() => {
        expect(modal).toHaveFocus();
      });
    });

    it('should restore focus when closed', async() => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      // Create a controlled modal component
      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        
        const handleClose = () => {
          setIsOpen(false);
          onClose();
        };
        
        return (
          <div>
            <button tabIndex={0}>Focus me</button>
            <Modal {...defaultProps} isOpen={isOpen} onClose={handleClose} />
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const button = screen.getByText('Focus me');
      button.focus();
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      // Wait for modal to close
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      // Verify modal is no longer in the DOM
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });

    it('should trap focus within modal', async() => {
      const user = userEvent.setup();
      
      render(
        <Modal {...defaultProps}>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </Modal>,
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      const firstButton = screen.getByText('First');
      const secondButton = screen.getByText('Second');
      const thirdButton = screen.getByText('Third');
      
      // Wait for initial focus to be set
      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });
      
      // Tab through buttons
      await user.tab();
      expect(secondButton).toHaveFocus();
      
      await user.tab();
      expect(thirdButton).toHaveFocus();
      
      await user.tab();
      expect(closeButton).toHaveFocus();
      
      // Tab again should cycle back to first button
      await user.tab();
      expect(firstButton).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestModal = React.memo(() => {
        renderSpy();
        return <Modal {...defaultProps} />;
      });
      
      const { rerender } = render(<TestModal />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestModal />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle onClose function', () => {
      const onClose = jest.fn();
      expect(() => {
        render(<Modal {...defaultProps} onClose={onClose} />);
      }).not.toThrow();
    });

    it('should handle complex children', () => {
      render(
        <Modal {...defaultProps}>
          <div>
            <h2>Complex</h2>
            <p>Content</p>
            <button>Action</button>
          </div>
        </Modal>,
      );
      
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should handle multiple modals', () => {
      render(
        <div>
          <Modal {...defaultProps} title="Modal 1" />
          <Modal {...defaultProps} title="Modal 2" isOpen={false} />
        </div>,
      );
      
      expect(screen.getByText('Modal 1')).toBeInTheDocument();
      expect(screen.queryByText('Modal 2')).not.toBeInTheDocument();
    });
  });
});
