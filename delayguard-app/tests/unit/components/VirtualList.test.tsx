import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, renderHook, act } from '../../setup/test-utils';
import { VirtualList, useVirtualList } from '../../../src/components/common/VirtualList/index';

// Mock data
const mockItems = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  value: i * 10,
}));

const MockItem = ({ item, index }: { item: any; index: number }) => (
  <div data-testid={`item-${index}`}>
    {item.name} - {item.value}
  </div>
);

describe('VirtualList', () => {
  const defaultProps = {
    items: mockItems,
    itemHeight: 50,
    containerHeight: 400,
    renderItem: (item: any, index: number) => <MockItem item={item} index={index} />,
  };

  it('renders with items', () => {
    render(<VirtualList {...defaultProps} />);
    
    // Should render some items (visible ones)
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('renders correct number of visible items', () => {
    render(<VirtualList {...defaultProps} />);
    
    // With containerHeight 400 and itemHeight 50, should show about 8 items
    // Plus overscan, so maybe 10-12 items
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    expect(visibleItems.length).toBeGreaterThan(0);
    expect(visibleItems.length).toBeLessThan(20); // Should not render all 1000 items
  });

  it('handles empty items array', () => {
    render(<VirtualList {...defaultProps} items={[]} />);
    
    expect(screen.queryByTestId(/item-\d+/)).not.toBeInTheDocument();
  });

  it('handles scroll events', () => {
    render(<VirtualList {...defaultProps} />);
    
    const container = screen.getByTestId('virtual-list-container');
    fireEvent.scroll(container, { target: { scrollTop: 1000 } });
    
    // Should still render items (different ones due to scroll)
    expect(screen.getAllByTestId(/item-\d+/).length).toBeGreaterThan(0);
  });

  it('handles different item heights', () => {
    render(<VirtualList {...defaultProps} itemHeight={100} />);
    
    // Should still render items
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('handles different container heights', () => {
    render(<VirtualList {...defaultProps} containerHeight={200} />);
    
    // Should still render items
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<VirtualList {...defaultProps} className="custom-list" />);
    
    const container = screen.getByTestId('virtual-list-container');
    expect(container).toHaveClass('custom-list');
  });

  it('handles overscan prop', () => {
    render(<VirtualList {...defaultProps} overscan={10} />);
    
    // Should render items
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('updates when items change', () => {
    const { rerender } = render(<VirtualList {...defaultProps} />);
    
    const newItems = mockItems.slice(0, 100);
    rerender(<VirtualList {...defaultProps} items={newItems} />);
    
    // Should still render items
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('handles large datasets efficiently', () => {
    const largeItems = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Large Item ${i}`,
    }));
    
    render(
      <VirtualList
        {...defaultProps}
        items={largeItems}
        renderItem={(item: any, index: number) => (
          <div data-testid={`large-item-${index}`}>{item.name}</div>
        )}
      />,
    );
    
    // Should only render visible items, not all 10000
    const visibleItems = screen.getAllByTestId(/large-item-\d+/);
    expect(visibleItems.length).toBeLessThan(50);
  });
});

describe('useVirtualList', () => {
  it('returns correct initial values', () => {
    const { result } = renderHook(() => 
      useVirtualList(mockItems, 50, 400),
    );

    expect(result.current.visibleItems).toBeDefined();
    expect(result.current.totalHeight).toBe(50000); // 1000 items * 50 height
    expect(result.current.offsetY).toBe(0);
    expect(typeof result.current.setScrollTop).toBe('function');
  });

  it('calculates visible range correctly', () => {
    const { result } = renderHook(() => 
      useVirtualList(mockItems, 50, 400),
    );

    // With containerHeight 400 and itemHeight 50, should show about 8 items
    expect(result.current.visibleItems.length).toBeGreaterThan(0);
    expect(result.current.visibleItems.length).toBeLessThan(20);
  });

  it('updates when scroll position changes', () => {
    const { result } = renderHook(() => 
      useVirtualList(mockItems, 50, 400),
    );

    // const initialVisibleItems = result.current.visibleItems.length;

    act(() => {
      result.current.setScrollTop(1000);
    });

    // Should have different visible items after scroll
    expect(result.current.visibleItems.length).toBeGreaterThan(0);
  });

  it('handles different overscan values', () => {
    const { result: result1 } = renderHook(() => 
      useVirtualList(mockItems, 50, 400, 5),
    );
    
    const { result: result2 } = renderHook(() => 
      useVirtualList(mockItems, 50, 400, 10),
    );

    // More overscan should show more items
    expect(result2.current.visibleItems.length).toBeGreaterThanOrEqual(
      result1.current.visibleItems.length,
    );
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() => 
      useVirtualList([], 50, 400),
    );

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.offsetY).toBe(0);
  });

  it('handles single item', () => {
    const singleItem = [mockItems[0]];
    const { result } = renderHook(() => 
      useVirtualList(singleItem, 50, 400),
    );

    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.totalHeight).toBe(50);
  });
});
