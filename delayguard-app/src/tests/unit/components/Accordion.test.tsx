/**
 * Accordion Component Tests
 *
 * Tests for the reusable Accordion component with accessibility features.
 * Following TDD approach - tests written FIRST.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Accordion } from '../../../components/ui/Accordion';

describe('Accordion Component', () => {
  describe('Rendering', () => {
    it('should render with title and children', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      // Content should be hidden by default (check aria-hidden)
      const contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <Accordion title="Test" className="custom-class">
          <p>Content</p>
        </Accordion>,
      );

      const accordion = container.querySelector('.custom-class');
      expect(accordion).toBeInTheDocument();
    });

    it('should render with default closed state', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      // Check aria-hidden is true (closed state)
      const contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should render with open state when defaultOpen is true', () => {
      const { container } = render(
        <Accordion title="Test Title" defaultOpen={true}>
          <p>Test Content</p>
        </Accordion>,
      );

      // Check aria-hidden is false (open state)
      const contentWrapper = container.querySelector('[aria-hidden="false"]');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should toggle content when clicking the header', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title');

      // Initially closed (aria-hidden="true")
      let contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();

      // Click to open
      fireEvent.click(header);
      contentWrapper = container.querySelector('[aria-hidden="false"]');
      expect(contentWrapper).toBeInTheDocument();

      // Click to close
      fireEvent.click(header);
      contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should toggle when pressing Enter key', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toBeInTheDocument();

      // Initially closed
      let contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();

      // Press Enter to open
      fireEvent.keyDown(header!, { key: 'Enter', code: 'Enter' });
      contentWrapper = container.querySelector('[aria-hidden="false"]');
      expect(contentWrapper).toBeInTheDocument();

      // Press Enter to close
      fireEvent.keyDown(header!, { key: 'Enter', code: 'Enter' });
      contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should toggle when pressing Space key', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toBeInTheDocument();

      // Initially closed
      let contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();

      // Press Space to open
      fireEvent.keyDown(header!, { key: ' ', code: 'Space' });
      contentWrapper = container.querySelector('[aria-hidden="false"]');
      expect(contentWrapper).toBeInTheDocument();

      // Press Space to close
      fireEvent.keyDown(header!, { key: ' ', code: 'Space' });
      contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should not toggle when pressing other keys', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toBeInTheDocument();

      // Press other keys (should not toggle - should stay closed)
      fireEvent.keyDown(header!, { key: 'a', code: 'KeyA' });
      let contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();

      fireEvent.keyDown(header!, { key: 'Escape', code: 'Escape' });
      contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when closed', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');
      expect(header).toHaveAttribute('aria-controls');
    });

    it('should have proper ARIA attributes when open', () => {
      render(
        <Accordion title="Test Title" defaultOpen={true}>
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper role attributes', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toHaveAttribute('type', 'button');
    });

    it('should be keyboard focusable', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).not.toHaveAttribute('tabIndex', '-1');
    });

    it('should have associated content region', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      const contentId = header?.getAttribute('aria-controls');
      expect(contentId).toBeTruthy();

      const content = container.querySelector(`#${contentId}`);
      expect(content).toBeInTheDocument();
    });
  });

  describe('Icon Behavior', () => {
    it('should render with an icon indicator', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      // Check for icon (could be SVG, emoji, or other element)
      const header = screen.getByText('Test Title').closest('button');
      expect(header?.querySelector('[data-testid="accordion-icon"]')).toBeInTheDocument();
    });

    it('should rotate icon when opening/closing', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      const icon = header?.querySelector('[data-testid="accordion-icon"]');

      // Initially closed (icon should have closed state class)
      expect(icon).toHaveClass('icon');

      // Open accordion
      fireEvent.click(header!);
      expect(icon).toHaveClass('iconOpen');

      // Close accordion
      fireEvent.click(header!);
      expect(icon).toHaveClass('icon');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      render(
        <Accordion title="Test Title">
          {null}
        </Accordion>,
      );

      const header = screen.getByText('Test Title');
      expect(header).toBeInTheDocument();
    });

    it('should handle complex children content', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <div>
            <h3>Nested Title</h3>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </Accordion>,
      );

      fireEvent.click(screen.getByText('Test Title'));

      // After clicking, accordion should be open (aria-hidden="false")
      const contentWrapper = container.querySelector('[aria-hidden="false"]');
      expect(contentWrapper).toBeInTheDocument();
      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle rapid toggle clicks', () => {
      const { container } = render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title');

      // Rapid clicks: starts closed → open → closed → open → closed
      fireEvent.click(header);
      fireEvent.click(header);
      fireEvent.click(header);
      fireEvent.click(header);

      // Should end in closed state (aria-hidden="true")
      const contentWrapper = container.querySelector('[aria-hidden="true"]');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('should work as uncontrolled component (default)', () => {
      render(
        <Accordion title="Test Title">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title');

      // Component manages its own state
      fireEvent.click(header);
      expect(screen.getByText('Test Content')).toBeVisible();
    });

    it('should support custom id for content region', () => {
      render(
        <Accordion title="Test Title" id="custom-accordion">
          <p>Test Content</p>
        </Accordion>,
      );

      const header = screen.getByText('Test Title').closest('button');
      expect(header).toHaveAttribute('aria-controls', 'custom-accordion-content');
    });
  });
});
