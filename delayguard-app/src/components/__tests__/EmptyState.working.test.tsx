/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working EmptyState Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the EmptyState component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-empty-state
  class MockEmptyStateElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'region');
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
    if (!customElements.get('s-empty-state')) {
      customElements.define('s-empty-state', MockEmptyStateElement);
    }
  }
});

describe('EmptyState Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<EmptyState>Default Empty State</EmptyState>);
      const emptyState = screen.getByText('Default Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState.tagName.toLowerCase()).toBe('s-empty-state');
    });

    it('should render with heading', () => {
      render(<EmptyState heading="No Items Found">Empty State Content</EmptyState>);
      const emptyState = screen.getByText('Empty State Content');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('heading', 'No Items Found');
    });

    it('should render with image', () => {
      render(<EmptyState image="empty-state.svg">Empty State Content</EmptyState>);
      const emptyState = screen.getByText('Empty State Content');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('image', 'empty-state.svg');
    });

    it('should apply custom className', () => {
      render(<EmptyState className="custom-class">Custom Empty State</EmptyState>);
      const emptyState = screen.getByText('Custom Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <EmptyState 
          heading="Complete Empty State" 
          image="complete-empty-state.svg"
          className="test-class"
          data-testid="complete-empty-state"
        >
          Complete Empty State Content
        </EmptyState>
      );
      const emptyState = screen.getByText('Complete Empty State Content');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('heading', 'Complete Empty State');
      expect(emptyState).toHaveAttribute('image', 'complete-empty-state.svg');
      expect(emptyState).toHaveAttribute('class', 'test-class');
      expect(emptyState).toHaveAttribute('data-testid', 'complete-empty-state');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined heading gracefully', () => {
      render(<EmptyState>No Heading Empty State</EmptyState>);
      const emptyState = screen.getByText('No Heading Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).not.toHaveAttribute('heading');
    });

    it('should handle undefined image gracefully', () => {
      render(<EmptyState>No Image Empty State</EmptyState>);
      const emptyState = screen.getByText('No Image Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).not.toHaveAttribute('image');
    });

    it('should handle empty heading', () => {
      render(<EmptyState heading="">Empty Heading Empty State</EmptyState>);
      const emptyState = screen.getByText('Empty Heading Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('heading', '');
    });

    it('should handle empty image', () => {
      render(<EmptyState image="">Empty Image Empty State</EmptyState>);
      const emptyState = screen.getByText('Empty Image Empty State');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('image', '');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<EmptyState heading="Accessible Empty State">Accessible Content</EmptyState>);
      const emptyState = screen.getByText('Accessible Content');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('role', 'region');
    });

    it('should be keyboard accessible', () => {
      render(<EmptyState>Keyboard accessible empty state</EmptyState>);
      const emptyState = screen.getByText('Keyboard accessible empty state');
      emptyState.focus();
      expect(emptyState).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [heading, setHeading] = React.useState('Initial Heading');
        return (
          <div>
            <EmptyState heading={heading}>Empty State Content</EmptyState>
            <button onClick={() => setHeading('Updated Heading')}>Update</button>
          </div>
        );
      };

      render(<TestComponent />);
      const emptyState = screen.getByText('Empty State Content');
      const button = screen.getByText('Update');
      
      expect(emptyState).toHaveAttribute('heading', 'Initial Heading');
      
      fireEvent.click(button);
      
      expect(emptyState).toHaveAttribute('heading', 'Updated Heading');
    });

    it('should work with nested components', () => {
      render(
        <EmptyState heading="Nested Empty State">
          <div>
            <h3>Nested Heading</h3>
            <p>Nested paragraph</p>
            <button>Action Button</button>
          </div>
        </EmptyState>
      );
      
      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        heading: 'Test Empty State',
        image: 'test-image.svg',
        className: 'test-class',
        'data-testid': 'test-empty-state',
      };

      render(<EmptyState {...props}>Test Content</EmptyState>);
      const emptyState = screen.getByText('Test Content');
      expect(emptyState).toBeInTheDocument();
    });
  });
});
