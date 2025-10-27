/**
 * StatsCard Component Tests
 *
 * Test suite for the StatsCard component that displays performance metrics.
 * Following TDD best practices with comprehensive coverage.
 *
 * Priority 2 Update: Tests now focus on REAL metrics only (no fake satisfaction/ticket reduction)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '../../../components/tabs/DashboardTab/StatsCard';
import { StatsData } from '../../../types';

describe('StatsCard', () => {
  const mockStats: StatsData = {
    totalAlerts: 25,
    activeAlerts: 8,
    resolvedAlerts: 17,
    avgResolutionTime: '2.3 days',
    customerSatisfaction: '',
    supportTicketReduction: '',
  };

  describe('Component Rendering', () => {
    it('should render the StatsCard component', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Real-time insights into your delay management')).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(StatsCard.displayName).toBe('StatsCard');
    });
  });

  describe('Real Metrics Display', () => {
    it('should display total alerts count', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    });

    it('should display active alerts count', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });

    it('should display resolved alerts count', () => {
      render(<StatsCard stats={mockStats} />);

      // "17" appears twice - in metrics grid and summary
      expect(screen.getAllByText('17').length).toBe(2);
      expect(screen.getByText('Resolved Alerts:')).toBeInTheDocument();
    });

    it('should display average resolution time', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.getByText('2.3 days')).toBeInTheDocument();
      expect(screen.getByText('Avg Resolution Time')).toBeInTheDocument();
    });

    it('should handle large numbers correctly', () => {
      const largeStats: StatsData = {
        ...mockStats,
        totalAlerts: 1234,
        activeAlerts: 567,
        resolvedAlerts: 667,
      };

      render(<StatsCard stats={largeStats} />);

      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('567')).toBeInTheDocument();
      // "667" appears twice - in metrics grid and summary
      expect(screen.getAllByText('667').length).toBe(2);
    });

    it('should handle zero values correctly', () => {
      const zeroStats: StatsData = {
        ...mockStats,
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: '0 days',
      };

      render(<StatsCard stats={zeroStats} />);

      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  describe('Fake Metrics Removal', () => {
    it('should NOT display Customer Satisfaction metric', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.queryByText(/Customer Satisfaction/i)).not.toBeInTheDocument();
      expect(screen.queryByText('94%')).not.toBeInTheDocument();
    });

    it('should NOT display Support Ticket Reduction metric', () => {
      render(<StatsCard stats={mockStats} />);

      expect(screen.queryByText(/Support Ticket Reduction/i)).not.toBeInTheDocument();
      expect(screen.queryByText('35%')).not.toBeInTheDocument();
    });
  });

  describe('Metrics Grid Layout', () => {
    it('should display metrics in a 2x2 grid layout', () => {
      const { container } = render(<StatsCard stats={mockStats} />);

      // Find the metrics grid
      const metricsGrid = container.querySelector('.metricsGrid');
      expect(metricsGrid).toBeInTheDocument();

      // Should have exactly 4 metric cards (not 6 anymore - removed 2 fake metrics)
      const metricCards = container.querySelectorAll('.metric');
      expect(metricCards).toHaveLength(4);
    });
  });

  describe('Summary Section', () => {
    it('should display resolved alerts in summary', () => {
      render(<StatsCard stats={mockStats} />);

      const resolvedLabel = screen.getByText('Resolved Alerts:');
      expect(resolvedLabel).toBeInTheDocument();

      // Should find the resolved count (17) appears twice - in grid and summary
      expect(screen.getAllByText('17').length).toBe(2);
    });

    it('should only show real metrics in summary section', () => {
      const { container } = render(<StatsCard stats={mockStats} />);

      const summary = container.querySelector('.summary');
      expect(summary).toBeInTheDocument();

      // Summary should only have 1 item now (Resolved Alerts)
      const summaryItems = container.querySelectorAll('.summaryItem');
      expect(summaryItems).toHaveLength(1);
    });
  });

  describe('Color Coding', () => {
    it('should apply correct color to average resolution time metric', () => {
      render(<StatsCard stats={mockStats} />);

      // Find the Avg Resolution Time metric value
      const avgResolutionValue = screen.getByText('2.3 days').closest('.metricValue');
      expect(avgResolutionValue).toHaveStyle({ color: '#2563eb' });
    });

    it('should apply correct color to total alerts metric', () => {
      render(<StatsCard stats={mockStats} />);

      // Find the Total Alerts metric value
      const totalAlertsValue = screen.getByText('25').closest('.metricValue');
      expect(totalAlertsValue).toHaveStyle({ color: '#f59e0b' });
    });

    it('should apply correct color to active alerts metric', () => {
      render(<StatsCard stats={mockStats} />);

      // Find the Active Alerts metric value
      const activeAlertsValue = screen.getByText('8').closest('.metricValue');
      expect(activeAlertsValue).toHaveStyle({ color: '#ef4444' });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const { container } = render(<StatsCard stats={mockStats} />);

      // Should have proper div structure with class names
      expect(container.querySelector('.content')).toBeInTheDocument();
      expect(container.querySelector('.metricsGrid')).toBeInTheDocument();
      expect(container.querySelector('.summary')).toBeInTheDocument();
    });

    it('should display metric labels clearly', () => {
      render(<StatsCard stats={mockStats} />);

      // All real metric labels should be present
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Avg Resolution Time')).toBeInTheDocument();
      expect(screen.getByText('Resolved Alerts:')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional stats gracefully', () => {
      const minimalStats: StatsData = {
        totalAlerts: 10,
        activeAlerts: 5,
        resolvedAlerts: 5,
        avgResolutionTime: '1.5 days',
        customerSatisfaction: '',
        supportTicketReduction: '',
      };

      render(<StatsCard stats={minimalStats} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      // "5" appears twice - activeAlerts and resolvedAlerts (which also shows in summary)
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('1.5 days')).toBeInTheDocument();
    });

    it('should handle different time formats for avgResolutionTime', () => {
      const stats1: StatsData = { ...mockStats, avgResolutionTime: '1 day' };
      const { rerender } = render(<StatsCard stats={stats1} />);
      expect(screen.getByText('1 day')).toBeInTheDocument();

      const stats2: StatsData = { ...mockStats, avgResolutionTime: '24 hours' };
      rerender(<StatsCard stats={stats2} />);
      expect(screen.getByText('24 hours')).toBeInTheDocument();

      const stats3: StatsData = { ...mockStats, avgResolutionTime: '< 1 day' };
      rerender(<StatsCard stats={stats3} />);
      expect(screen.getByText('< 1 day')).toBeInTheDocument();
    });
  });
});
