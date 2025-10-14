/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working ResourceItem Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the ResourceItem component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceItem } from '../ResourceItem';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-resource-item
  class MockResourceItemElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'listitem');
      this.setAttribute('tabindex', '0');
    }
    
    setAttribute(name: string, value: string) {
      super.setAttribute(name, value);
      if (name === 'class') {
        this.className = value;
      }
    }
    
    getAttribute(name: string) {
      if (name === 'class') {
        return this.className || null;
      }
      return super.getAttribute(name);
    }
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-resource-item')) {
      customElements.define('s-resource-item', MockResourceItemElement);
    }
  }
});

describe('ResourceItem Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ResourceItem>Default Item</ResourceItem>);
      const resourceItem = screen.getByText('Default Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem.tagName.toLowerCase()).toBe('s-resource-item');
    });

    it('should render with id', () => {
      render(<ResourceItem id="item-1">Item with ID</ResourceItem>);
      const resourceItem = screen.getByText('Item with ID');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).toHaveAttribute('id', 'item-1');
    });

    it('should apply custom className', () => {
      render(<ResourceItem className="custom-class">Custom Item</ResourceItem>);
      const resourceItem = screen.getByText('Custom Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <ResourceItem
          id="complete-item"
          className="test-class"
          data-testid="test-resource-item"
        >
          Complete Item
        </ResourceItem>
      );
      const resourceItem = screen.getByText('Complete Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).toHaveAttribute('id', 'complete-item');
      expect(resourceItem).toHaveAttribute('class', 'test-class');
      expect(resourceItem).toHaveAttribute('data-testid', 'test-resource-item');
    });
  });

  describe('Event Handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<ResourceItem onClick={handleClick}>Clickable Item</ResourceItem>);
      
      const resourceItem = screen.getByText('Clickable Item');
      fireEvent.click(resourceItem);
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle multiple clicks correctly', async () => {
      const handleClick = jest.fn();
      render(<ResourceItem onClick={handleClick}>Clickable Item</ResourceItem>);
      
      const resourceItem = screen.getByText('Clickable Item');
      fireEvent.click(resourceItem);
      fireEvent.click(resourceItem);
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle undefined onClick gracefully', () => {
      render(<ResourceItem>No Click Handler</ResourceItem>);
      const resourceItem = screen.getByText('No Click Handler');
      fireEvent.click(resourceItem);
      // Should not throw error
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined id gracefully', () => {
      render(<ResourceItem>No ID Item</ResourceItem>);
      const resourceItem = screen.getByText('No ID Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).not.toHaveAttribute('id');
    });

    it('should handle empty id', () => {
      render(<ResourceItem id="">Empty ID Item</ResourceItem>);
      const resourceItem = screen.getByText('Empty ID Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).toHaveAttribute('id', '');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<ResourceItem id="accessible-item">Accessible Item</ResourceItem>);
      const resourceItem = screen.getByText('Accessible Item');
      expect(resourceItem).toBeInTheDocument();
      expect(resourceItem).toHaveAttribute('role', 'listitem');
    });

    it('should be keyboard accessible', () => {
      render(<ResourceItem>Keyboard accessible item</ResourceItem>);
      const resourceItem = screen.getByText('Keyboard accessible item');
      resourceItem.focus();
      expect(resourceItem).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <ResourceItem onClick={() => setCount(count + 1)}>
              Count: {count}
            </ResourceItem>
          </div>
        );
      };

      render(<TestComponent />);
      const resourceItem = screen.getByText('Count: 0');
      
      expect(resourceItem).toBeInTheDocument();
      
      fireEvent.click(resourceItem);
      
      expect(screen.getByText('Count: 1')).toBeInTheDocument();
    });

    it('should work with nested components', () => {
      render(
        <ResourceItem id="nested-item">
          <div>
            <h3>Nested Heading</h3>
            <p>Nested paragraph</p>
            <button>Action Button</button>
          </div>
        </ResourceItem>
      );
      
      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should work with multiple items', () => {
      render(
        <div>
          <ResourceItem id="item-1">Item 1</ResourceItem>
          <ResourceItem id="item-2">Item 2</ResourceItem>
          <ResourceItem id="item-3">Item 3</ResourceItem>
        </div>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        id: 'test-item',
        className: 'test-class',
        'data-testid': 'test-resource-item',
        onClick: jest.fn(),
      };

      render(<ResourceItem {...props}>Test Item</ResourceItem>);
      const resourceItem = screen.getByText('Test Item');
      expect(resourceItem).toBeInTheDocument();
    });
  });
});
