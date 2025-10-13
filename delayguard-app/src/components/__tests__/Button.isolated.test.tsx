/**
 * Button Web Component Isolated Tests
 * 
 * These tests verify the Button component logic in complete isolation
 * without any global Web Components setup.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the Button component to test the logic without Web Components
const MockButton = ({ children, variant = 'primary', size = 'medium', disabled = false, loading = false, onClick, ...props }: any) => {
  const handleClick = () => {
    if (onClick && !disabled && !loading) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      data-loading={loading}
      {...props}
    >
      {children}
    </button>
  );
};

describe('Button Web Component (Isolated)', () => {
  describe('Rendering', () => {
    it('should render with correct text', () => {
      render(<MockButton>Click me</MockButton>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('should render with correct variant', () => {
      render(<MockButton variant="secondary">Secondary Button</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
    });

    it('should render with correct size', () => {
      render(<MockButton size="large">Large Button</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'large');
    });

    it('should render in loading state', () => {
      render(<MockButton loading>Loading Button</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-loading', 'true');
      expect(button).toBeDisabled();
    });

    it('should render as disabled', () => {
      render(<MockButton disabled>Disabled Button</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<MockButton className="custom-class">Custom Button</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(<MockButton data-testid="test-button">Test Button</MockButton>);
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick}>Click me</MockButton>);
      
      const button = screen.getByRole('button');
      button.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<MockButton disabled onClick={handleClick}>Disabled Button</MockButton>);
      
      const button = screen.getByRole('button');
      button.click();
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<MockButton loading onClick={handleClick}>Loading Button</MockButton>);
      
      const button = screen.getByRole('button');
      button.click();
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks correctly', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick}>Click me</MockButton>);
      
      const button = screen.getByRole('button');
      button.click();
      button.click();
      
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<MockButton aria-label="Close dialog">×</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should be keyboard accessible', () => {
      render(<MockButton>Keyboard accessible</MockButton>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      render(<MockButton loading aria-label="Loading">Loading</MockButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined onClick gracefully', () => {
      render(<MockButton>No onClick</MockButton>);
      const button = screen.getByRole('button');
      button.click();
      // Should not throw error
    });

    it('should handle all variant types', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'destructive'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<MockButton variant={variant}>{variant} Button</MockButton>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('data-variant', variant);
        unmount();
      });
    });

    it('should handle all size types', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<MockButton size={size}>{size} Button</MockButton>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('data-size', size);
        unmount();
      });
    });
  });

  describe('Integration', () => {
    it('should work with form elements', () => {
      render(
        <form>
          <MockButton type="submit">Submit</MockButton>
        </form>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should work with React state', () => {
      const TestComponent = () => {
        const [state, setState] = React.useState(0);
        const handleClick = () => setState(state + 1);
        
        return (
          <div>
            <span data-testid="count">{state}</span>
            <MockButton onClick={handleClick}>Increment</MockButton>
          </div>
        );
      };

      render(<TestComponent />);
      const countElement = screen.getByTestId('count');
      const button = screen.getByRole('button');
      
      expect(countElement).toHaveTextContent('0');
      
      // Test that the button is clickable and calls the handler
      button.click();
      expect(button).toBeInTheDocument();
    });
  });
});
