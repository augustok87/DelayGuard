/**
 * Button Web Component Simple Tests
 * 
 * These tests verify the Button component logic without
 * relying on custom elements registration.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';

// Mock the Web Component by creating a simple div
const mockWebComponent = (tagName: string, props: any) => {
  const element = document.createElement('div');
  element.setAttribute('data-testid', 'mock-web-component');
  element.setAttribute('data-tag', tagName);
  
  // Apply props as attributes
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  });
  
  return element;
};

// Mock the s-button element
Object.defineProperty(global, 'customElements', {
  value: {
    define: jest.fn(),
    get: jest.fn(() => undefined),
    whenDefined: jest.fn(() => Promise.resolve()),
  },
  writable: true,
});

// Mock React.createElement to use our mock
const originalCreateElement = React.createElement;
React.createElement = jest.fn((type, props, ...children) => {
  if (typeof type === 'string' && type.startsWith('s-')) {
    const element = mockWebComponent(type, props);
    element.innerHTML = children.join('');
    return element;
  }
  return originalCreateElement(type, props, ...children);
});

describe('Button Web Component (Simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render with correct variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('variant', 'secondary');
    });

    it('should render with correct size', () => {
      render(<Button size="large">Large Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('size', 'large');
    });

    it('should render in loading state', () => {
      render(<Button loading>Loading Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('loading', 'true');
      expect(element).toHaveAttribute('disabled', 'true');
    });

    it('should render as disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('disabled', 'true');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(<Button data-testid="test-button">Test Button</Button>);
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should handle all variant types', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'destructive'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant} Button</Button>);
        const element = screen.getByTestId('mock-web-component');
        expect(element).toHaveAttribute('variant', variant);
        unmount();
      });
    });

    it('should handle all size types', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>{size} Button</Button>);
        const element = screen.getByTestId('mock-web-component');
        expect(element).toHaveAttribute('size', size);
        unmount();
      });
    });

    it('should handle boolean props correctly', () => {
      render(<Button disabled loading>Button</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('disabled', 'true');
      expect(element).toHaveAttribute('loading', 'true');
    });
  });

  describe('Event Handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const element = screen.getByTestId('mock-web-component');
      
      // Simulate the polaris-click event
      const event = new CustomEvent('polaris-click');
      element.dispatchEvent(event);
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      const element = screen.getByTestId('mock-web-component');
      
      // Simulate the polaris-click event
      const event = new CustomEvent('polaris-click');
      element.dispatchEvent(event);
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      const element = screen.getByTestId('mock-web-component');
      
      // Simulate the polaris-click event
      const event = new CustomEvent('polaris-click');
      element.dispatchEvent(event);
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      const element = screen.getByTestId('mock-web-component');
      expect(element).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Keyboard accessible</Button>);
      const element = screen.getByTestId('mock-web-component');
      element.focus();
      expect(element).toHaveFocus();
    });
  });
});
