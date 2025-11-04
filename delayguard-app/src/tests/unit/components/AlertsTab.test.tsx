/**
 * AlertsTab Component Tests
 *
 * Tests for AlertsTab with Phase B filtering functionality.
 * Covers SegmentedControl integration, tab filtering, badge counts, and empty states.
 *
 * Phase B: Alert Filtering - Segmented Button Filter
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AlertsTab } from '../../../components/tabs/AlertsTab';
import type { DelayAlert } from '../../../types';

// Mock AlertCard component
jest.mock('../../../components/tabs/AlertsTab/AlertCard', () => ({
  AlertCard: ({ alert, onAction, variant }: any) => (
    <div data-testid={`alert-card-${alert.id}`} data-variant={variant}>
      <div>Alert: {alert.orderId}</div>
      <div>Status: {alert.status}</div>
      <button onClick={() => onAction(alert.id, 'resolve')}>Resolve</button>
      <button onClick={() => onAction(alert.id, 'dismiss')}>Dismiss</button>
    </div>
  ),
}));

// Mock Card component
jest.mock('../../../components/ui/Card', () => ({
  Card: ({ title, subtitle, children }: any) => (
    <div data-testid="card">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

describe('AlertsTab Component', () => {
  const mockOnAlertAction = jest.fn();

  // Test data factory
  const createAlert = (id: string, status: 'active' | 'resolved' | 'dismissed'): DelayAlert => ({
    id,
    orderId: `order-${id}`,
    status,
    createdAt: new Date().toISOString(),
    customerName: 'John Doe',
    delayDays: 3,
    customerEmail: 'customer@example.com',
    totalAmount: 150.0,
    currency: 'USD',
    priority: 'high',
    severity: 'high',
    trackingNumber: 'TRACK123',
    carrierCode: 'usps',
    delayReason: 'Weather delay',
  });

  const mockAlerts: DelayAlert[] = [
    createAlert('1', 'active'),
    createAlert('2', 'active'),
    createAlert('3', 'active'),
    createAlert('4', 'resolved'),
    createAlert('5', 'resolved'),
    createAlert('6', 'dismissed'),
  ];

  beforeEach(() => {
    mockOnAlertAction.mockClear();
  });

  describe('Loading State', () => {
    it('should render loading state when loading is true', () => {
      render(<AlertsTab alerts={[]} loading={true} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Delay Alerts')).toBeInTheDocument();
      expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
      expect(screen.getByText('Loading delay alerts...')).toBeInTheDocument();
    });

    it('should not render SegmentedControl when loading', () => {
      render(<AlertsTab alerts={mockAlerts} loading={true} onAlertAction={mockOnAlertAction} />);

      // SegmentedControl buttons should not exist
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
      expect(screen.queryByText('Dismissed')).not.toBeInTheDocument();
    });
  });

  describe('Empty State (No Alerts)', () => {
    it('should render empty state when no alerts exist', () => {
      render(<AlertsTab alerts={[]} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Delay Alerts')).toBeInTheDocument();
      expect(screen.getByText('No delay alerts found')).toBeInTheDocument();
      expect(screen.getByText('Alerts will appear here when delays are detected.')).toBeInTheDocument();
    });

    it('should not render SegmentedControl when no alerts', () => {
      render(<AlertsTab alerts={[]} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    });
  });

  describe('SegmentedControl Rendering', () => {
    it('should render SegmentedControl with all 3 options', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Dismissed')).toBeInTheDocument();
    });

    it('should show correct badge counts for each status', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Active: 3 alerts
      const activeButton = screen.getByText('Active').closest('button');
      expect(within(activeButton!).getByText('3')).toBeInTheDocument();

      // Resolved: 2 alerts
      const resolvedButton = screen.getByText('Resolved').closest('button');
      expect(within(resolvedButton!).getByText('2')).toBeInTheDocument();

      // Dismissed: 1 alert
      const dismissedButton = screen.getByText('Dismissed').closest('button');
      expect(within(dismissedButton!).getByText('1')).toBeInTheDocument();
    });

    it('should default to Active tab selected', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      const activeButton = screen.getByText('Active').closest('button');
      expect(activeButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Filter Summary Text', () => {
    it('should display correct summary for active alerts (plural)', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Showing 3 active alerts')).toBeInTheDocument();
    });

    it('should display correct summary for single alert (singular)', () => {
      const singleAlert = [createAlert('1', 'active')];
      render(<AlertsTab alerts={singleAlert} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Showing 1 active alert')).toBeInTheDocument();
    });

    it('should update summary when switching tabs', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Initially shows active alerts
      expect(screen.getByText('Showing 3 active alerts')).toBeInTheDocument();

      // Click Resolved tab
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.getByText('Showing 2 resolved alerts')).toBeInTheDocument();

      // Click Dismissed tab
      fireEvent.click(screen.getByText('Dismissed'));
      expect(screen.getByText('Showing 1 dismissed alert')).toBeInTheDocument();
    });
  });

  describe('Tab Filtering Behavior', () => {
    it('should show only active alerts by default', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Should show 3 active alerts
      expect(screen.getByTestId('alert-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-3')).toBeInTheDocument();

      // Should NOT show resolved or dismissed alerts
      expect(screen.queryByTestId('alert-card-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-5')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-6')).not.toBeInTheDocument();
    });

    it('should show only resolved alerts when Resolved tab clicked', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Click Resolved tab
      fireEvent.click(screen.getByText('Resolved'));

      // Should show 2 resolved alerts
      expect(screen.getByTestId('alert-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-5')).toBeInTheDocument();

      // Should NOT show active or dismissed alerts
      expect(screen.queryByTestId('alert-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-6')).not.toBeInTheDocument();
    });

    it('should show only dismissed alerts when Dismissed tab clicked', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Click Dismissed tab
      fireEvent.click(screen.getByText('Dismissed'));

      // Should show 1 dismissed alert
      expect(screen.getByTestId('alert-card-6')).toBeInTheDocument();

      // Should NOT show active or resolved alerts
      expect(screen.queryByTestId('alert-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-5')).not.toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Start with Active
      expect(screen.getByTestId('alert-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-4')).not.toBeInTheDocument();

      // Switch to Resolved
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.queryByTestId('alert-card-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('alert-card-4')).toBeInTheDocument();

      // Switch back to Active
      fireEvent.click(screen.getByText('Active'));
      expect(screen.getByTestId('alert-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-card-4')).not.toBeInTheDocument();

      // Switch to Dismissed
      fireEvent.click(screen.getByText('Dismissed'));
      expect(screen.queryByTestId('alert-card-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('alert-card-6')).toBeInTheDocument();
    });
  });

  describe('AlertCard Integration', () => {
    it('should render AlertCard for each filtered alert', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Should render 3 AlertCards (active alerts)
      const alertCards = screen.getAllByText(/Alert: order-/);
      expect(alertCards).toHaveLength(3);
    });

    it('should pass correct variant prop to AlertCard based on active tab', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Active tab - cards should have variant="active"
      expect(screen.getByTestId('alert-card-1')).toHaveAttribute('data-variant', 'active');

      // Click Resolved tab
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.getByTestId('alert-card-4')).toHaveAttribute('data-variant', 'resolved');

      // Click Dismissed tab
      fireEvent.click(screen.getByText('Dismissed'));
      expect(screen.getByTestId('alert-card-6')).toHaveAttribute('data-variant', 'dismissed');
    });

    it('should call onAlertAction when alert action triggered', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Click Resolve button on first active alert
      const resolveButtons = screen.getAllByText('Resolve');
      fireEvent.click(resolveButtons[0]);

      expect(mockOnAlertAction).toHaveBeenCalledWith('1', 'resolve');
    });
  });

  describe('Tab-Specific Empty States', () => {
    it('should show active empty state when no active alerts', () => {
      const alertsWithoutActive = [
        createAlert('4', 'resolved'),
        createAlert('6', 'dismissed'),
      ];

      render(<AlertsTab alerts={alertsWithoutActive} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
      expect(screen.getByText('Great! All delays have been resolved or dismissed.')).toBeInTheDocument();
    });

    it('should show resolved empty state when no resolved alerts', () => {
      const alertsWithoutResolved = [
        createAlert('1', 'active'),
        createAlert('6', 'dismissed'),
      ];

      render(<AlertsTab alerts={alertsWithoutResolved} loading={false} onAlertAction={mockOnAlertAction} />);

      // Click Resolved tab
      fireEvent.click(screen.getByText('Resolved'));

      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('No resolved alerts')).toBeInTheDocument();
      expect(screen.getByText('Resolved alerts will appear here after you mark them as handled.')).toBeInTheDocument();
    });

    it('should show dismissed empty state when no dismissed alerts', () => {
      const alertsWithoutDismissed = [
        createAlert('1', 'active'),
        createAlert('4', 'resolved'),
      ];

      render(<AlertsTab alerts={alertsWithoutDismissed} loading={false} onAlertAction={mockOnAlertAction} />);

      // Click Dismissed tab
      fireEvent.click(screen.getByText('Dismissed'));

      expect(screen.getByText('🗑️')).toBeInTheDocument();
      expect(screen.getByText('No dismissed alerts')).toBeInTheDocument();
      expect(screen.getByText('Dismissed alerts will appear here.')).toBeInTheDocument();
    });

    it('should show correct empty state icons for each tab', () => {
      const emptyAlerts = [createAlert('1', 'active')]; // Only 1 active, rest empty

      render(<AlertsTab alerts={emptyAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Resolved tab - 📝 icon
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.getByText('📝')).toBeInTheDocument();

      // Dismissed tab - 🗑️ icon
      fireEvent.click(screen.getByText('Dismissed'));
      expect(screen.getByText('🗑️')).toBeInTheDocument();

      // Active tab - should show alert (not empty)
      fireEvent.click(screen.getByText('Active'));
      expect(screen.getByTestId('alert-card-1')).toBeInTheDocument();
    });
  });

  describe('Badge Count Updates', () => {
    it('should show zero badge when status has no alerts', () => {
      const onlyActiveAlerts = [
        createAlert('1', 'active'),
        createAlert('2', 'active'),
      ];

      render(<AlertsTab alerts={onlyActiveAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Active should show 2
      const activeButton = screen.getByText('Active').closest('button');
      expect(within(activeButton!).getByText('2')).toBeInTheDocument();

      // Resolved and Dismissed should show 0
      const resolvedButton = screen.getByText('Resolved').closest('button');
      expect(within(resolvedButton!).getByText('0')).toBeInTheDocument();

      const dismissedButton = screen.getByText('Dismissed').closest('button');
      expect(within(dismissedButton!).getByText('0')).toBeInTheDocument();
    });

    it('should update badge counts when alerts prop changes', () => {
      const { rerender } = render(
        <AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />,
      );

      // Initial counts: 3 active, 2 resolved, 1 dismissed
      let activeButton = screen.getByText('Active').closest('button');
      expect(within(activeButton!).getByText('3')).toBeInTheDocument();

      // Update alerts prop
      const updatedAlerts = [
        createAlert('1', 'active'),
        createAlert('2', 'resolved'),
        createAlert('3', 'resolved'),
        createAlert('4', 'resolved'),
      ];

      rerender(<AlertsTab alerts={updatedAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // New counts: 1 active, 3 resolved, 0 dismissed
      activeButton = screen.getByText('Active').closest('button');
      expect(within(activeButton!).getByText('1')).toBeInTheDocument();

      const resolvedButton = screen.getByText('Resolved').closest('button');
      expect(within(resolvedButton!).getByText('3')).toBeInTheDocument();

      const dismissedButton = screen.getByText('Dismissed').closest('button');
      expect(within(dismissedButton!).getByText('0')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle alerts with same status', () => {
      const allActiveAlerts = [
        createAlert('1', 'active'),
        createAlert('2', 'active'),
        createAlert('3', 'active'),
        createAlert('4', 'active'),
      ];

      render(<AlertsTab alerts={allActiveAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      expect(screen.getByText('Showing 4 active alerts')).toBeInTheDocument();
      expect(screen.getAllByText(/Alert: order-/)).toHaveLength(4);
    });

    it('should handle rapid tab switching', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Rapidly switch between tabs
      fireEvent.click(screen.getByText('Resolved'));
      fireEvent.click(screen.getByText('Dismissed'));
      fireEvent.click(screen.getByText('Active'));
      fireEvent.click(screen.getByText('Resolved'));
      fireEvent.click(screen.getByText('Active'));

      // Should end on Active tab showing 3 alerts
      expect(screen.getByText('Showing 3 active alerts')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-1')).toBeInTheDocument();
    });

    it('should handle single alert in each status', () => {
      const oneEachAlerts = [
        createAlert('1', 'active'),
        createAlert('2', 'resolved'),
        createAlert('3', 'dismissed'),
      ];

      render(<AlertsTab alerts={oneEachAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Check Active (singular)
      expect(screen.getByText('Showing 1 active alert')).toBeInTheDocument();

      // Check Resolved (singular)
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.getByText('Showing 1 resolved alert')).toBeInTheDocument();

      // Check Dismissed (singular)
      fireEvent.click(screen.getByText('Dismissed'));
      expect(screen.getByText('Showing 1 dismissed alert')).toBeInTheDocument();
    });

    it('should filter correctly when alerts prop updates while on different tab', () => {
      const { rerender } = render(
        <AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />,
      );

      // Switch to Resolved tab
      fireEvent.click(screen.getByText('Resolved'));
      expect(screen.getByTestId('alert-card-4')).toBeInTheDocument();

      // Update alerts (add more resolved)
      const updatedAlerts = [
        ...mockAlerts,
        createAlert('7', 'resolved'),
        createAlert('8', 'resolved'),
      ];

      rerender(<AlertsTab alerts={updatedAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Should still be on Resolved tab, showing 4 resolved alerts
      expect(screen.getByText('Showing 4 resolved alerts')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-7')).toBeInTheDocument();
      expect(screen.getByTestId('alert-card-8')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should maintain focus on SegmentedControl when switching tabs', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      const resolvedButton = screen.getByText('Resolved').closest('button');

      // Focus and click
      resolvedButton?.focus();
      fireEvent.click(resolvedButton!);

      // Button should still be in the document (not re-mounted)
      expect(screen.getByText('Resolved').closest('button')).toBeInTheDocument();
    });

    it('should have proper aria-pressed attributes on tab buttons', () => {
      render(<AlertsTab alerts={mockAlerts} loading={false} onAlertAction={mockOnAlertAction} />);

      // Active should be pressed
      const activeButton = screen.getByText('Active').closest('button');
      expect(activeButton).toHaveAttribute('aria-pressed', 'true');

      // Others should not be pressed
      const resolvedButton = screen.getByText('Resolved').closest('button');
      expect(resolvedButton).toHaveAttribute('aria-pressed', 'false');

      // Click Resolved
      fireEvent.click(resolvedButton!);

      // Now Resolved should be pressed
      expect(resolvedButton).toHaveAttribute('aria-pressed', 'true');
      expect(activeButton).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
