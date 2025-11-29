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

      const { container } = render(<AlertCard alert={alertWithContact} onAction={mockOnAction} variant="active" />);

      // v1.33: Check for SVG icons (Mail and Phone) instead of emojis
      const contactIcons = container.querySelectorAll('.contactIcon svg');
      expect(contactIcons.length).toBe(2); // Email icon and Phone icon

      // Verify both icons are SVG elements
      contactIcons.forEach(icon => {
        expect(icon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });
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

      const { container } = render(<AlertCard alert={alertWithOpened} onAction={mockOnAction} variant="active" />);

      // v1.33: Shows "Read" badge with MailOpen SVG icon (multiple instances due to legend)
      expect(screen.getAllByText(/Read/).length).toBeGreaterThanOrEqual(1);

      // Check for MailOpen SVG icons (in both badge and legend)
      const mailOpenIcons = container.querySelectorAll('svg');
      const hasSvgIcons = mailOpenIcons.length > 0;
      expect(hasSvgIcons).toBe(true);
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

      // Phase A: Multiple "Engaged" instances due to legend
      expect(screen.getAllByText(/Engaged/).length).toBeGreaterThanOrEqual(1);
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

      // Phase A: Shows "✉️ Delivered" badge when not opened (multiple due to legend)
      expect(screen.getAllByText(/Delivered/i).length).toBeGreaterThanOrEqual(1);
      // "Read" appears in legend (and possibly elsewhere due to badge examples)
      const readElements = screen.getAllByText(/Read/i);
      expect(readElements.length).toBeGreaterThanOrEqual(1);
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

      const { container } = render(<AlertCard alert={alertWithOpened} onAction={mockOnAction} variant="active" />);

      // v1.33: Opened emails show MailOpen SVG icon (multiple due to legend)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
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

      const { container } = render(<AlertCard alert={alertFullEngagement} onAction={mockOnAction} variant="active" />);

      // v1.33: Shows only highest engagement (Engaged) with Link SVG icon in status, plus legend
      const engagedElements = screen.getAllByText(/Engaged/);
      expect(engagedElements.length).toBeGreaterThanOrEqual(1);

      // Check for Link SVG icons (in both badge and legend)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
      // "Read" appears in legend but not in notification status (progressive disclosure)
      const readElements = screen.getAllByText(/Read/);
      expect(readElements.length).toBe(1); // Only in legend
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

      const { container } = render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      // v1.33: Shows "Delivered" badge with Send SVG icon (multiple instances due to legend)
      expect(screen.getAllByText(/Delivered/i).length).toBeGreaterThanOrEqual(1);

      // Check for SVG icons (Mail in contact info + Send in notification badge)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });

    it('should display SMS sent status', () => {
      const alertWithNotification = {
        ...baseAlert,
        notificationStatus: {
          smsSent: true,
          smsSentAt: '2025-10-20T10:05:00Z',
        },
      };

      const { container } = render(<AlertCard alert={alertWithNotification} onAction={mockOnAction} variant="active" />);

      // v1.33: Shows "SMS" badge with Smartphone SVG icon (multiple instances due to legend)
      expect(screen.getAllByText(/SMS/i).length).toBeGreaterThanOrEqual(1);

      // Check for Smartphone SVG icons (in both badge and legend)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
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

      // Phase A: Shows both "✉️ Delivered" and "📱 SMS" badges (multiple instances due to legend)
      expect(screen.getAllByText(/Delivered/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/SMS/i).length).toBeGreaterThanOrEqual(1);
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
      expect(screen.queryByText(/Delivered/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/SMS/i)).not.toBeInTheDocument();
    });

    it('should not display notification section when status not provided', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

      // Phase 1 Compact Format: No badges shown when status not provided
      expect(screen.queryByText(/Delivered/i)).not.toBeInTheDocument();
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

    it('should display action buttons for resolved alerts (v1.30 update)', () => {
      render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

      // v1.30: Resolved alerts now show Reopen and Dismiss buttons (Option 1 - Full Flexibility)
      expect(screen.queryByRole('button', { name: /Reopen/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Dismiss/i })).toBeInTheDocument();

      // Should NOT show Mark Resolved button (already resolved)
      expect(screen.queryByRole('button', { name: /Mark Resolved/i })).not.toBeInTheDocument();
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

      const { container } = render(<AlertCard alert={comprehensiveAlert} onAction={mockOnAction} variant="active" />);

      // Phase 1.1 features
      expect(screen.getByText('$384.99')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      // Phase A: Shows highest engagement (Engaged) in status, plus legend
      expect(screen.getAllByText(/Engaged/).length).toBeGreaterThanOrEqual(1);
      // "Read" appears in legend (and possibly elsewhere due to badge examples)
      const readElements = screen.getAllByText(/Read/);
      expect(readElements.length).toBeGreaterThanOrEqual(1);

      // Original features
      expect(screen.getByText(/Weather delay in Memphis/i)).toBeInTheDocument();
      expect(screen.getByText(/Original ETA:/i)).toBeInTheDocument();
      expect(screen.getByText(/Revised ETA:/i)).toBeInTheDocument();

      // v1.33: Check for engagement SVG icons (multiple due to legend)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0); // Link (Engaged) + Smartphone (SMS) + other icons

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

      // v1.33: Check for Package SVG icon instead of emoji
      const packageIcon = placeholderIcon?.querySelector('svg');
      expect(packageIcon).toBeInTheDocument();
      expect(packageIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
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

  describe('v1.29: Priority-Based Color Coding', () => {
    it('should render CRITICAL alert with critical priority variant class', () => {
      const criticalAlert = {
        ...baseAlert,
        delayDays: 7,
        totalAmount: 300,
      };

      const { container } = render(<AlertCard alert={criticalAlert} onAction={mockOnAction} variant="active" />);

      // v1.29: CRITICAL alerts should have alertCardCritical class for red left border
      const card = container.querySelector('[class*="alertCardCritical"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('alertCardCritical');
    });

    it('should render HIGH alert with high priority variant class', () => {
      const highAlert = {
        ...baseAlert,
        delayDays: 4,
        totalAmount: 250,
      };

      const { container } = render(<AlertCard alert={highAlert} onAction={mockOnAction} variant="active" />);

      // v1.29: HIGH alerts should have alertCardHigh class for orange left border
      const card = container.querySelector('[class*="alertCardHigh"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('alertCardHigh');
    });

    it('should render MEDIUM alert with medium priority variant class', () => {
      const mediumAlert = {
        ...baseAlert,
        delayDays: 2,
        totalAmount: 100,
      };

      const { container } = render(<AlertCard alert={mediumAlert} onAction={mockOnAction} variant="active" />);

      // v1.29: MEDIUM alerts should have alertCardMedium class for amber left border
      const card = container.querySelector('[class*="alertCardMedium"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('alertCardMedium');
    });

    it('should render LOW alert with low priority variant class', () => {
      const lowAlert = {
        ...baseAlert,
        delayDays: 1,
        totalAmount: 50,
      };

      const { container } = render(<AlertCard alert={lowAlert} onAction={mockOnAction} variant="active" />);

      // v1.29: LOW alerts should have alertCardLow class for emerald left border
      const card = container.querySelector('[class*="alertCardLow"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('alertCardLow');
    });
  });

  describe('v1.30: Alert State Transitions (Option 1 - Full Flexibility)', () => {
    describe('Resolved Variant Actions', () => {
      it('should render "Reopen" and "Dismiss" buttons for resolved alerts', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

        // Resolved alerts should show Reopen and Dismiss buttons
        expect(getByText('Reopen')).toBeInTheDocument();
        expect(getByText('Dismiss')).toBeInTheDocument();

        // Should NOT show Mark Resolved button (already resolved)
        expect(() => getByText('Mark Resolved')).toThrow();
      });

      it('should call onAction with "reopen" when Reopen button is clicked', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

        const reopenButton = getByText('Reopen');
        fireEvent.click(reopenButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'reopen');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });

      it('should call onAction with "dismiss" when Dismiss button is clicked on resolved alert', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

        const dismissButton = getByText('Dismiss');
        fireEvent.click(dismissButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'dismiss');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });

      it('should render InfoTooltips for resolved alert action buttons', () => {
        const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);

        // Should have 2 InfoTooltip instances (one for each button)
        const tooltips = container.querySelectorAll('[class*="actionWithTooltip"]');
        expect(tooltips.length).toBe(2);
      });
    });

    describe('Dismissed Variant Actions', () => {
      it('should render "Reopen" and "Mark Resolved" buttons for dismissed alerts', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);

        // Dismissed alerts should show Reopen and Mark Resolved buttons
        expect(getByText('Reopen')).toBeInTheDocument();
        expect(getByText('Mark Resolved')).toBeInTheDocument();

        // Should NOT show Dismiss button (already dismissed)
        expect(() => getByText('Dismiss')).toThrow();
      });

      it('should call onAction with "reopen" when Reopen button is clicked on dismissed alert', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);

        const reopenButton = getByText('Reopen');
        fireEvent.click(reopenButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'reopen');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });

      it('should call onAction with "resolve" when Mark Resolved button is clicked on dismissed alert', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);

        const resolveButton = getByText('Mark Resolved');
        fireEvent.click(resolveButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'resolve');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });

      it('should render InfoTooltips for dismissed alert action buttons', () => {
        const { container } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);

        // Should have 2 InfoTooltip instances (one for each button)
        const tooltips = container.querySelectorAll('[class*="actionWithTooltip"]');
        expect(tooltips.length).toBe(2);
      });
    });

    describe('Active Variant Actions (Existing Functionality)', () => {
      it('should still render "Mark Resolved" and "Dismiss" buttons for active alerts', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

        // Active alerts should show Mark Resolved and Dismiss buttons (existing)
        expect(getByText('Mark Resolved')).toBeInTheDocument();
        expect(getByText('Dismiss')).toBeInTheDocument();

        // Should NOT show Reopen button (already active)
        expect(() => getByText('Reopen')).toThrow();
      });

      it('should call onAction with "resolve" when Mark Resolved button is clicked on active alert', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

        const resolveButton = getByText('Mark Resolved');
        fireEvent.click(resolveButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'resolve');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });

      it('should call onAction with "dismiss" when Dismiss button is clicked on active alert', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);

        const dismissButton = getByText('Dismiss');
        fireEvent.click(dismissButton);

        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'dismiss');
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });
    });

    describe('Full State Transition Coverage', () => {
      it('should support Active → Resolved transition', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);
        fireEvent.click(getByText('Mark Resolved'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'resolve');
      });

      it('should support Active → Dismissed transition', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />);
        fireEvent.click(getByText('Dismiss'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'dismiss');
      });

      it('should support Resolved → Active transition (Reopen)', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);
        fireEvent.click(getByText('Reopen'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'reopen');
      });

      it('should support Resolved → Dismissed transition', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);
        fireEvent.click(getByText('Dismiss'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'dismiss');
      });

      it('should support Dismissed → Active transition (Reopen)', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);
        fireEvent.click(getByText('Reopen'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'reopen');
      });

      it('should support Dismissed → Resolved transition', () => {
        const { getByText } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);
        fireEvent.click(getByText('Mark Resolved'));
        expect(mockOnAction).toHaveBeenCalledWith(baseAlert.id, 'resolve');
      });
    });

    describe('Button Styling and Variants', () => {
      it('should render Reopen button with primary variant for resolved alerts', () => {
        const { getByRole } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);
        const reopenButton = getByRole('button', { name: /Reopen/i });

        // Button should exist and be clickable
        expect(reopenButton).toBeInTheDocument();
        expect(reopenButton.tagName).toBe('BUTTON');
      });

      it('should render Reopen button with primary variant for dismissed alerts', () => {
        const { getByRole } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);
        const reopenButton = getByRole('button', { name: /Reopen/i });

        // Button should exist and be clickable
        expect(reopenButton).toBeInTheDocument();
        expect(reopenButton.tagName).toBe('BUTTON');
      });

      it('should render Dismiss button with secondary variant for resolved alerts', () => {
        const { getByRole } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="resolved" />);
        const dismissButton = getByRole('button', { name: /Dismiss/i });

        // Button should exist and be clickable
        expect(dismissButton).toBeInTheDocument();
        expect(dismissButton.tagName).toBe('BUTTON');
      });

      it('should render Mark Resolved button with success variant for dismissed alerts', () => {
        const { getByRole } = render(<AlertCard alert={baseAlert} onAction={mockOnAction} variant="dismissed" />);
        const resolveButton = getByRole('button', { name: /Mark Resolved/i });

        // Button should exist and be clickable
        expect(resolveButton).toBeInTheDocument();
        expect(resolveButton.tagName).toBe('BUTTON');
      });
    });
  });

  describe('v1.33: Lucide Icon Integration - All Remaining Icons', () => {
    describe('Delay Reason Warning Icon', () => {
      it('should render SVG icon instead of emoji for delay reason warning', () => {
        const alertWithReason = {
          ...baseAlert,
          delayReason: 'Weather delay in transit',
        };
        const { container } = render(
          <AlertCard alert={alertWithReason} onAction={mockOnAction} variant="active" />,
        );

        // Delay warning icon is in delayDaysInline (before "X days delay" text)
        const delayDaysSection = container.querySelector('[class*="delayDaysInline"]');
        const warningIcon = delayDaysSection?.querySelector('svg');
        expect(warningIcon).toBeInTheDocument();
        expect(warningIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });

      it('should not contain emoji in delay reason text', () => {
        const alertWithReason = {
          ...baseAlert,
          delayReason: 'Weather delay in transit',
        };
        const { container } = render(
          <AlertCard alert={alertWithReason} onAction={mockOnAction} variant="active" />,
        );

        const delayInfoSection = container.querySelector('[class*="delayInfo"]');
        // Should NOT contain warning emoji ⚠️
        expect(delayInfoSection?.textContent).not.toContain('⚠️');
        expect(delayInfoSection?.textContent).not.toContain('⚠');
      });

      it('should have aria-hidden="true" on delay reason warning icon', () => {
        const alertWithReason = {
          ...baseAlert,
          delayReason: 'Weather delay in transit',
        };
        const { container } = render(
          <AlertCard alert={alertWithReason} onAction={mockOnAction} variant="active" />,
        );

        const delayDaysSection = container.querySelector('[class*="delayDaysInline"]');
        const warningIcon = delayDaysSection?.querySelector('svg');
        expect(warningIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('Email Engagement Badge Icons', () => {
      it('should render SVG icon for "Engaged" badge (link clicked)', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: {
            emailOpened: true,
            emailClicked: true,
          },
        };
        render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

        // Find the "Engaged" badge
        const engagedBadge = screen.getByText('Engaged').closest('[class*="badge"]');
        const icon = engagedBadge?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon for "Read" badge (email opened)', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: {
            emailOpened: true,
          },
        };
        render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

        // Find the "Read" badge
        const readBadge = screen.getByText('Read').closest('[class*="badge"]');
        const icon = readBadge?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon for "Delivered" badge (email sent)', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: {
            emailSent: true,
          },
        };
        render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

        // Find the "Delivered" badge - use notificationBadgeCompact class (text appears multiple times in legend too)
        const deliveredBadges = screen.getAllByText('Delivered');
        const deliveredBadge = deliveredBadges[0].closest('[class*="notificationBadge"]');
        const icon = deliveredBadge?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon for "SMS" badge', () => {
        const alertWithSms = {
          ...baseAlert,
          notificationStatus: {
            smsSent: true,
          },
        };
        render(<AlertCard alert={alertWithSms} onAction={mockOnAction} variant="active" />);

        // Find the "SMS" badge - use notificationBadgeCompact class (text appears multiple times in legend too)
        const smsBadges = screen.getAllByText('SMS');
        const smsBadge = smsBadges[0].closest('[class*="notificationBadge"]');
        const icon = smsBadge?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should not contain emoji in engagement badges', () => {
        const alertWithAll = {
          ...baseAlert,
          notificationStatus: {
            emailSent: true,
            emailOpened: true,
            emailClicked: true,
            smsSent: true,
          },
        };
        const { container } = render(
          <AlertCard alert={alertWithAll} onAction={mockOnAction} variant="active" />,
        );

        // Check all badges for emoji - use notificationBadgeCompact class
        const badges = container.querySelectorAll('[class*="notificationBadge"]');
        badges.forEach(badge => {
          expect(badge.textContent).not.toContain('🔗'); // Engaged
          expect(badge.textContent).not.toContain('📧'); // Read
          expect(badge.textContent).not.toContain('✉️'); // Delivered
          expect(badge.textContent).not.toContain('📱'); // SMS
        });
      });

      it('should have aria-hidden="true" on all engagement badge icons', () => {
        const alertWithAll = {
          ...baseAlert,
          notificationStatus: {
            emailSent: true,
            emailOpened: true,
            emailClicked: true,
            smsSent: true,
          },
        };
        const { container } = render(
          <AlertCard alert={alertWithAll} onAction={mockOnAction} variant="active" />,
        );

        const badgeIcons = container.querySelectorAll('[class*="notificationBadge"] svg');
        badgeIcons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });

    describe('Accordion Title Icons', () => {
      it('should render SVG icon in "View Order Contents" accordion title', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: [
            {
              id: 'line-1',
              productId: 'prod-1',
              title: 'Wireless Headphones',
              quantity: 2,
              price: 49.99,
            },
          ],
        };
        render(<AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />);

        // Accordion title should contain SVG icon (Package)
        const accordionTitle = screen.getByText(/View Order Contents/i);
        const icon = accordionTitle.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon in "Suggested Actions" accordion title', () => {
        const alertWithActions = {
          ...baseAlert,
          suggestedActions: ['Contact customer', 'Issue refund'],
        };
        render(<AlertCard alert={alertWithActions} onAction={mockOnAction} variant="active" />);

        // Accordion title should contain SVG icon (Lightbulb)
        const accordionTitle = screen.getByText(/Suggested Actions/i);
        const icon = accordionTitle.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon in "Tracking Timeline" accordion title', () => {
        const alertWithEvents: DelayAlert = {
          ...baseAlert,
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Package picked up',
              location: 'New York, NY',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        render(<AlertCard alert={alertWithEvents} onAction={mockOnAction} variant="active" />);

        // Accordion title should contain SVG icon (Truck)
        const accordionTitle = screen.getByText(/Tracking Timeline/i);
        const icon = accordionTitle.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should render SVG icon in "Badge Legend" accordion title', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: { emailSent: true },
        };
        render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

        // Accordion title should contain SVG icon (BookOpen)
        const accordionTitle = screen.getByText(/What do these badges mean/i);
        const icon = accordionTitle.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should not contain emoji in accordion titles', () => {
        const alertWithAll: DelayAlert = {
          ...baseAlert,
          lineItems: [{ id: 'line-1', productId: 'prod-1', title: 'Product', quantity: 1, price: 10 }],
          suggestedActions: ['Action 1'],
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Event',
              location: 'NYC',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
          notificationStatus: { emailSent: true },
        };
        render(<AlertCard alert={alertWithAll} onAction={mockOnAction} variant="active" />);

        // Check accordion titles for emoji
        const orderContents = screen.getByText(/View Order Contents/i);
        const suggestedActions = screen.getByText(/Suggested Actions/i);
        const trackingTimeline = screen.getByText(/Tracking Timeline/i);
        const badgeLegend = screen.getByText(/What do these badges mean/i);

        expect(orderContents.textContent).not.toContain('📦');
        expect(suggestedActions.textContent).not.toContain('💡');
        expect(trackingTimeline.textContent).not.toContain('🚚');
        expect(badgeLegend.textContent).not.toContain('📖');
      });

      it('should have aria-hidden="true" on all accordion title icons', () => {
        const alertWithAll: DelayAlert = {
          ...baseAlert,
          lineItems: [{ id: 'line-1', productId: 'prod-1', title: 'Product', quantity: 1, price: 10 }],
          suggestedActions: ['Action 1'],
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Event',
              location: 'NYC',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
          notificationStatus: { emailSent: true },
        };
        const { container } = render(
          <AlertCard alert={alertWithAll} onAction={mockOnAction} variant="active" />,
        );

        // All accordion title icons should have aria-hidden
        const accordionIcons = container.querySelectorAll('summary svg, [role="button"] svg');
        accordionIcons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });

    describe('Product Placeholder Icon', () => {
      it('should render SVG icon for product placeholder (no image)', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: [
            {
              id: 'line-1',
              productId: 'prod-1',
              title: 'Wireless Headphones',
              quantity: 2,
              price: 49.99,
              // No imageUrl - should show placeholder
            },
          ],
        };
        const { container } = render(
          <AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />,
        );

        // Product placeholder should have SVG icon (Package)
        const placeholder = container.querySelector('[class*="productPlaceholder"]');
        const icon = placeholder?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should not contain emoji in product placeholder', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: [
            {
              id: 'line-1',
              productId: 'prod-1',
              title: 'Product',
              quantity: 1,
              price: 10,
            },
          ],
        };
        const { container } = render(
          <AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />,
        );

        const placeholder = container.querySelector('[class*="productPlaceholder"]');
        // Should NOT contain package emoji 📦
        expect(placeholder?.textContent).not.toContain('📦');
      });

      it('should have aria-hidden="true" on product placeholder icon', () => {
        const alertWithProducts = {
          ...baseAlert,
          lineItems: [
            {
              id: 'line-1',
              productId: 'prod-1',
              title: 'Product',
              quantity: 1,
              price: 10,
            },
          ],
        };
        const { container } = render(
          <AlertCard alert={alertWithProducts} onAction={mockOnAction} variant="active" />,
        );

        const placeholder = container.querySelector('[class*="productPlaceholder"]');
        const icon = placeholder?.querySelector('svg');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('Tracking Event Location Icon', () => {
      it('should render SVG icon for event location', () => {
        const alertWithEvents: DelayAlert = {
          ...baseAlert,
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Package picked up',
              location: 'New York, NY',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={alertWithEvents} onAction={mockOnAction} variant="active" />,
        );

        // Event location should have SVG icon (MapPin)
        const eventLocation = container.querySelector('[class*="eventLocation"]');
        const icon = eventLocation?.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });

      it('should not contain emoji in event location', () => {
        const alertWithEvents: DelayAlert = {
          ...baseAlert,
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Package picked up',
              location: 'New York, NY',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={alertWithEvents} onAction={mockOnAction} variant="active" />,
        );

        const eventLocation = container.querySelector('[class*="eventLocation"]');
        // Should NOT contain pin emoji 📍
        expect(eventLocation?.textContent).not.toContain('📍');
      });

      it('should have aria-hidden="true" on event location icon', () => {
        const alertWithEvents: DelayAlert = {
          ...baseAlert,
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Package picked up',
              location: 'New York, NY',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={alertWithEvents} onAction={mockOnAction} variant="active" />,
        );

        const eventLocation = container.querySelector('[class*="eventLocation"]');
        const icon = eventLocation?.querySelector('svg');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('Contact Information Icons', () => {
      it('should render SVG icon for email contact', () => {
        const { container } = render(
          <AlertCard alert={baseAlert} onAction={mockOnAction} variant="active" />,
        );

        // Email contact should have SVG icon (Mail)
        const contactIcons = container.querySelectorAll('[class*="contactIcon"]');
        const emailIcon = Array.from(contactIcons).find(icon =>
          icon.closest('[class*="contactDetail"]')?.textContent?.includes(baseAlert.customerEmail || ''),
        );
        const svg = emailIcon?.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      it('should render SVG icon for phone contact', () => {
        const alertWithPhone = {
          ...baseAlert,
          customerPhone: '+1-555-1234',
        };
        const { container } = render(
          <AlertCard alert={alertWithPhone} onAction={mockOnAction} variant="active" />,
        );

        // Phone contact should have SVG icon (Phone)
        const contactIcons = container.querySelectorAll('[class*="contactIcon"]');
        const phoneIcon = Array.from(contactIcons).find(icon =>
          icon.closest('[class*="contactDetail"]')?.textContent?.includes(alertWithPhone.customerPhone!),
        );
        const svg = phoneIcon?.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      it('should not contain emoji in contact icons', () => {
        const alertWithPhone = {
          ...baseAlert,
          customerPhone: '+1-555-1234',
        };
        const { container } = render(
          <AlertCard alert={alertWithPhone} onAction={mockOnAction} variant="active" />,
        );

        const contactIcons = container.querySelectorAll('[class*="contactIcon"]');
        contactIcons.forEach(icon => {
          expect(icon.textContent).not.toContain('✉️'); // Email
          expect(icon.textContent).not.toContain('📞'); // Phone
        });
      });

      it('should have aria-hidden="true" on contact icons', () => {
        const alertWithPhone = {
          ...baseAlert,
          customerPhone: '+1-555-1234',
        };
        const { container } = render(
          <AlertCard alert={alertWithPhone} onAction={mockOnAction} variant="active" />,
        );

        const contactIconSvgs = container.querySelectorAll('[class*="contactIcon"] svg');
        contactIconSvgs.forEach(svg => {
          expect(svg).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });

    describe('Badge Legend Icons (Accordion Content)', () => {
      it('should render SVG icons in badge legend descriptions', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: {
            emailSent: true,
          },
        };
        render(<AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />);

        // Click accordion to open
        const legendAccordion = screen.getByText(/What do these badges mean/i);
        fireEvent.click(legendAccordion);

        // Legend items should contain SVG icons
        const legendItems = screen.getByText(/Engaged/).closest('[class*="legendItem"]')?.parentElement;
        const icons = legendItems?.querySelectorAll('svg');
        expect(icons && icons.length).toBeGreaterThan(0);
      });

      it('should not contain duplicate emoji in badge legend text', () => {
        const alertWithEngagement = {
          ...baseAlert,
          notificationStatus: {
            emailSent: true,
          },
        };
        const { container } = render(
          <AlertCard alert={alertWithEngagement} onAction={mockOnAction} variant="active" />,
        );

        // Click accordion to open
        const legendAccordion = screen.getByText(/What do these badges mean/i);
        fireEvent.click(legendAccordion);

        // Check legend text for emoji
        const legendText = container.querySelectorAll('[class*="legendText"]');
        legendText.forEach(text => {
          expect(text.textContent).not.toContain('🔗'); // Engaged
          expect(text.textContent).not.toContain('📧'); // Read
          expect(text.textContent).not.toContain('✉️'); // Delivered
          expect(text.textContent).not.toContain('📱'); // SMS
        });
      });
    });

    describe('Overall Icon Integration', () => {
      it('should render all Lucide icons consistently across AlertCard', () => {
        const fullAlert: DelayAlert = {
          ...baseAlert,
          delayReason: 'Weather delay',
          notificationStatus: {
            emailSent: true,
            emailOpened: true,
            emailClicked: true,
            smsSent: true,
          },
          customerPhone: '+1-555-1234',
          lineItems: [{ id: 'line-1', productId: 'prod-1', title: 'Product', quantity: 1, price: 10 }],
          suggestedActions: ['Action 1'],
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Event',
              location: 'NYC',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={fullAlert} onAction={mockOnAction} variant="active" />,
        );

        // Count all SVG icons in the card
        const allIcons = container.querySelectorAll('svg');
        // Should have multiple icons (delay warning, badges, accordion titles, contact icons, etc.)
        expect(allIcons.length).toBeGreaterThan(5);
      });

      it('should not contain any emoji characters in AlertCard', () => {
        const fullAlert: DelayAlert = {
          ...baseAlert,
          delayReason: 'Weather delay',
          notificationStatus: {
            emailSent: true,
            emailOpened: true,
            emailClicked: true,
            smsSent: true,
          },
          customerPhone: '+1-555-1234',
          lineItems: [{ id: 'line-1', productId: 'prod-1', title: 'Product', quantity: 1, price: 10 }],
          suggestedActions: ['Action 1'],
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Event',
              location: 'NYC',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={fullAlert} onAction={mockOnAction} variant="active" />,
        );

        const alertCardText = container.textContent || '';
        // Should NOT contain any of the replaced emojis
        expect(alertCardText).not.toContain('⚠️');
        expect(alertCardText).not.toContain('⚠');
        expect(alertCardText).not.toContain('🔗');
        expect(alertCardText).not.toContain('📧');
        expect(alertCardText).not.toContain('✉️');
        expect(alertCardText).not.toContain('📱');
        expect(alertCardText).not.toContain('📦');
        expect(alertCardText).not.toContain('💡');
        expect(alertCardText).not.toContain('🚚');
        expect(alertCardText).not.toContain('📍');
        expect(alertCardText).not.toContain('📖');
        expect(alertCardText).not.toContain('📞');
      });

      it('should apply consistent sizing to all icons', () => {
        const fullAlert: DelayAlert = {
          ...baseAlert,
          delayReason: 'Weather delay',
          notificationStatus: {
            emailSent: true,
          },
          customerPhone: '+1-555-1234',
          lineItems: [{ id: 'line-1', productId: 'prod-1', title: 'Product', quantity: 1, price: 10 }],
          trackingEvents: [
            {
              id: 'evt-1',
              timestamp: '2025-10-20T10:00:00Z',
              description: 'Event',
              location: 'NYC',
              status: 'PICKED_UP',
            },
          ] as TrackingEvent[],
        };
        const { container } = render(
          <AlertCard alert={fullAlert} onAction={mockOnAction} variant="active" />,
        );

        const allIcons = container.querySelectorAll('svg');
        allIcons.forEach(icon => {
          // All Lucide icons should have width/height attributes
          expect(icon).toHaveAttribute('width');
          expect(icon).toHaveAttribute('height');
        });
      });

      it('should apply currentColor to all icons for theming', () => {
        const fullAlert: DelayAlert = {
          ...baseAlert,
          delayReason: 'Weather delay',
          notificationStatus: {
            emailSent: true,
          },
        };
        const { container } = render(
          <AlertCard alert={fullAlert} onAction={mockOnAction} variant="active" />,
        );

        const allIcons = container.querySelectorAll('svg');
        allIcons.forEach(icon => {
          // Lucide icons use currentColor for stroke
          expect(icon).toHaveAttribute('stroke', 'currentColor');
        });
      });
    });
  });
});
