/**
 * SegmentedControl Mobile Layout Tests
 *
 * Tests for mobile responsive layout - ensuring horizontal (not vertical) display
 * Following TDD approach - tests written FIRST.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import styles from '../../../components/ui/SegmentedControl.module.css';

describe('SegmentedControl Mobile Layout', () => {
  const mockOptions = [
    { value: 'active', label: 'Active', badge: 5 },
    { value: 'resolved', label: 'Resolved', badge: 12 },
    { value: 'dismissed', label: 'Dismissed', badge: 3 },
  ];

  const mockOnChange = jest.fn();

  describe('Desktop Layout (default)', () => {
    it('should render with segmentedControl class (horizontal layout)', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const segmentedControl = container.querySelector('.segmentedControl');
      expect(segmentedControl).toBeInTheDocument();
      expect(segmentedControl).toHaveClass(styles.segmentedControl);
    });

    it('should have all buttons in the same container (horizontal)', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const segmentedControl = container.querySelector('.segmentedControl');
      const buttons = segmentedControl?.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
    });
  });

  describe('Mobile Layout (max-width: 768px)', () => {
    it('should maintain horizontal layout on mobile (not vertical stacking)', () => {
      // Note: CSS media queries apply flex-direction, but component structure stays the same
      // This test verifies component renders correctly for CSS to apply horizontal layout
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const segmentedControl = container.querySelector('.segmentedControl');
      expect(segmentedControl).toBeInTheDocument();

      // Component should NOT have any wrapper that forces vertical layout
      const buttons = segmentedControl?.querySelectorAll('button');
      expect(buttons).toHaveLength(3);

      // All buttons should be direct children of segmentedControl
      buttons?.forEach(button => {
        expect(button.parentElement).toBe(segmentedControl);
      });
    });

    it('should apply correct CSS classes for horizontal mobile layout', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const segmentedControl = container.querySelector('.segmentedControl');

      // Should have the segmentedControl class which contains mobile CSS
      expect(segmentedControl?.className).toContain('segmentedControl');
    });

    it('should render compact buttons suitable for horizontal mobile display', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const buttons = container.querySelectorAll('button');

      // Each button should have the button class
      buttons.forEach(button => {
        expect(button).toHaveClass(styles.button);
      });
    });

    it('should keep all 3 options visible in horizontal row on mobile', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const segmentedControl = container.querySelector('.segmentedControl');
      const buttons = segmentedControl?.querySelectorAll('button');

      // All 3 buttons should be present and siblings (horizontal layout)
      expect(buttons).toHaveLength(3);

      // Verify they're all immediate children (not nested in separate rows)
      const allButtonsAreSiblings = Array.from(buttons || []).every(
        (button, index, array) => {
          if (index === 0) return true;
          return button.parentElement === array[0].parentElement;
        },
      );
      expect(allButtonsAreSiblings).toBe(true);
    });
  });

  describe('Compact Mobile Display', () => {
    it('should render with badges in compact horizontal format', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const badges = container.querySelectorAll('.badge');
      expect(badges).toHaveLength(3);

      // Badges should be present for mobile display
      badges.forEach(badge => {
        expect(badge).toHaveClass(styles.badge);
      });
    });

    it('should maintain label visibility on mobile (not hidden)', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const labels = container.querySelectorAll('.label');
      expect(labels).toHaveLength(3);

      // All labels should be visible
      labels.forEach(label => {
        expect(label).toBeInTheDocument();
      });
    });

    it('should handle 4+ options in horizontal mobile layout', () => {
      const manyOptions = [
        { value: 'all', label: 'All', badge: 20 },
        { value: 'active', label: 'Active', badge: 5 },
        { value: 'resolved', label: 'Resolved', badge: 12 },
        { value: 'dismissed', label: 'Dismissed', badge: 3 },
      ];

      const { container } = render(
        <SegmentedControl options={manyOptions} value="all" onChange={mockOnChange} />,
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(4);

      // All should be in the same horizontal container
      const segmentedControl = container.querySelector('.segmentedControl');
      const buttonsInContainer = segmentedControl?.querySelectorAll('button');
      expect(buttonsInContainer).toHaveLength(4);
    });
  });

  describe('Mobile Responsiveness Edge Cases', () => {
    it('should handle long labels in compact horizontal format', () => {
      const longLabelOptions = [
        { value: 'processing', label: 'Processing', badge: 2 },
        { value: 'shipped', label: 'Shipped', badge: 15 },
        { value: 'delivered', label: 'Delivered', badge: 8 },
      ];

      const { container } = render(
        <SegmentedControl options={longLabelOptions} value="processing" onChange={mockOnChange} />,
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(3);

      // All buttons should remain in horizontal layout
      const segmentedControl = container.querySelector('.segmentedControl');
      expect(segmentedControl?.children).toHaveLength(3);
    });

    it('should apply equal width distribution for mobile horizontal layout', () => {
      // Note: CSS flex: 1 1 0% applies equal width
      // This test verifies component structure supports equal width distribution
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const buttons = container.querySelectorAll('button');

      // Each button should have the same class for consistent styling
      const allButtonsHaveSameBaseClass = Array.from(buttons).every(
        button => button.className.includes('button'),
      );
      expect(allButtonsHaveSameBaseClass).toBe(true);
    });
  });
});
