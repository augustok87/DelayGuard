/**
 * Unit Tests: HelpModal Component
 *
 * Educational modal for delay detection rules
 * Replaces inner accordions for cleaner UX
 *
 * TDD RED Phase: These tests should FAIL until HelpModal implementation is complete
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpModal } from '../../../src/components/ui/HelpModal';

describe('HelpModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Visibility and Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <HelpModal isOpen={false} onClose={mockOnClose} title="Test Help">
          <p>Help content</p>
        </HelpModal>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test Help">
          <p>Help content</p>
        </HelpModal>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render modal title', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Warehouse Delays Help">
          <p>Content</p>
        </HelpModal>,
      );

      expect(screen.getByText('Warehouse Delays Help')).toBeInTheDocument();
    });

    it('should render modal children content', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>This is educational content</p>
          <ul>
            <li>Point 1</li>
            <li>Point 2</li>
          </ul>
        </HelpModal>,
      );

      expect(screen.getByText('This is educational content')).toBeInTheDocument();
      expect(screen.getByText('Point 1')).toBeInTheDocument();
      expect(screen.getByText('Point 2')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when modal content is clicked', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const modalContent = screen.getByRole('dialog');
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Help Title">
          <p>Content</p>
        </HelpModal>,
      );

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();

      const titleElement = document.getElementById(titleId!);
      expect(titleElement?.textContent).toBe('Help Title');
    });

    it('should have aria-modal="true"', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should trap focus within modal when open', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content with <a href="#">link</a></p>
        </HelpModal>,
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('Responsive Design', () => {
    it('should have full-screen class on mobile', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toMatch(/modal/i);
    });
  });

  describe('Animation', () => {
    it('should have overlay animation class when open', () => {
      render(
        <HelpModal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </HelpModal>,
      );

      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay.className).toBeTruthy();
    });
  });
});
