/**
 * SegmentedControl Component Tests
 *
 * Tests for the segmented button filter component (Phase B: Alert Filtering UX)
 * Following TDD approach - tests written FIRST.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';

describe('SegmentedControl Component', () => {
  const mockOptions = [
    { value: 'active', label: 'Active', badge: 5 },
    { value: 'resolved', label: 'Resolved', badge: 12 },
    { value: 'dismissed', label: 'Dismissed', badge: 3 },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render all option buttons', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      expect(screen.getByRole('button', { name: /Active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resolved/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dismissed/i })).toBeInTheDocument();
    });

    it('should display badge counts for each option', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      expect(screen.getByText('5')).toBeInTheDocument(); // Active badge
      expect(screen.getByText('12')).toBeInTheDocument(); // Resolved badge
      expect(screen.getByText('3')).toBeInTheDocument(); // Dismissed badge
    });

    it('should mark selected button with selected class', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveClass('selected');

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      expect(resolvedButton).not.toHaveClass('selected');
    });

    it('should render without badges when not provided', () => {
      const optionsNoBadge = [
        { value: 'all', label: 'All' },
        { value: 'archived', label: 'Archived' },
      ];

      render(
        <SegmentedControl options={optionsNoBadge} value="all" onChange={mockOnChange} />,
      );

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Archived' })).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <SegmentedControl
          options={mockOptions}
          value="active"
          onChange={mockOnChange}
          className="custom-class"
        />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should call onChange when clicking unselected button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      fireEvent.click(resolvedButton);

      expect(mockOnChange).toHaveBeenCalledWith('resolved');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange when clicking another button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const dismissedButton = screen.getByRole('button', { name: /Dismissed/i });
      fireEvent.click(dismissedButton);

      expect(mockOnChange).toHaveBeenCalledWith('dismissed');
    });

    it('should NOT call onChange when clicking already selected button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const activeButton = screen.getByRole('button', { name: /Active/i });
      fireEvent.click(activeButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should update selected button when value prop changes', () => {
      const { rerender } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      let activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveClass('selected');

      // Change value prop
      rerender(
        <SegmentedControl options={mockOptions} value="resolved" onChange={mockOnChange} />,
      );

      activeButton = screen.getByRole('button', { name: /Active/i });
      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      expect(activeButton).not.toHaveClass('selected');
      expect(resolvedButton).toHaveClass('selected');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow Tab key to focus buttons', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const activeButton = screen.getByRole('button', { name: /Active/i });
      activeButton.focus();
      expect(activeButton).toHaveFocus();
    });

    it('should call onChange when pressing Enter on focused button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      resolvedButton.focus();
      fireEvent.keyDown(resolvedButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledWith('resolved');
    });

    it('should call onChange when pressing Space on focused button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      resolvedButton.focus();
      fireEvent.keyDown(resolvedButton, { key: ' ', code: 'Space' });

      expect(mockOnChange).toHaveBeenCalledWith('resolved');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should have aria-pressed="true" on selected button', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveAttribute('aria-pressed', 'true');

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      expect(resolvedButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-label with badge count when badge is present', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveAttribute('aria-label', 'Active (5)');
    });

    it('should be keyboard focusable', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should have proper group role for container', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single option', () => {
      const singleOption = [{ value: 'only', label: 'Only Option', badge: 1 }];

      render(
        <SegmentedControl options={singleOption} value="only" onChange={mockOnChange} />,
      );

      expect(screen.getByRole('button', { name: /Only Option/i })).toBeInTheDocument();
    });

    it('should handle zero badge count', () => {
      const optionsWithZero = [
        { value: 'active', label: 'Active', badge: 0 },
        { value: 'resolved', label: 'Resolved', badge: 5 },
      ];

      render(
        <SegmentedControl options={optionsWithZero} value="active" onChange={mockOnChange} />,
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large badge counts (100+)', () => {
      const optionsLargeBadge = [
        { value: 'active', label: 'Active', badge: 123 },
      ];

      render(
        <SegmentedControl options={optionsLargeBadge} value="active" onChange={mockOnChange} />,
      );

      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should handle long option labels gracefully', () => {
      const optionsLongLabel = [
        { value: 'long', label: 'Very Long Option Label That Might Wrap', badge: 1 },
      ];

      render(
        <SegmentedControl options={optionsLongLabel} value="long" onChange={mockOnChange} />,
      );

      expect(screen.getByRole('button', { name: /Very Long Option Label/i })).toBeInTheDocument();
    });

    it('should handle rapid clicks on different buttons', () => {
      render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const resolvedButton = screen.getByRole('button', { name: /Resolved/i });
      const dismissedButton = screen.getByRole('button', { name: /Dismissed/i });

      fireEvent.click(resolvedButton);
      fireEvent.click(dismissedButton);
      fireEvent.click(resolvedButton);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'resolved');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'dismissed');
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'resolved');
    });
  });

  describe('Styling', () => {
    it('should apply button class to all buttons', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('class');
      });
    });

    it('should apply badge class when badge is present', () => {
      const { container } = render(
        <SegmentedControl options={mockOptions} value="active" onChange={mockOnChange} />,
      );

      const badges = container.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
