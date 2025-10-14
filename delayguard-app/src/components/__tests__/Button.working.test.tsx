/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Button Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Button component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-button
  class MockButtonElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'button');
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

    // Override to ensure proper button behavior
    get role() {
      return 'button';
    }

    get disabled() {
      return this.hasAttribute('disabled') || this.getAttribute('aria-disabled') === 'true';
    }

    click() {
      if (!this.disabled) {
        const event = new CustomEvent('click', { bubbles: true });
        this.dispatchEvent(event);
      }
    }
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-button')) {
      customElements.define('s-button', MockButtonElement);
    }
  }
});

describe('Button Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByText('Default Button');
      expect(button).toBeInTheDocument();
      expect(button.tagName.toLowerCase()).toBe('s-button');
    });

    it('should render with custom variant and size', () => {
      render(<Button variant="secondary" size="large">Large Button</Button>);
      const button = screen.getByText('Large Button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('variant', 'secondary');
      expect(button).toHaveAttribute('size', 'large');
    });

    it('should render in loading state', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByText('Loading Button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('loading', 'true');
      expect(button).toHaveAttribute('disabled', 'true');
    });

    it('should render as disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByText('Disabled Button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('disabled', 'true');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByText('Custom Button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('class', 'custom-class');
    });
  });

  describe('Event Handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByText('Click me');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      const button = screen.getByText('Disabled Button');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      const button = screen.getByText('Loading Button');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    it('should handle multiple clicks correctly', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByText('Click me');
      fireEvent(button, new CustomEvent('polaris-click'));
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      const button = screen.getByText('×');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Keyboard accessible</Button>);
      const button = screen.getByText('Keyboard accessible');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      render(<Button loading aria-label="Loading">Loading</Button>);
      const button = screen.getByText('Loading');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined onClick gracefully', () => {
      render(<Button>No onClick</Button>);
      const button = screen.getByText('No onClick');
      fireEvent(button, new CustomEvent('polaris-click'));
      // Should not throw error
    });

    it('should handle all variant types', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'destructive'];
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant} Button</Button>);
        const button = screen.getByText(`${variant} Button`);
        expect(button).toHaveAttribute('variant', variant);
        unmount();
      });
    });

    it('should handle all size types', () => {
      const sizes = ['small', 'medium', 'large'];
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>{size} Button</Button>);
        const button = screen.getByText(`${size} Button`);
        expect(button).toHaveAttribute('size', size);
        unmount();
      });
    });
  });

  describe('Integration', () => {
    it('should work with form elements', () => {
      render(
        <form>
          <Button type="submit">Submit</Button>
        </form>
      );
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should work with React state', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <span data-testid="count">{count}</span>
            <Button onClick={() => setCount(count + 1)}>Increment</Button>
          </div>
        );
      };

      render(<TestComponent />);
      const countElement = screen.getByTestId('count');
      const button = screen.getByText('Increment');
      
      expect(countElement).toHaveTextContent('0');
      
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(countElement).toHaveTextContent('1');
      });
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        variant: 'primary' as const,
        size: 'medium' as const,
        disabled: true,
        loading: false,
        type: 'button' as const,
        className: 'test-class',
        'data-testid': 'test-button',
        'aria-label': 'Test button',
        'aria-disabled': true,
        onClick: jest.fn(),
      };

      render(<Button {...props}>Test Button</Button>);
      const button = screen.getByText('Test Button');
      expect(button).toBeInTheDocument();
    });
  });
});
