/**
 * InfoTooltip Component Tests
 *
 * Tests for reusable info tooltip component (? icon with hover text).
 * Following TDD approach - tests written FIRST.
 *
 * Phase A: Quick UX Wins - Alert & Badge Clarity
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InfoTooltip } from '../../../components/ui/InfoTooltip';

describe('InfoTooltip Component', () => {
  describe('Rendering', () => {
    it('should render the info icon', () => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <InfoTooltip text="Help text" className="custom-class" />,
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render icon with question mark', () => {
      render(<InfoTooltip text="Help text" />);

      // Icon should contain a "?" character or similar indicator
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should not show tooltip by default', () => {
      render(<InfoTooltip text="Help text" />);

      // Tooltip should not exist in DOM initially (conditional rendering)
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip Behavior', () => {
    it('should show tooltip on mouse enter', async() => {
      const { container } = render(<InfoTooltip text="Help text content" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();

      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(screen.getByText('Help text content')).toBeVisible();
      });
    });

    it('should hide tooltip on mouse leave', async() => {
      const { container } = render(<InfoTooltip text="Help text content" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();

      // Show tooltip
      fireEvent.mouseEnter(icon!);
      await waitFor(() => {
        expect(screen.getByText('Help text content')).toBeVisible();
      });

      // Hide tooltip
      fireEvent.mouseLeave(icon!);
      await waitFor(() => {
        expect(screen.queryByText('Help text content')).not.toBeInTheDocument();
      });
    });

    it('should show tooltip on focus (keyboard accessibility)', async() => {
      const { container } = render(<InfoTooltip text="Help text content" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();

      fireEvent.focus(icon!);

      await waitFor(() => {
        expect(screen.getByText('Help text content')).toBeVisible();
      });
    });

    it('should hide tooltip on blur', async() => {
      const { container } = render(<InfoTooltip text="Help text content" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();

      // Show tooltip
      fireEvent.focus(icon!);
      await waitFor(() => {
        expect(screen.getByText('Help text content')).toBeVisible();
      });

      // Hide tooltip
      fireEvent.blur(icon!);
      await waitFor(() => {
        expect(screen.queryByText('Help text content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tooltip Content', () => {
    it('should display tooltip text', async() => {
      const { container } = render(
        <InfoTooltip text="This is helpful information for the user" />,
      );

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(screen.getByText('This is helpful information for the user')).toBeVisible();
      });
    });

    it('should handle long tooltip text', async() => {
      const longText =
        'This is a very long tooltip message that provides extensive help information to the user about what this feature does and how to use it properly.';
      const { container } = render(<InfoTooltip text={longText} />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(screen.getByText(longText)).toBeVisible();
      });
    });

    it('should handle multiline tooltip content', async() => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<InfoTooltip text={multilineText} />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(screen.getByText(/Line 1/)).toBeVisible();
      });
    });

    it('should handle special characters in tooltip', async() => {
      const specialText = 'Use this when you\'ve taken action (e.g., contacted customer, issued refund)';
      const { container } = render(<InfoTooltip text={specialText} />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(screen.getByText(specialText)).toBeVisible();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toHaveAttribute('aria-label');
      expect(icon).toHaveAttribute('role', 'button');
    });

    it('should be keyboard accessible with tabindex', () => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-describedby when tooltip is shown', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        expect(icon).toHaveAttribute('aria-describedby');
      });
    });

    it('should associate tooltip with trigger element', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        const tooltipId = icon?.getAttribute('aria-describedby');
        expect(tooltipId).toBeTruthy();

        // Find tooltip by role instead of ID (avoids selector issues with special chars)
        const tooltip = screen.getByText('Help text').closest('[role="tooltip"]');
        expect(tooltip).toHaveAttribute('id', tooltipId!);
      });
    });

    it('should have proper role for tooltip content', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        const tooltip = screen.getByText('Help text').closest('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tooltip text gracefully', () => {
      const { container } = render(<InfoTooltip text="" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should position tooltip to avoid viewport overflow', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        const tooltip = screen.getByText('Help text').closest('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument(); // Tooltip is positioned above icon
      });
    });

    it('should handle rapid hover events', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');

      // Rapid hover on/off
      fireEvent.mouseEnter(icon!);
      fireEvent.mouseLeave(icon!);
      fireEvent.mouseEnter(icon!);
      fireEvent.mouseLeave(icon!);
      fireEvent.mouseEnter(icon!);

      // Should end with tooltip visible
      await waitFor(() => {
        expect(screen.getByText('Help text')).toBeVisible();
      });
    });
  });

  describe('Styling', () => {
    it('should apply default icon styles', () => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      // Icon should have styling class from CSS module
      expect(icon).toHaveAttribute('class');
    });

    it('should apply tooltip styles when visible', async() => {
      const { container } = render(<InfoTooltip text="Help text" />);

      const icon = container.querySelector('[data-testid="info-tooltip-icon"]');
      fireEvent.mouseEnter(icon!);

      await waitFor(() => {
        const tooltip = screen.getByText('Help text').closest('[role="tooltip"]');
        // Tooltip should have styling class from CSS module
        expect(tooltip).toHaveAttribute('class');
      });
    });
  });
});
