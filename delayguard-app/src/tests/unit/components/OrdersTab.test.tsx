/**
 * OrdersTab Component Tests
 *
 * Tests for OrdersTab with Phase C filtering functionality.
 * Covers SegmentedControl integration, tab filtering, badge counts, and empty states.
 *
 * Phase C: Orders Tab Filtering - Segmented Button Filter
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrdersTab } from '../../../components/tabs/OrdersTab';
import type { Order } from '../../../types';

// Mock OrderCard component
jest.mock('../../../components/tabs/OrdersTab/OrderCard', () => ({
  OrderCard: ({ order, onAction, variant }: any) => (
    <div data-testid={`order-card-${order.id}`} data-variant={variant}>
      <div>Order: {order.orderNumber}</div>
      <div>Status: {order.status}</div>
      <button onClick={() => onAction(order.id, 'track')}>Track</button>
      <button onClick={() => onAction(order.id, 'view')}>View</button>
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

describe('OrdersTab Component', () => {
  const mockOnOrderAction = jest.fn();

  // Test data factory
  const createOrder = (id: string, status: 'processing' | 'shipped' | 'delivered'): Order => ({
    id,
    orderNumber: `#${1000 + parseInt(id)}`,
    customerName: 'John Doe',
    status,
    createdAt: new Date().toISOString(),
    customerEmail: 'customer@example.com',
    totalAmount: 150.0,
    currency: 'USD',
    trackingNumber: 'TRACK123',
    carrierCode: 'usps',
  });

  const mockOrders: Order[] = [
    createOrder('1', 'processing'),
    createOrder('2', 'processing'),
    createOrder('3', 'shipped'),
    createOrder('4', 'shipped'),
    createOrder('5', 'shipped'),
    createOrder('6', 'shipped'),
    createOrder('7', 'delivered'),
    createOrder('8', 'delivered'),
  ];

  beforeEach(() => {
    mockOnOrderAction.mockClear();
  });

  describe('Loading State', () => {
    it('should render loading state when loading is true', () => {
      render(<OrdersTab orders={[]} loading={true} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Recent Orders')).toBeInTheDocument();
      // Use getAllByText since "Loading orders..." appears twice (subtitle + content)
      const loadingTexts = screen.getAllByText('Loading orders...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('should not render SegmentedControl when loading', () => {
      render(<OrdersTab orders={mockOrders} loading={true} onOrderAction={mockOnOrderAction} />);

      // SegmentedControl buttons should not exist
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
      expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    });
  });

  describe('Empty State (No Orders)', () => {
    it('should render empty state when no orders exist', () => {
      render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Recent Orders')).toBeInTheDocument();
      expect(screen.getByText('No orders found')).toBeInTheDocument();
      expect(screen.getByText('Orders will appear here when they are processed.')).toBeInTheDocument();
    });

    it('should not render SegmentedControl when no orders', () => {
      render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
    });
  });

  describe('SegmentedControl Rendering', () => {
    it('should render SegmentedControl with all 3 options', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('should show correct badge counts for each status', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Processing: 2 orders
      const processingButton = screen.getByText('Processing').closest('button');
      expect(within(processingButton!).getByText('2')).toBeInTheDocument();

      // Shipped: 4 orders
      const shippedButton = screen.getByText('Shipped').closest('button');
      expect(within(shippedButton!).getByText('4')).toBeInTheDocument();

      // Delivered: 2 orders
      const deliveredButton = screen.getByText('Delivered').closest('button');
      expect(within(deliveredButton!).getByText('2')).toBeInTheDocument();
    });

    it('should default to Shipped tab selected', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      const shippedButton = screen.getByText('Shipped').closest('button');
      expect(shippedButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Filter Summary Text', () => {
    it('should display correct summary for shipped orders (plural)', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Showing 4 shipped orders')).toBeInTheDocument();
    });

    it('should display correct summary for single order (singular)', () => {
      const singleOrder = [createOrder('1', 'shipped')];
      render(<OrdersTab orders={singleOrder} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Showing 1 shipped order')).toBeInTheDocument();
    });

    it('should update summary when switching tabs', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Initially shows shipped orders
      expect(screen.getByText('Showing 4 shipped orders')).toBeInTheDocument();

      // Click Processing tab
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.getByText('Showing 2 processing orders')).toBeInTheDocument();

      // Click Delivered tab
      fireEvent.click(screen.getByText('Delivered'));
      expect(screen.getByText('Showing 2 delivered orders')).toBeInTheDocument();
    });
  });

  describe('Tab Filtering Behavior', () => {
    it('should show only shipped orders by default', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Should show 4 shipped orders
      expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-5')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-6')).toBeInTheDocument();

      // Should NOT show processing or delivered orders
      expect(screen.queryByTestId('order-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-7')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-8')).not.toBeInTheDocument();
    });

    it('should show only processing orders when Processing tab clicked', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Click Processing tab
      fireEvent.click(screen.getByText('Processing'));

      // Should show 2 processing orders
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-2')).toBeInTheDocument();

      // Should NOT show shipped or delivered orders
      expect(screen.queryByTestId('order-card-3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-7')).not.toBeInTheDocument();
    });

    it('should show only delivered orders when Delivered tab clicked', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Click Delivered tab
      fireEvent.click(screen.getByText('Delivered'));

      // Should show 2 delivered orders
      expect(screen.getByTestId('order-card-7')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-8')).toBeInTheDocument();

      // Should NOT show processing or shipped orders
      expect(screen.queryByTestId('order-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-card-3')).not.toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Start with Shipped (default)
      expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
      expect(screen.queryByTestId('order-card-1')).not.toBeInTheDocument();

      // Switch to Processing
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.queryByTestId('order-card-3')).not.toBeInTheDocument();
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();

      // Switch back to Shipped
      fireEvent.click(screen.getByText('Shipped'));
      expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
      expect(screen.queryByTestId('order-card-1')).not.toBeInTheDocument();

      // Switch to Delivered
      fireEvent.click(screen.getByText('Delivered'));
      expect(screen.queryByTestId('order-card-3')).not.toBeInTheDocument();
      expect(screen.getByTestId('order-card-7')).toBeInTheDocument();
    });
  });

  describe('OrderCard Integration', () => {
    it('should render OrderCard for each filtered order', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Should render 4 OrderCards (shipped orders)
      const orderCards = screen.getAllByText(/Order: #/);
      expect(orderCards).toHaveLength(4);
    });

    it('should pass correct variant prop to OrderCard based on active tab', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Shipped tab - cards should have variant="shipped"
      expect(screen.getByTestId('order-card-3')).toHaveAttribute('data-variant', 'shipped');

      // Click Processing tab
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.getByTestId('order-card-1')).toHaveAttribute('data-variant', 'processing');

      // Click Delivered tab
      fireEvent.click(screen.getByText('Delivered'));
      expect(screen.getByTestId('order-card-7')).toHaveAttribute('data-variant', 'delivered');
    });

    it('should call onOrderAction when order action triggered', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Click Track button on first shipped order
      const trackButtons = screen.getAllByText('Track');
      fireEvent.click(trackButtons[0]);

      expect(mockOnOrderAction).toHaveBeenCalledWith('3', 'track');
    });
  });

  describe('Tab-Specific Empty States', () => {
    it('should show processing empty state when no processing orders', () => {
      const ordersWithoutProcessing = [
        createOrder('3', 'shipped'),
        createOrder('7', 'delivered'),
      ];

      render(<OrdersTab orders={ordersWithoutProcessing} loading={false} onOrderAction={mockOnOrderAction} />);

      // Click Processing tab
      fireEvent.click(screen.getByText('Processing'));

      // v1.32: Icon is now SVG (decorative with aria-hidden), so we only check text
      expect(screen.getByText('No processing orders')).toBeInTheDocument();
      expect(screen.getByText('Orders being prepared for shipment will appear here.')).toBeInTheDocument();
    });

    it('should show shipped empty state when no shipped orders', () => {
      const ordersWithoutShipped = [
        createOrder('1', 'processing'),
        createOrder('7', 'delivered'),
      ];

      render(<OrdersTab orders={ordersWithoutShipped} loading={false} onOrderAction={mockOnOrderAction} />);

      // v1.32: Icon is now SVG (decorative with aria-hidden), so we only check text
      // Default is Shipped tab
      expect(screen.getByText('No shipped orders')).toBeInTheDocument();
      expect(screen.getByText('Orders in transit will appear here.')).toBeInTheDocument();
    });

    it('should show delivered empty state when no delivered orders', () => {
      const ordersWithoutDelivered = [
        createOrder('1', 'processing'),
        createOrder('3', 'shipped'),
      ];

      render(<OrdersTab orders={ordersWithoutDelivered} loading={false} onOrderAction={mockOnOrderAction} />);

      // Click Delivered tab
      fireEvent.click(screen.getByText('Delivered'));

      // v1.32: Icon is now SVG (decorative with aria-hidden), so we only check text
      expect(screen.getByText('No delivered orders')).toBeInTheDocument();
      expect(screen.getByText('Successfully delivered orders will appear here.')).toBeInTheDocument();
    });

    it('should show correct empty state icons for each tab', () => {
      const emptyOrders = [createOrder('3', 'shipped')]; // Only 1 shipped, rest empty

      render(<OrdersTab orders={emptyOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // v1.32: Icons are now SVG (decorative with aria-hidden), so we check text content instead
      // Processing tab - should show empty state
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.getByText('No processing orders')).toBeInTheDocument();

      // Delivered tab - should show empty state
      fireEvent.click(screen.getByText('Delivered'));
      expect(screen.getByText('No delivered orders')).toBeInTheDocument();

      // Shipped tab - should show order (not empty)
      fireEvent.click(screen.getByText('Shipped'));
      expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
    });
  });

  describe('Badge Count Updates', () => {
    it('should show zero badge when status has no orders', () => {
      const onlyShippedOrders = [
        createOrder('3', 'shipped'),
        createOrder('4', 'shipped'),
      ];

      render(<OrdersTab orders={onlyShippedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Shipped should show 2
      const shippedButton = screen.getByText('Shipped').closest('button');
      expect(within(shippedButton!).getByText('2')).toBeInTheDocument();

      // Processing and Delivered should show 0
      const processingButton = screen.getByText('Processing').closest('button');
      expect(within(processingButton!).getByText('0')).toBeInTheDocument();

      const deliveredButton = screen.getByText('Delivered').closest('button');
      expect(within(deliveredButton!).getByText('0')).toBeInTheDocument();
    });

    it('should update badge counts when orders prop changes', () => {
      const { rerender } = render(
        <OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />,
      );

      // Initial counts: 2 processing, 4 shipped, 2 delivered
      let shippedButton = screen.getByText('Shipped').closest('button');
      expect(within(shippedButton!).getByText('4')).toBeInTheDocument();

      // Update orders prop
      const updatedOrders = [
        createOrder('1', 'processing'),
        createOrder('2', 'delivered'),
        createOrder('3', 'delivered'),
        createOrder('4', 'delivered'),
      ];

      rerender(<OrdersTab orders={updatedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // New counts: 1 processing, 0 shipped, 3 delivered
      const processingButton = screen.getByText('Processing').closest('button');
      expect(within(processingButton!).getByText('1')).toBeInTheDocument();

      shippedButton = screen.getByText('Shipped').closest('button');
      expect(within(shippedButton!).getByText('0')).toBeInTheDocument();

      const deliveredButton = screen.getByText('Delivered').closest('button');
      expect(within(deliveredButton!).getByText('3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders with same status', () => {
      const allShippedOrders = [
        createOrder('1', 'shipped'),
        createOrder('2', 'shipped'),
        createOrder('3', 'shipped'),
        createOrder('4', 'shipped'),
      ];

      render(<OrdersTab orders={allShippedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      expect(screen.getByText('Showing 4 shipped orders')).toBeInTheDocument();
      expect(screen.getAllByText(/Order: #/)).toHaveLength(4);
    });

    it('should handle rapid tab switching', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Rapidly switch between tabs
      fireEvent.click(screen.getByText('Processing'));
      fireEvent.click(screen.getByText('Delivered'));
      fireEvent.click(screen.getByText('Shipped'));
      fireEvent.click(screen.getByText('Processing'));
      fireEvent.click(screen.getByText('Shipped'));

      // Should end on Shipped tab showing 4 orders
      expect(screen.getByText('Showing 4 shipped orders')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
    });

    it('should handle single order in each status', () => {
      const oneEachOrders = [
        createOrder('1', 'processing'),
        createOrder('2', 'shipped'),
        createOrder('3', 'delivered'),
      ];

      render(<OrdersTab orders={oneEachOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Check Shipped (singular)
      expect(screen.getByText('Showing 1 shipped order')).toBeInTheDocument();

      // Check Processing (singular)
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.getByText('Showing 1 processing order')).toBeInTheDocument();

      // Check Delivered (singular)
      fireEvent.click(screen.getByText('Delivered'));
      expect(screen.getByText('Showing 1 delivered order')).toBeInTheDocument();
    });

    it('should filter correctly when orders prop updates while on different tab', () => {
      const { rerender } = render(
        <OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />,
      );

      // Switch to Processing tab
      fireEvent.click(screen.getByText('Processing'));
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();

      // Update orders (add more processing)
      const updatedOrders = [
        ...mockOrders,
        createOrder('9', 'processing'),
        createOrder('10', 'processing'),
      ];

      rerender(<OrdersTab orders={updatedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Should still be on Processing tab, showing 4 processing orders
      expect(screen.getByText('Showing 4 processing orders')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-9')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should maintain focus on SegmentedControl when switching tabs', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      const processingButton = screen.getByText('Processing').closest('button');

      // Focus and click
      processingButton?.focus();
      fireEvent.click(processingButton!);

      // Button should still be in the document (not re-mounted)
      expect(screen.getByText('Processing').closest('button')).toBeInTheDocument();
    });

    it('should have proper aria-pressed attributes on tab buttons', () => {
      render(<OrdersTab orders={mockOrders} loading={false} onOrderAction={mockOnOrderAction} />);

      // Shipped should be pressed (default)
      const shippedButton = screen.getByText('Shipped').closest('button');
      expect(shippedButton).toHaveAttribute('aria-pressed', 'true');

      // Others should not be pressed
      const processingButton = screen.getByText('Processing').closest('button');
      expect(processingButton).toHaveAttribute('aria-pressed', 'false');

      // Click Processing
      fireEvent.click(processingButton!);

      // Now Processing should be pressed
      expect(processingButton).toHaveAttribute('aria-pressed', 'true');
      expect(shippedButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('v1.32: Lucide Icon Integration - Empty State Icons', () => {
    describe('Initial Empty State Icon (No Orders)', () => {
      it('should render SVG icon when no orders exist', () => {
        const { container } = render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

        // Should have Lucide SVG icon (Package) in initial empty state
        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        expect(emptyStateIcon).toBeInTheDocument();
        expect(emptyStateIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });

      it('should not contain emoji in initial empty state', () => {
        const { container } = render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"]');
        // Should NOT contain package emoji 📦
        expect(emptyStateIcon?.textContent).not.toContain('📦');
      });

      it('should have aria-hidden="true" on initial empty state SVG icon', () => {
        const { container } = render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        expect(emptyStateIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('Processing Tab Empty State Icon', () => {
      const allShippedOrders: Order[] = mockOrders.map(order => ({
        ...order,
        status: 'shipped' as const,
      }));

      it('should render SVG icon for no processing orders', () => {
        const { container } = render(<OrdersTab orders={allShippedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Processing tab
        const processingButton = screen.getByText('Processing').closest('button');
        fireEvent.click(processingButton!);

        // Should have Lucide SVG icon (Timer or Clock)
        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        expect(emptyStateIcon).toBeInTheDocument();
      });

      it('should not contain emoji in no processing orders message', () => {
        const { container } = render(<OrdersTab orders={allShippedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Processing tab
        const processingButton = screen.getByText('Processing').closest('button');
        fireEvent.click(processingButton!);

        const emptyState = container.querySelector('[class*="emptyState"]');
        // Should NOT contain hourglass emoji ⏳
        expect(emptyState?.textContent).not.toContain('⏳');
      });

      it('should maintain accessible empty state text on Processing tab', () => {
        render(<OrdersTab orders={allShippedOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Processing tab
        const processingButton = screen.getByText('Processing').closest('button');
        fireEvent.click(processingButton!);

        expect(screen.getByText('No processing orders')).toBeInTheDocument();
      });
    });

    describe('Shipped Tab Empty State Icon', () => {
      const allProcessingOrders: Order[] = mockOrders.map(order => ({
        ...order,
        status: 'processing' as const,
      }));

      it('should render SVG icon for no shipped orders', () => {
        const { container } = render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Shipped tab is default, but all orders are processing, so should show empty state
        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        expect(emptyStateIcon).toBeInTheDocument();
      });

      it('should not contain emoji in no shipped orders message', () => {
        const { container } = render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        const emptyState = container.querySelector('[class*="emptyState"]');
        // Should NOT contain truck emoji 🚚
        expect(emptyState?.textContent).not.toContain('🚚');
      });

      it('should maintain accessible empty state text on Shipped tab', () => {
        render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        expect(screen.getByText('No shipped orders')).toBeInTheDocument();
      });
    });

    describe('Delivered Tab Empty State Icon', () => {
      const allProcessingOrders: Order[] = mockOrders.map(order => ({
        ...order,
        status: 'processing' as const,
      }));

      it('should render SVG icon for no delivered orders', () => {
        const { container } = render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Delivered tab
        const deliveredButton = screen.getByText('Delivered').closest('button');
        fireEvent.click(deliveredButton!);

        // Should have Lucide SVG icon (CheckCircle2)
        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        expect(emptyStateIcon).toBeInTheDocument();
      });

      it('should not contain emoji in no delivered orders message', () => {
        const { container } = render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Delivered tab
        const deliveredButton = screen.getByText('Delivered').closest('button');
        fireEvent.click(deliveredButton!);

        const emptyState = container.querySelector('[class*="emptyState"]');
        // Should NOT contain check emoji ✅
        expect(emptyState?.textContent).not.toContain('✅');
      });

      it('should maintain accessible empty state text on Delivered tab', () => {
        render(<OrdersTab orders={allProcessingOrders} loading={false} onOrderAction={mockOnOrderAction} />);

        // Switch to Delivered tab
        const deliveredButton = screen.getByText('Delivered').closest('button');
        fireEvent.click(deliveredButton!);

        expect(screen.getByText('No delivered orders')).toBeInTheDocument();
      });
    });

    describe('Icon Styling Consistency', () => {
      it('should apply consistent size to empty state icons', () => {
        const { container } = render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        // Lucide icons should have width/height attributes
        expect(emptyStateIcon).toHaveAttribute('width');
        expect(emptyStateIcon).toHaveAttribute('height');
      });

      it('should apply currentColor to empty state SVG icons for theming', () => {
        const { container } = render(<OrdersTab orders={[]} loading={false} onOrderAction={mockOnOrderAction} />);

        const emptyStateIcon = container.querySelector('[class*="emptyStateIcon"] svg');
        // Lucide icons use currentColor for stroke
        expect(emptyStateIcon).toHaveAttribute('stroke', 'currentColor');
      });
    });
  });
});
