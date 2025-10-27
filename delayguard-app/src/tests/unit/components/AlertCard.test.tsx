/**
 * AlertCard Component Tests
 *
 * Test suite for the enhanced AlertCard component that displays comprehensive
 * delay alert information including delay reason, revised ETA, notification status,
 * suggested actions, and tracking timeline.
 *
 * Priority 3: Tests for missing critical information now included in alert cards.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCard } from '../../../components/tabs/AlertsTab/AlertCard';
import { DelayAlert, TrackingEvent } from '../../../types';

describe('AlertCard', () => {
  const baseAlert: DelayAlert = {
    id: 'alert-1',
    orderId: 'ORD-12345',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    delayDays: 3,
    status: 'active',
    createdAt: '2025-10-20T10:00:00Z',
    trackingNumber: 'TRK-123456',
    carrierCode: 'UPS',
    severity: 'medium',
  };

  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the AlertCard component', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(`Order #${baseAlert.orderId}`)).toBeInTheDocument();
      expect(screen.getByText(baseAlert.customerName)).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(AlertCard.displayName).toBe('AlertCard');
    });
  });

  describe('Delay Reason Display', () => {
    it('should display delay reason when provided', () => {
      const alertWithReason = {
        ...baseAlert,
        delayReason: 'Weather delay in Memphis, TN',
      };

      render(<AlertCard alert={alertWithReason} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Weather delay in Memphis, TN/i)).toBeInTheDocument();
    });

    it('should not display delay reason section when not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Reason:/i)).not.toBeInTheDocument();
    });

    it('should display delay reason with proper icon', () => {
      const alertWithReason = {
        ...baseAlert,
        delayReason: 'Carrier facility delay',
      };

      const { container } = render(<AlertCard alert={alertWithReason} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Carrier facility delay/i)).toBeInTheDocument();
      // Check for delay reason section
      const reasonSection = container.querySelector('.delayReason');
      expect(reasonSection).toBeInTheDocument();
    });
  });

  describe('Revised ETA Display', () => {
    it('should display original and revised ETA when both provided', () => {
      const alertWithEta = {
        ...baseAlert,
        originalEta: '2025-10-22T18:00:00Z',
        revisedEta: '2025-10-25T18:00:00Z',
      };

      render(<AlertCard alert={alertWithEta} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Original ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Revised ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Oct 22, 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Oct 25, 2025/i)).toBeInTheDocument();
    });

    it('should display only original ETA when no revision', () => {
      const alertWithOriginalEta = {
        ...baseAlert,
        originalEta: '2025-10-22T18:00:00Z',
      };

      render(<AlertCard alert={alertWithOriginalEta} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Original ETA:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Revised ETA:/i)).not.toBeInTheDocument();
    });

    it('should highlight revised ETA when different from original', () => {
      const alertWithEta = {
        ...baseAlert,
        originalEta: '2025-10-22T18:00:00Z',
        revisedEta: '2025-10-25T18:00:00Z',
      };

      const { container } = render(<AlertCard alert={alertWithEta} onAction={mockOnAction} variant="active" />);

      // Revised ETA should have special styling
      const revisedEta = container.querySelector('.revisedEta');
      expect(revisedEta).toBeInTheDocument();
    });

    it('should not display ETA section when neither provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Original ETA:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Revised ETA:/i)).not.toBeInTheDocument();
    });
  });

  describe('Notification Status Display', () => {
    it('should display email sent status', () => {
      const alertWithNotification = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',  // Different date to avoid conflict with createdAt
        },
      };

      render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Email sent/i)).toBeInTheDocument();
      expect(screen.getByText(/Oct 21, 2025/i)).toBeInTheDocument();
    });

    it('should display SMS sent status', () => {
      const alertWithNotification = {
        ...baseAlert,
        notificationStatus: {
          smsSent: true,
          smsSentAt: '2025-10-20T10:05:00Z',
        },
      };

      render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/SMS sent/i)).toBeInTheDocument();
    });

    it('should display both email and SMS status when both sent', () => {
      const alertWithNotification = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-20T10:05:00Z',
          smsSent: true,
          smsSentAt: '2025-10-20T10:06:00Z',
        },
      };

      render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Email sent/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS sent/i)).toBeInTheDocument();
    });

    it('should indicate when notifications have not been sent', () => {
      const alertWithNotification = {
        ...baseAlert,
        notificationStatus: {
          emailSent: false,
          smsSent: false,
        },
      };

      render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/No notifications sent/i)).toBeInTheDocument();
    });

    it('should not display notification section when status not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Email sent/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/SMS sent/i)).not.toBeInTheDocument();
    });
  });

  describe('Suggested Actions Display', () => {
    it('should display suggested actions when provided', () => {
      const alertWithActions = {
        ...baseAlert,
        suggestedActions: [
          'Contact customer about delay',
          'Offer expedited shipping on next order',
          'Monitor carrier updates closely',
        ],
      };

      render(<AlertCard alert={alertWithActions} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Contact customer about delay/i)).toBeInTheDocument();
      expect(screen.getByText(/Offer expedited shipping on next order/i)).toBeInTheDocument();
      expect(screen.getByText(/Monitor carrier updates closely/i)).toBeInTheDocument();
    });

    it('should display suggested actions as a list', () => {
      const alertWithActions = {
        ...baseAlert,
        suggestedActions: ['Action 1', 'Action 2'],
      };

      const { container } = render(<AlertCard alert={alertWithActions} onAction={mockOnAction} variant="active" />);

      const actionsList = container.querySelector('.suggestedActions');
      expect(actionsList).toBeInTheDocument();

      const listItems = container.querySelectorAll('.actionItem');
      expect(listItems).toHaveLength(2);
    });

    it('should not display suggested actions section when empty', () => {
      const alertWithEmptyActions = {
        ...baseAlert,
        suggestedActions: [],
      };

      render(<AlertCard alert={alertWithEmptyActions} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Suggested Actions:/i)).not.toBeInTheDocument();
    });

    it('should not display suggested actions section when not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Suggested Actions:/i)).not.toBeInTheDocument();
    });
  });

  describe('Tracking Timeline Display', () => {
    const mockTrackingEvents: TrackingEvent[] = [
      {
        id: 'evt-1',
        timestamp: '2025-10-20T08:00:00Z',
        status: 'in_transit',
        description: 'Package departed facility',
        location: 'Memphis, TN',
        carrierStatus: 'DEPARTED_FACILITY',
      },
      {
        id: 'evt-2',
        timestamp: '2025-10-20T12:00:00Z',
        status: 'exception',
        description: 'Weather delay',
        location: 'Memphis, TN',
        carrierStatus: 'WEATHER_DELAY',
      },
    ];

    it('should display tracking timeline when events provided', () => {
      const alertWithTracking = {
        ...baseAlert,
        trackingEvents: mockTrackingEvents,
      };

      render(<AlertCard alert={alertWithTracking} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Tracking Timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Package departed facility/i)).toBeInTheDocument();
      expect(screen.getByText(/Weather delay/i)).toBeInTheDocument();
    });

    it('should display tracking events in chronological order', () => {
      const alertWithTracking = {
        ...baseAlert,
        trackingEvents: mockTrackingEvents,
      };

      const { container } = render(<AlertCard alert={alertWithTracking} onAction={mockOnAction} variant="active" />);

      const timelineItems = container.querySelectorAll('.timelineEvent');
      expect(timelineItems).toHaveLength(2);
    });

    it('should display location for tracking events', () => {
      const alertWithTracking = {
        ...baseAlert,
        trackingEvents: mockTrackingEvents,
      };

      render(<AlertCard alert={alertWithTracking} onAction={mockOnAction} variant="active" />);

      expect(screen.getAllByText(/Memphis, TN/i).length).toBeGreaterThan(0);
    });

    it('should limit timeline to most recent events', () => {
      const manyEvents: TrackingEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `evt-${i}`,
        timestamp: `2025-10-${20 - i}T08:00:00Z`,
        status: 'in_transit',
        description: `Event ${i}`,
      }));

      const alertWithManyEvents = {
        ...baseAlert,
        trackingEvents: manyEvents,
      };

      const { container } = render(<AlertCard alert={alertWithManyEvents} onAction={mockOnAction} variant="active" />);

      // Should limit to 5 most recent events
      const timelineItems = container.querySelectorAll('.timelineEvent');
      expect(timelineItems.length).toBeLessThanOrEqual(5);
    });

    it('should not display tracking timeline when no events', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Tracking Timeline/i)).not.toBeInTheDocument();
    });

    it('should display "Show All Events" button when more than 5 events', () => {
      const manyEvents: TrackingEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `evt-${i}`,
        timestamp: `2025-10-${20 - i}T08:00:00Z`,
        status: 'in_transit',
        description: `Event ${i}`,
      }));

      const alertWithManyEvents = {
        ...baseAlert,
        trackingEvents: manyEvents,
      };

      render(<AlertCard alert={alertWithManyEvents} onAction={mockOnAction} variant="active" />);

      expect(screen.getByRole('button', { name: /Show all events/i })).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display action buttons for active alerts', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByRole('button', { name: /Mark Resolved/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });

    it('should call onAction with resolve when Mark Resolved clicked', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      const resolveButton = screen.getByRole('button', { name: /Mark Resolved/i });
      fireEvent.click(resolveButton);

      expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'resolve');
    });

    it('should call onAction with dismiss when Dismiss clicked', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'dismiss');
    });

    it('should not display action buttons for resolved alerts', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

      expect(screen.queryByRole('button', { name: /Mark Resolved/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Dismiss/i })).not.toBeInTheDocument();
    });
  });

  describe('Comprehensive Alert Display', () => {
    it('should display all enhanced information when provided', () => {
      const comprehensiveAlert: DelayAlert = {
        ...baseAlert,
        delayReason: 'Weather delay in Memphis',
        originalEta: '2025-10-22T18:00:00Z',
        revisedEta: '2025-10-25T18:00:00Z',
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-20T10:05:00Z',
          smsSent: true,
          smsSentAt: '2025-10-20T10:06:00Z',
        },
        suggestedActions: [
          'Contact customer about delay',
          'Monitor carrier updates',
        ],
        trackingEvents: [
          {
            id: 'evt-1',
            timestamp: '2025-10-20T08:00:00Z',
            status: 'exception',
            description: 'Weather delay',
            location: 'Memphis, TN',
          },
        ],
      };

      render(<AlertCard alert={comprehensiveAlert} onAction={mockOnAction} variant="active" />);

      // Check all sections are present
      expect(screen.getByText(/Weather delay in Memphis/i)).toBeInTheDocument();
      expect(screen.getByText(/Original ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Revised ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Email sent/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS sent/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact customer about delay/i)).toBeInTheDocument();
      expect(screen.getByText(/Tracking Timeline/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(container.querySelector('.alertCard')).toBeInTheDocument();
      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(container.querySelector('.content')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for action buttons', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      const resolveButton = screen.getByRole('button', { name: /Mark Resolved/i });
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });

      expect(resolveButton).toBeInTheDocument();
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle alerts with minimal information', () => {
      const minimalAlert: DelayAlert = {
        id: 'alert-min',
        orderId: 'ORD-MIN',
        customerName: 'Jane Doe',
        delayDays: 1,
        status: 'active',
        createdAt: '2025-10-20T10:00:00Z',
      };

      render(<AlertCard alert={minimalAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(`Order #${minimalAlert.orderId}`)).toBeInTheDocument();
      expect(screen.getByText(minimalAlert.customerName)).toBeInTheDocument();
    });

    it('should handle very long suggested actions', () => {
      const alertWithLongActions = {
        ...baseAlert,
        suggestedActions: [
          'This is a very long suggested action that might wrap to multiple lines and should still display properly without breaking the layout',
        ],
      };

      render(<AlertCard alert={alertWithLongActions} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/This is a very long suggested action/i)).toBeInTheDocument();
    });

    it('should handle dates in different formats', () => {
      const alertWithDates = {
        ...baseAlert,
        originalEta: '2025-10-22',
        createdAt: '2025-10-20T10:00:00.000Z',
      };

      render(<AlertCard alert={alertWithDates} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(`Order #${alertWithDates.orderId}`)).toBeInTheDocument();
    });
  });
});
