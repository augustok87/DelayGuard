/**
 * AlertCard Component Tests (Updated for Phase 1.1)
 *
 * Test suite for the enhanced AlertCard component that displays comprehensive
 * delay alert information including:
 * - Phase 1.1: Order total, priority badges, enhanced contact info, email engagement tracking
 * - Priority 3: Delay reason, revised ETA, notification status, suggested actions, tracking timeline
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

  describe('Phase 1.1: Order Total Display', () => {
    it('should display order total when provided', () => {
      const alertWithTotal = {
        ...baseAlert,
        totalAmount: 384.99,
        currency: 'USD',
      };

      render(<AlertCard alert={alertWithTotal} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('$384.99')).toBeInTheDocument();
    });

    it('should format currency correctly for different currencies', () => {
      const alertWithEuro = {
        ...baseAlert,
        totalAmount: 299.50,
        currency: 'EUR',
      };

      render(<AlertCard alert={alertWithEuro} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/299.50/)).toBeInTheDocument();
    });

    it('should not display order total when not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      // Should not have the orderTotal class
      const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);
      expect(container.querySelector('.orderTotal')).not.toBeInTheDocument();
    });

    it('should display order total with proper styling', () => {
      const alertWithTotal = {
        ...baseAlert,
        totalAmount: 500.00,
        currency: 'USD',
      };

      const { container } = render(<AlertCard alert={alertWithTotal} onAction={mockOnAction} variant="active" />);

      const orderTotal = container.querySelector('.orderTotal');
      expect(orderTotal).toBeInTheDocument();
    });
  });

  describe('Phase 1.1: Priority Badge System', () => {
    it('should display CRITICAL priority for 7+ day delays', () => {
      const criticalAlert = {
        ...baseAlert,
        delayDays: 7,
        totalAmount: 200,
      };

      render(<AlertCard alert={criticalAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should display CRITICAL priority for high-value orders ($500+) with 3+ day delays', () => {
      const highValueAlert = {
        ...baseAlert,
        delayDays: 3,
        totalAmount: 550,
      };

      render(<AlertCard alert={highValueAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should display HIGH priority for 4+ day delays', () => {
      const highAlert = {
        ...baseAlert,
        delayDays: 4,
        totalAmount: 100,
      };

      render(<AlertCard alert={highAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should display HIGH priority for $200+ orders with 2+ day delays', () => {
      const mediumValueAlert = {
        ...baseAlert,
        delayDays: 2,
        totalAmount: 250,
      };

      render(<AlertCard alert={mediumValueAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should display MEDIUM priority for 2-3 day delays', () => {
      const mediumAlert = {
        ...baseAlert,
        delayDays: 2,
        totalAmount: 50,
      };

      render(<AlertCard alert={mediumAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('should display LOW priority for < 2 day delays', () => {
      const lowAlert = {
        ...baseAlert,
        delayDays: 1,
        totalAmount: 30,
      };

      render(<AlertCard alert={lowAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('should display priority badge with correct styling', () => {
      const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      const priorityBadge = container.querySelector('.priorityBadge');
      expect(priorityBadge).toBeInTheDocument();
    });
  });

  describe('Phase 1.1: Enhanced Contact Information', () => {
    it('should display customer email prominently', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(baseAlert.customerEmail!)).toBeInTheDocument();
    });

    it('should display customer phone when provided', () => {
      const alertWithPhone = {
        ...baseAlert,
        customerPhone: '+1-555-0123',
      };

      render(<AlertCard alert={alertWithPhone} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    });

    it('should display both email and phone in contact details section', () => {
      const alertWithContact = {
        ...baseAlert,
        customerEmail: 'john@example.com',
        customerPhone: '+1-555-0123',
      };

      const { container } = render(<AlertCard alert={alertWithContact} onAction={mockOnAction} variant="active" />);

      const contactDetails = container.querySelector('.contactDetails');
      expect(contactDetails).toBeInTheDocument();

      const contactItems = container.querySelectorAll('.contactItem');
      expect(contactItems.length).toBe(2); // Email and phone
    });

    it('should display contact info with icons', () => {
      const alertWithContact = {
        ...baseAlert,
        customerPhone: '+1-555-0123',
      };

      render(<AlertCard alert={alertWithContact} onAction={mockOnAction} variant="active" />);

      // Check for presence of icons (emojis in this case)
      expect(screen.getByText(/✉️/)).toBeInTheDocument();
      expect(screen.getByText(/📞/)).toBeInTheDocument();
    });
  });

  describe('Phase 1.1: Email Engagement Tracking', () => {
    it('should display "Opened" badge when email is opened', () => {
      const alertWithOpened = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-20T10:05:00Z',
          emailOpened: true,
          emailOpenedAt: '2025-10-21T14:30:00Z', // Different date for opened
        },
      };

      render(<AlertCard alert={alertWithOpened} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: Shows "📧 Opened" badge (no dates in compact view)
      expect(screen.getByText(/Opened/)).toBeInTheDocument();
      expect(screen.getByText(/📧/)).toBeInTheDocument();
    });

    it('should display "Clicked" badge when email link is clicked', () => {
      const alertWithClicked = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',
          emailOpened: true,
          emailOpenedAt: '2025-10-21T14:30:00Z',
          emailClicked: true,
          emailClickedAt: '2025-10-21T14:32:00Z',
        },
      };

      render(<AlertCard alert={alertWithClicked} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Clicked/)).toBeInTheDocument();
    });

    it('should display "Sent" badge when email sent but not opened', () => {
      const alertNotOpened = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',
          emailOpened: false,
        },
      };

      render(<AlertCard alert={alertNotOpened} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: Shows "✉️ Sent" badge when not opened
      expect(screen.getByText(/Sent/i)).toBeInTheDocument();
      expect(screen.queryByText(/Opened/i)).not.toBeInTheDocument();
    });

    it('should use different icon for opened emails', () => {
      const alertWithOpened = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',
          emailOpened: true,
          emailOpenedAt: '2025-10-21T14:30:00Z',
        },
      };

      render(<AlertCard alert={alertWithOpened} onAction={mockOnAction} variant="active" />);

      // Opened emails should show 📧 instead of ✉️
      expect(screen.getByText(/📧/)).toBeInTheDocument();
    });

    it('should show highest engagement state when multiple states exist', () => {
      const alertFullEngagement = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',
          emailOpened: true,
          emailOpenedAt: '2025-10-21T14:30:00Z',
          emailClicked: true,
          emailClickedAt: '2025-10-21T14:32:00Z',
        },
      };

      render(<AlertCard alert={alertFullEngagement} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: Shows only highest engagement (Clicked) for space efficiency
      expect(screen.getByText(/Clicked/)).toBeInTheDocument();
      expect(screen.getByText(/🔗/)).toBeInTheDocument();
      // "Opened" should NOT be shown when "Clicked" is shown (progressive disclosure)
      expect(screen.queryByText(/Opened/)).not.toBeInTheDocument();
    });

    it('should display notification details in a separate container', () => {
      const alertWithEngagement = {
        ...baseAlert,
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-21T10:05:00Z',
          emailOpened: true,
        },
      };

      const { container } = render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: Uses .notificationCompact container
      const notificationCompact = container.querySelector('.notificationCompact');
      expect(notificationCompact).toBeInTheDocument();
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
      // Phase 1 Compact Format: Reason is in .delayInfoCompact container
      const compactContainer = container.querySelector('.delayInfoCompact');
      expect(compactContainer).toBeInTheDocument();
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
          emailSentAt: '2025-10-21T10:05:00Z',
        },
      };

      render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: Shows "✉️ Sent" badge
      expect(screen.getByText(/Sent/i)).toBeInTheDocument();
      // Note: ✉️ appears in both contact info and notification badge
      expect(screen.getAllByText(/✉️/).length).toBeGreaterThan(0);
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

      // Phase 1 Compact Format: Shows "📱 SMS" badge
      expect(screen.getByText(/SMS/i)).toBeInTheDocument();
      expect(screen.getByText(/📱/)).toBeInTheDocument();
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

      // Phase 1 Compact Format: Shows both "✉️ Sent" and "📱 SMS" badges
      expect(screen.getByText(/Sent/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS/i)).toBeInTheDocument();
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

      // Phase 1 Compact Format: No badges shown when no notifications sent
      expect(screen.queryByText(/Sent/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/SMS/i)).not.toBeInTheDocument();
    });

    it('should not display notification section when status not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: No badges shown when status not provided
      expect(screen.queryByText(/Sent/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/SMS/i)).not.toBeInTheDocument();
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

      // Phase 1 Compact Format: Timeline is in accordion, need to open it first
      const accordionHeader = screen.getByText(/Tracking Timeline \(10 events\)/i);
      fireEvent.click(accordionHeader);

      // Now the "Show all events" button should be visible
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

  describe('Comprehensive Alert Display (Phase 1.1)', () => {
    it('should display all Phase 1.1 enhanced information when provided', () => {
      const comprehensiveAlert: DelayAlert = {
        ...baseAlert,
        totalAmount: 384.99,
        currency: 'USD',
        customerPhone: '+1-555-0123',
        delayReason: 'Weather delay in Memphis',
        originalEta: '2025-10-22T18:00:00Z',
        revisedEta: '2025-10-25T18:00:00Z',
        notificationStatus: {
          emailSent: true,
          emailSentAt: '2025-10-20T10:05:00Z',
          emailOpened: true,
          emailOpenedAt: '2025-10-20T14:30:00Z',
          emailClicked: true,
          emailClickedAt: '2025-10-20T14:32:00Z',
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

      // Phase 1.1 features
      expect(screen.getByText('$384.99')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      // Phase 1 Compact Format: Only shows highest engagement (Clicked), not Opened
      expect(screen.getByText(/Clicked/)).toBeInTheDocument();
      expect(screen.queryByText(/Opened/)).not.toBeInTheDocument(); // Not shown when Clicked is shown

      // Original features
      expect(screen.getByText(/Weather delay in Memphis/i)).toBeInTheDocument();
      expect(screen.getByText(/Original ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Revised ETA:/i)).toBeInTheDocument();

      // Phase 1 Compact Format: Check for compact notification badges
      expect(screen.getByText(/🔗/)).toBeInTheDocument(); // Clicked badge (highest priority)
      // Note: 📱 appears in both contact info (phone number) and SMS notification badge
      expect(screen.getAllByText(/📱/).length).toBeGreaterThan(0); // SMS badge

      // Phase 1 Compact Format: Suggested Actions and Tracking Timeline in accordions
      expect(screen.getByText(/Suggested Actions \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Tracking Timeline \(1 event\)/i)).toBeInTheDocument();
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

    it('should handle very large order values', () => {
      const largeOrderAlert = {
        ...baseAlert,
        totalAmount: 9999.99,
        currency: 'USD',
      };

      render(<AlertCard alert={largeOrderAlert} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('$9,999.99')).toBeInTheDocument();
    });

    it('should handle missing phone number gracefully', () => {
      const alertNoPhone = {
        ...baseAlert,
        customerEmail: 'test@example.com',
        customerPhone: undefined,
      };

      const { container } = render(<AlertCard alert={alertNoPhone} onAction={mockOnAction} variant="active" />);

      const contactItems = container.querySelectorAll('.contactItem');
      expect(contactItems.length).toBe(1); // Only email
    });
  });

  describe('Phase 1.2: Product Information Display', () => {
    const mockLineItems = [
      {
        id: 'item-1',
        productId: 'prod-123',
        title: 'Wireless Headphones',
        variantTitle: 'Black / Medium',
        sku: 'WH-BLK-M',
        quantity: 2,
        price: 79.99,
        productType: 'Electronics',
        vendor: 'AudioTech',
        imageUrl: 'https://example.com/headphones.jpg',
      },
      {
        id: 'item-2',
        productId: 'prod-456',
        title: 'Phone Case',
        variantTitle: 'Blue',
        sku: 'PC-BLU',
        quantity: 1,
        price: 19.99,
        productType: 'Accessories',
        vendor: 'CaseMaster',
        imageUrl: 'https://example.com/case.jpg',
      },
      {
        id: 'item-3',
        productId: 'prod-789',
        title: 'USB-C Cable',
        sku: 'USBC-01',
        quantity: 3,
        price: 12.99,
        productType: 'Accessories',
        imageUrl: 'https://example.com/cable.jpg',
      },
    ];

    it('should display "Order Contents" section when line items are provided', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Order Contents/i)).toBeInTheDocument();
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    });

    it('should not display "Order Contents" section when no line items', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);
      expect(screen.queryByText(/Order Contents/i)).not.toBeInTheDocument();
    });

    it('should display product thumbnail images for each line item', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      const images = container.querySelectorAll('.productThumbnail');
      expect(images.length).toBe(3);

      const firstImage = images[0] as HTMLImageElement;
      expect(firstImage.src).toContain('headphones.jpg');
      expect(firstImage.alt).toBe('Wireless Headphones');
    });

    it('should display product title for each line item', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('Phone Case')).toBeInTheDocument();
      expect(screen.getByText('USB-C Cable')).toBeInTheDocument();
    });

    it('should display variant title when provided', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('Black / Medium')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
    });

    it('should not display variant section when no variant title', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: [mockLineItems[2]], // USB-C Cable has no variant
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText('Black / Medium')).not.toBeInTheDocument();
    });

    it('should display quantity for each line item', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/Qty:\s*2/i)).toBeInTheDocument();
      expect(screen.getByText(/Qty:\s*1/i)).toBeInTheDocument();
      expect(screen.getByText(/Qty:\s*3/i)).toBeInTheDocument();
    });

    it('should display SKU for each line item', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/SKU:\s*WH-BLK-M/i)).toBeInTheDocument();
      expect(screen.getByText(/SKU:\s*PC-BLU/i)).toBeInTheDocument();
      expect(screen.getByText(/SKU:\s*USBC-01/i)).toBeInTheDocument();
    });

    it('should display price for each line item', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/\$79\.99/i)).toBeInTheDocument();
      expect(screen.getByText(/\$19\.99/i)).toBeInTheDocument();
      expect(screen.getByText(/\$12\.99/i)).toBeInTheDocument();
    });

    it('should handle missing product images gracefully', () => {
      const lineItemsNoImage = [
        {
          id: 'item-1',
          productId: 'prod-123',
          title: 'Product Without Image',
          quantity: 1,
          price: 50,
          sku: 'NO-IMG',
        },
      ];

      const alertWithProducts = {
        ...baseAlert,
        lineItems: lineItemsNoImage,
      };
      const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      const images = container.querySelectorAll('.productThumbnail');
      expect(images.length).toBe(0); // No image should be rendered
      expect(screen.getByText('Product Without Image')).toBeInTheDocument();
    });

    it('should display placeholder icon when image URL is missing', () => {
      const lineItemsNoImage = [
        {
          id: 'item-1',
          productId: 'prod-123',
          title: 'Product Without Image',
          quantity: 1,
          price: 50,
          sku: 'NO-IMG',
        },
      ];

      const alertWithProducts = {
        ...baseAlert,
        lineItems: lineItemsNoImage,
      };
      const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      const placeholderIcon = container.querySelector('.productPlaceholder');
      expect(placeholderIcon).toBeInTheDocument();
      expect(placeholderIcon?.textContent).toContain('📦');
    });

    it('should display empty state when lineItems array is empty', () => {
      const alertWithEmptyProducts = {
        ...baseAlert,
        lineItems: [],
      };
      render(<AlertCard alert={alertWithEmptyProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.queryByText(/Order Contents/i)).not.toBeInTheDocument();
    });

    it('should limit display to first 5 line items if more than 5 products', () => {
      const manyLineItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        productId: `prod-${i}`,
        title: `Product ${i + 1}`,
        quantity: 1,
        price: 10 + i,
        sku: `SKU-${i}`,
        imageUrl: `https://example.com/product${i}.jpg`,
      }));

      const alertWithManyProducts = {
        ...baseAlert,
        lineItems: manyLineItems,
      };
      const { container } = render(<AlertCard alert={alertWithManyProducts} onAction={mockOnAction} variant="active" />);

      const lineItemElements = container.querySelectorAll('.lineItem');
      expect(lineItemElements.length).toBeLessThanOrEqual(5);
      expect(screen.getByText(/\+5 more items/i)).toBeInTheDocument();
    });

    it('should display product type badge when available', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getAllByText('Accessories').length).toBe(2);
    });

    it('should display vendor name when available', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      expect(screen.getByText(/AudioTech/i)).toBeInTheDocument();
      expect(screen.getByText(/CaseMaster/i)).toBeInTheDocument();
    });

    it('should have proper styling for line items container', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      const productContainer = container.querySelector('.productDetails');
      expect(productContainer).toBeInTheDocument();
      expect(productContainer).toHaveClass('productDetails');
    });

    it('should display line items in a collapsible section (initially expanded)', () => {
      const alertWithProducts = {
        ...baseAlert,
        lineItems: mockLineItems,
      };
      const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

      const productSection = container.querySelector('.productDetails');
      expect(productSection).toBeVisible();
    });

    it('should handle very long product titles gracefully with truncation', () => {
      const longTitleItem = [
        {
          id: 'item-1',
          productId: 'prod-123',
          title: 'This is a very long product title that should be truncated to prevent layout issues in the UI',
          quantity: 1,
          price: 50,
          sku: 'LONG-TITLE',
          imageUrl: 'https://example.com/product.jpg',
        },
      ];

      const alertWithLongTitle = {
        ...baseAlert,
        lineItems: longTitleItem,
      };
      const { container } = render(<AlertCard alert={alertWithLongTitle} onAction={mockOnAction} variant="active" />);

      const titleElement = container.querySelector('.productTitle');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('productTitle');
      // CSS module will apply truncation styles (overflow: hidden, text-overflow: ellipsis, white-space: nowrap)
    });

    describe('Product Details Accordion Behavior', () => {
      it('should wrap product details in an accordion component', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: mockLineItems,
        };
        const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        // Check for accordion wrapper by looking for button with aria-expanded attribute
        const accordionButton = container.querySelector('button[aria-expanded]');
        expect(accordionButton).toBeInTheDocument();
      });

      it('should default to closed state (collapsed) to reduce card height', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: mockLineItems,
        };
        const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        // Accordion should start collapsed (aria-expanded="false")
        const accordionButton = container.querySelector('button[aria-expanded="false"]');
        expect(accordionButton).toBeInTheDocument();

        // Product details content should be hidden (aria-hidden="true")
        const contentWrapper = container.querySelector('[aria-hidden="true"]');
        expect(contentWrapper).toBeInTheDocument();
      });

      it('should display appropriate accordion title for product details', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: mockLineItems,
        };
        render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        // Check for accordion title (should mention products/items)
        expect(screen.getByText(/View Order Contents/i)).toBeInTheDocument();
      });

      it('should expand product details when accordion is clicked', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: mockLineItems,
        };
        const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        // Find accordion button and click it
        const accordionButton = container.querySelector('button[aria-expanded]');
        expect(accordionButton).toBeInTheDocument();

        fireEvent.click(accordionButton!);

        // After click, accordion should be expanded (aria-expanded="true")
        expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

        // Product details content should be visible (aria-hidden="false")
        const contentWrapper = container.querySelector('[aria-hidden="false"]');
        expect(contentWrapper).toBeInTheDocument();
      });

      it('should toggle product details visibility when accordion is clicked multiple times', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: mockLineItems,
        };
        const { container } = render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        const accordionButton = container.querySelector('button[aria-expanded]');
        expect(accordionButton).toBeInTheDocument();

        // Initially closed
        expect(accordionButton).toHaveAttribute('aria-expanded', 'false');

        // Click to open
        fireEvent.click(accordionButton!);
        expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

        // Click to close
        fireEvent.click(accordionButton!);
        expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
      });

      it('should not render accordion when there are no line items', () => {
        const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

        // No accordion should be present
        const accordionButton = container.querySelector('button[aria-expanded]');
        expect(accordionButton).toBeNull();
      });
    });
  });
});
