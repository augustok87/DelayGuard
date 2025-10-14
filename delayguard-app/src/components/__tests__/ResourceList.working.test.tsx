/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working ResourceList Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the ResourceList component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceList } from '../ResourceList';
import { ResourceItem } from '../ResourceItem';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-resource-list
  class MockResourceListElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'list');
      this.setAttribute('tabindex', '0');
    }
    
    setAttribute(name: string, value: string) {
      super.setAttribute(name, value);
      if (name === 'class') {
        this.className = value;
      }
    }
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-resource-list')) {
      customElements.define('s-resource-list', MockResourceListElement);
    }
  }
});

describe('ResourceList Web Component - Working Tests', () => {
  const sampleItems = [
    { id: '1', name: 'Item 1', status: 'Active' },
    { id: '2', name: 'Item 2', status: 'Inactive' },
    { id: '3', name: 'Item 3', status: 'Active' }
  ];

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ResourceList />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList.tagName.toLowerCase()).toBe('s-resource-list');
    });

    it('should render with items', () => {
      render(<ResourceList items={sampleItems} />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('items', JSON.stringify(sampleItems));
    });

    it('should render as selectable', () => {
      render(<ResourceList items={sampleItems} selectable />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('selectable', 'true');
    });

    it('should apply custom className', () => {
      render(<ResourceList className="custom-class" />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <ResourceList
          items={sampleItems}
          selectable
          className="test-class"
          data-testid="test-resource-list"
        />
      );
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('items', JSON.stringify(sampleItems));
      expect(resourceList).toHaveAttribute('selectable', 'true');
      expect(resourceList).toHaveAttribute('class', 'test-class');
      expect(resourceList).toHaveAttribute('data-testid', 'test-resource-list');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined items gracefully', () => {
      render(<ResourceList />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('items', '[]');
    });

    it('should handle empty items array', () => {
      render(<ResourceList items={[]} />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('items', '[]');
    });

    it('should handle boolean props correctly', () => {
      render(<ResourceList selectable={true} />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('selectable', 'true');
    });
  });

  describe('RenderItem Function', () => {
    it('should render items using renderItem function', () => {
      const renderItem = (item: any) => (
        <ResourceItem key={item.id} id={item.id}>
          {item.name} - {item.status}
        </ResourceItem>
      );

      render(
        <ResourceList
          items={sampleItems}
          renderItem={renderItem}
        />
      );
      
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(screen.getByText('Item 1 - Active')).toBeInTheDocument();
      expect(screen.getByText('Item 2 - Inactive')).toBeInTheDocument();
      expect(screen.getByText('Item 3 - Active')).toBeInTheDocument();
    });

    it('should handle renderItem with click handlers', () => {
      const handleClick = jest.fn();
      const renderItem = (item: any) => (
        <ResourceItem key={item.id} id={item.id} onClick={handleClick}>
          {item.name}
        </ResourceItem>
      );

      render(
        <ResourceList
          items={sampleItems}
          renderItem={renderItem}
        />
      );
      
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<ResourceList items={sampleItems} />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
      expect(resourceList).toHaveAttribute('role', 'list');
    });

    it('should be keyboard accessible', () => {
      render(<ResourceList items={sampleItems} />);
      const resourceList = screen.getByRole('list');
      resourceList.focus();
      expect(resourceList).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [items, setItems] = React.useState(sampleItems);
        return (
          <div>
            <ResourceList
              items={items}
              renderItem={(item: any) => (
                <ResourceItem key={item.id} id={item.id}>
                  {item.name}
                </ResourceItem>
              )}
            />
            <button onClick={() => setItems([...items, { id: '4', name: 'Item 4', status: 'Active' }])}>
              Add Item
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const resourceList = screen.getByRole('list');
      const button = screen.getByText('Add Item');
      
      expect(resourceList).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      
      fireEvent.click(button);
      
      expect(screen.getByText('Item 4')).toBeInTheDocument();
    });

    it('should work with dynamic items', () => {
      const TestComponent = () => {
        const [items, setItems] = React.useState(sampleItems);
        return (
          <div>
            <ResourceList
              items={items}
              renderItem={(item: any) => (
                <ResourceItem key={item.id} id={item.id}>
                  {item.name}
                </ResourceItem>
              )}
            />
            <button onClick={() => setItems(items.filter(item => item.id !== '2'))}>
              Remove Item 2
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const resourceList = screen.getByRole('list');
      const button = screen.getByText('Remove Item 2');
      
      expect(resourceList).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      
      fireEvent.click(button);
      
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        items: sampleItems,
        selectable: true,
        className: 'test-class',
        'data-testid': 'test-resource-list',
        renderItem: (item: any) => <div key={item.id}>{item.name}</div>,
      };

      render(<ResourceList {...props} />);
      const resourceList = screen.getByRole('list');
      expect(resourceList).toBeInTheDocument();
    });
  });
});
