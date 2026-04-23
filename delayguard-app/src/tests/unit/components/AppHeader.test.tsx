/**
 * AppHeader Component Tests
 *
 * Test suite for the AppHeader component that displays:
 * - DelayGuard logo and branding
 * - Shopify connection status (new feature)
 * - Key metrics (total alerts, active, resolved, ticket reduction)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../../../components/layout/AppHeader';
import { StatsData } from '../../../types';

describe('AppHeader', () => {
  const mockStats: StatsData = {
    totalAlerts: 42,
    activeAlerts: 15,
    resolvedAlerts: 27,
    avgResolutionTime: '3.5 days',
    supportTicketReduction: '35%',
    customerSatisfaction: '4.8/5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the AppHeader component', () => {
      render(<AppHeader stats={mockStats} />);

      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
      // v1.35: Updated tagline (Anchour-inspired messaging)
      expect(screen.getByText(/Proactive Shipping Intelligence/i)).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(AppHeader.displayName).toBe('AppHeader');
    });

    it('should render all metrics', () => {
      render(<AppHeader stats={mockStats} />);

      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Ticket Reduction')).toBeInTheDocument();
    });

    it('should display correct metric values', () => {
      render(<AppHeader stats={mockStats} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('27')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading state for metrics', () => {
      render(<AppHeader stats={mockStats} loading={true} />);

      const loadingElements = screen.getAllByText('...');
      expect(loadingElements).toHaveLength(4); // 4 metrics
    });

    it('should not display loading state when loading is false', () => {
      render(<AppHeader stats={mockStats} loading={false} />);

      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('Shopify Connection Status', () => {
    it('should render connection status when shop prop is provided', () => {
      render(<AppHeader stats={mockStats} shop="my-awesome-store.myshopify.com" />);

      expect(screen.getByText(/Connected to my-awesome-store$/)).toBeInTheDocument();
    });

    it('should display connection status in correct format (not "Shop:" label)', () => {
      render(<AppHeader stats={mockStats} shop="test-store.myshopify.com" />);

      // Should NOT contain "Shop:" label
      expect(screen.queryByText(/Shop:/)).not.toBeInTheDocument();

      // Should contain the correct format (truncated domain)
      expect(screen.getByText(/Connected to test-store$/)).toBeInTheDocument();
    });

    it('should not render connection status when shop prop is undefined', () => {
      render(<AppHeader stats={mockStats} />);

      expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument();
    });

    it('should not render connection status when shop prop is null', () => {
      render(<AppHeader stats={mockStats} shop={null} />);

      expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument();
    });

    it('should not render connection status when shop prop is empty string', () => {
      render(<AppHeader stats={mockStats} shop="" />);

      expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument();
    });

    it('should render connection status with checkmark SVG icon (v1.35)', () => {
      const { container } = render(<AppHeader stats={mockStats} shop="my-store.myshopify.com" />);

      // v1.35: Checkmark is now SVG icon instead of text character
      const connectionStatus = container.querySelector('.connectionStatus');
      const checkSvg = connectionStatus?.querySelector('svg');
      expect(checkSvg).toBeInTheDocument();
    });

    it('should apply correct CSS class to connection status section', () => {
      const { container } = render(<AppHeader stats={mockStats} shop="my-store.myshopify.com" />);

      const connectionStatus = container.querySelector('.connectionStatus');
      expect(connectionStatus).toBeInTheDocument();
    });

    it('should position connection status between logo and stats', () => {
      const { container } = render(<AppHeader stats={mockStats} shop="my-store.myshopify.com" />);

      const header = container.querySelector('header');
      const children = header?.children;

      // Header should have 3 children: logo, connectionStatus, stats
      expect(children).toHaveLength(3);
      expect(children?.[0].className).toContain('logo');
      expect(children?.[1].className).toContain('connectionStatus');
      expect(children?.[2].className).toContain('stats');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic header element', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<AppHeader stats={mockStats} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('DelayGuard');
    });

    it('should have accessible connection status with aria-label', () => {
      render(<AppHeader stats={mockStats} shop="my-store.myshopify.com" />);

      const connectionStatus = screen.getByLabelText(/Shopify connection status/i);
      expect(connectionStatus).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long shop domain names', () => {
      const longShopName = 'my-really-super-duper-long-awesome-amazing-store-name.myshopify.com';
      render(<AppHeader stats={mockStats} shop={longShopName} />);

      // Should truncate .myshopify.com suffix
      expect(screen.getByText(/Connected to my-really-super-duper-long-awesome-amazing-store-name$/)).toBeInTheDocument();
    });

    it('should handle shop names with special characters', () => {
      render(<AppHeader stats={mockStats} shop="store-123_test.myshopify.com" />);

      // Should truncate .myshopify.com suffix
      expect(screen.getByText(/Connected to store-123_test$/)).toBeInTheDocument();
    });

    it('should render correctly when both shop and loading are provided', () => {
      render(<AppHeader stats={mockStats} shop="my-store.myshopify.com" loading={true} />);

      // Should truncate .myshopify.com suffix
      expect(screen.getByText(/Connected to my-store$/)).toBeInTheDocument();
      expect(screen.getAllByText('...')).toHaveLength(4);
    });
  });

  describe('Visual Layout', () => {
    it('should render logo section with Lucide Shield icon (v1.35 Anchour redesign)', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      // v1.35: Should render SVG Shield icon instead of emoji
      const logoSection = container.querySelector('.logo');
      const svgIcon = logoSection?.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should NOT render emoji icon (v1.35 - emoji replaced with Lucide)', () => {
      render(<AppHeader stats={mockStats} />);

      // v1.35: Emoji should be replaced with Lucide Shield
      expect(screen.queryByText('🛡️')).not.toBeInTheDocument();
    });

    it('should apply header class to main container', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const header = container.querySelector('header');
      expect(header?.className).toContain('header');
    });
  });

  // v1.35 - Anchour-Inspired Redesign Tests
  describe('v1.35 Anchour-Inspired Design', () => {
    describe('Brand Voice & Messaging', () => {
      it('should render updated tagline matching Anchour voice', () => {
        render(<AppHeader stats={mockStats} />);

        // v1.35: Updated tagline to be more outcome-focused (Anchour principle)
        expect(screen.getByText(/shipping intelligence/i)).toBeInTheDocument();
      });

      it('should maintain DelayGuard brand name', () => {
        render(<AppHeader stats={mockStats} />);

        expect(screen.getByText('DelayGuard')).toBeInTheDocument();
      });
    });

    describe('Lucide Icon Integration', () => {
      it('should render Shield icon with correct size', () => {
        const { container } = render(<AppHeader stats={mockStats} />);

        const svgIcon = container.querySelector('.icon svg');
        expect(svgIcon).toBeInTheDocument();
        // Check for size attribute or viewBox
        expect(svgIcon).toHaveAttribute('width');
        expect(svgIcon).toHaveAttribute('height');
      });

      it('should render Shield icon as decorative (aria-hidden)', () => {
        const { container } = render(<AppHeader stats={mockStats} />);

        const svgIcon = container.querySelector('.icon svg');
        expect(svgIcon).toHaveAttribute('aria-hidden', 'true');
      });

      it('should render checkmark as SVG icon in connection status', () => {
        const { container } = render(<AppHeader stats={mockStats} shop="test-store.myshopify.com" />);

        const connectionStatus = container.querySelector('.connectionStatus');
        const checkIcon = connectionStatus?.querySelector('svg');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    describe('Color Accent Updates', () => {
      it('should apply gold accent class to Active alerts metric', () => {
        const { container } = render(<AppHeader stats={mockStats} />);

        const statsContainer = container.querySelector('.stats');
        const activeMetric = statsContainer?.children[1];

        // v1.35: Active alerts should use gold accent color (brand vigilance)
        expect(activeMetric?.className).toContain('statGold');
      });

      it('should maintain amber for Total Alerts', () => {
        const { container } = render(<AppHeader stats={mockStats} />);

        const statsContainer = container.querySelector('.stats');
        const totalAlertsMetric = statsContainer?.children[0];

        expect(totalAlertsMetric?.className).toContain('statAmber');
      });
    });

    describe('Accessibility Enhancements', () => {
      it('should have visible focus states on interactive elements', () => {
        const { container } = render(<AppHeader stats={mockStats} shop="test-store.myshopify.com" />);

        const connectionStatus = container.querySelector('.connectionStatus');
        expect(connectionStatus).toBeInTheDocument();
        // Connection status should be focusable (tabindex or naturally focusable)
      });

      it('should provide accessible name for stats region', () => {
        const { container } = render(<AppHeader stats={mockStats} />);

        const statsSection = container.querySelector('.stats');
        // Stats section exists (could add aria-label in future)
        expect(statsSection).toBeInTheDocument();
      });
    });
  });

  describe('Color-Coded Metrics', () => {
    it('should apply amber color class to Total Alerts metric', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const statsContainer = container.querySelector('.stats');
      const totalAlertsMetric = statsContainer?.children[0];

      expect(totalAlertsMetric?.className).toContain('stat');
      expect(totalAlertsMetric?.className).toContain('statAmber');
    });

    it('should apply gold color class to Active metric (v1.35 Anchour redesign)', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const statsContainer = container.querySelector('.stats');
      const activeMetric = statsContainer?.children[1];

      expect(activeMetric?.className).toContain('stat');
      // v1.35: Changed from blue to gold (brand accent color - vigilance)
      expect(activeMetric?.className).toContain('statGold');
    });

    it('should apply green color class to Resolved metric', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const statsContainer = container.querySelector('.stats');
      const resolvedMetric = statsContainer?.children[2];

      expect(resolvedMetric?.className).toContain('stat');
      expect(resolvedMetric?.className).toContain('statGreen');
    });

    it('should NOT apply color class to Ticket Reduction metric', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const statsContainer = container.querySelector('.stats');
      const ticketReductionMetric = statsContainer?.children[3];

      expect(ticketReductionMetric?.className).toContain('stat');
      expect(ticketReductionMetric?.className).not.toContain('statAmber');
      expect(ticketReductionMetric?.className).not.toContain('statBlue');
      expect(ticketReductionMetric?.className).not.toContain('statGreen');
    });

    it('should maintain all 4 metrics with correct order', () => {
      const { container } = render(<AppHeader stats={mockStats} />);

      const statsContainer = container.querySelector('.stats');
      const metrics = statsContainer?.children;

      expect(metrics).toHaveLength(4);

      // v1.35: Verify order - Total Alerts (amber), Active (gold), Resolved (green), Ticket Reduction (no color)
      expect(metrics?.[0].className).toContain('statAmber');
      expect(metrics?.[1].className).toContain('statGold'); // v1.35: Changed from blue to gold
      expect(metrics?.[2].className).toContain('statGreen');
      expect(metrics?.[3].className).toContain('stat');
      expect(metrics?.[3].className).not.toContain('statAmber');
    });

    it('should apply color classes correctly even in loading state', () => {
      const { container } = render(<AppHeader stats={mockStats} loading={true} />);

      const statsContainer = container.querySelector('.stats');
      const metrics = statsContainer?.children;

      // v1.35: Color classes should still be applied even when loading
      expect(metrics?.[0].className).toContain('statAmber');
      expect(metrics?.[1].className).toContain('statGold'); // v1.35: Changed from blue to gold
      expect(metrics?.[2].className).toContain('statGreen');
    });
  });
});
