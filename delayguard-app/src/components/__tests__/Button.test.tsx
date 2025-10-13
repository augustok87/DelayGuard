/**
 * Button Web Component Tests
 * 
 * These tests follow TDD principles and test the Button component
 * as it will work with Polaris Web Components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';

// Web Components are registered globally in jest.setup.ts

describe('Button Web Component', () => {
  describe('Rendering', () => {
    it('should render with correct text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('should render with correct variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('variant', 'secondary');
    });

    it('should render with correct size', () => {
      render(<Button size="large">Large Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('size', 'large');
    });

    it('should render in loading state', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('loading', 'true');
      expect(button).toHaveAttribute('disabled', 'true');
    });

    it('should render as disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled', 'true');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(<Button data-testid="test-button">Test Button</Button>);
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent(button, new CustomEvent('polaris-click'));
      
      await waitFor(() => {
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    it('should handle multiple clicks correctly', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
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
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Keyboard accessible</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      render(<Button loading aria-label="Loading">Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined onClick gracefully', () => {
      render(<Button>No onClick</Button>);
      const button = screen.getByRole('button');
      fireEvent(button, new CustomEvent('polaris-click'));
      // Should not throw error
    });

    it('should handle all variant types', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'destructive'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant} Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('variant', variant);
        unmount();
      });
    });

    it('should handle all size types', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>{size} Button</Button>);
        const button = screen.getByRole('button');
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
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should work with React state', () => {
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
      const button = screen.getByRole('button');
      
      expect(countElement).toHaveTextContent('0');
      
      fireEvent(button, new CustomEvent('polaris-click'));
      expect(countElement).toHaveTextContent('1');
    });
  });
});
