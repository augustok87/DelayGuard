/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Card Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Card component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Card } from '../Card';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-card
  class MockCardElement extends HTMLElement {
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
    if (!customElements.get('s-card')) {
      customElements.define('s-card', MockCardElement);
    }
  }
});

describe('Card Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Card>Default Card Content</Card>);
      const card = screen.getByText('Default Card Content');
      expect(card).toBeInTheDocument();
      expect(card.tagName.toLowerCase()).toBe('s-card');
    });

    it('should render with title', () => {
      render(<Card title="Card Title">Card Content</Card>);
      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('title', 'Card Title');
    });

    it('should render as sectioned', () => {
      render(<Card sectioned>Sectioned Card</Card>);
      const card = screen.getByText('Sectioned Card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('sectioned', 'true');
    });

    it('should render as subdued', () => {
      render(<Card subdued>Subdued Card</Card>);
      const card = screen.getByText('Subdued Card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('subdued', 'true');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Custom Card</Card>);
      const card = screen.getByText('Custom Card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Card 
          title="Complete Card" 
          sectioned 
          subdued 
          className="test-class"
          data-testid="complete-card"
        >
          Complete Card Content
        </Card>
      );
      const card = screen.getByText('Complete Card Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('title', 'Complete Card');
      expect(card).toHaveAttribute('sectioned', 'true');
      expect(card).toHaveAttribute('subdued', 'true');
      expect(card).toHaveAttribute('class', 'test-class');
      expect(card).toHaveAttribute('data-testid', 'complete-card');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined title gracefully', () => {
      render(<Card>No Title Card</Card>);
      const card = screen.getByText('No Title Card');
      expect(card).toBeInTheDocument();
      expect(card).not.toHaveAttribute('title');
    });

    it('should handle empty title', () => {
      render(<Card title="">Empty Title Card</Card>);
      const card = screen.getByText('Empty Title Card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('title', '');
    });

    it('should handle boolean props correctly', () => {
      render(<Card sectioned={true} subdued={false}>Boolean Props Card</Card>);
      const card = screen.getByText('Boolean Props Card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('sectioned', 'true');
      expect(card).toHaveAttribute('subdued', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Card title="Accessible Card">Accessible Content</Card>);
      const card = screen.getByText('Accessible Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('role', 'region');
    });

    it('should be keyboard accessible', () => {
      render(<Card>Keyboard accessible card</Card>);
      const card = screen.getByText('Keyboard accessible card');
      card.focus();
      expect(card).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [content, setContent] = React.useState('Initial Content');
        return (
          <div>
            <Card title="State Card">{content}</Card>
            <button onClick={() => setContent('Updated Content')}>Update</button>
          </div>
        );
      };

      render(<TestComponent />);
      const card = screen.getByText('Initial Content');
      const button = screen.getByText('Update');
      
      expect(card).toBeInTheDocument();
      
      fireEvent.click(button);
      
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });

    it('should work with nested components', () => {
      render(
        <Card title="Nested Card">
          <div>
            <h3>Nested Heading</h3>
            <p>Nested paragraph</p>
          </div>
        </Card>
      );
      
      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        title: 'Test Card',
        sectioned: true,
        subdued: false,
        className: 'test-class',
        'data-testid': 'test-card',
      };

      render(<Card {...props}>Test Content</Card>);
      const card = screen.getByText('Test Content');
      expect(card).toBeInTheDocument();
    });
  });
});
