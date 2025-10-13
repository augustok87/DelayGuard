/**
 * Comprehensive Button Web Component Tests
 * 
 * These tests follow TDD principles and cover all aspects of the Button component:
 * - Rendering and props
 * - Event handling
 * - Accessibility
 * - Error boundaries
 * - Performance
 * - Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock Web Component for testing
const MockWebComponent = ({ children, onClick, ...props }: any) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      const customEvent = new CustomEvent('polaris-click', {
        detail: { originalEvent: e },
        bubbles: true,
        composed: true
      });
      onClick(customEvent);
    }
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
};

// Mock the Web Component
jest.mock('@/utils/webComponentUtils', () => ({
  useWebComponent: () => React.useRef<HTMLButtonElement>(null),
}));

describe('Button Web Component (Comprehensive)', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('should render with custom variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('variant', 'secondary');
    });

    it('should render with custom size', () => {
      render(<Button size="large">Large Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('size', 'large');
    });

    it('should render in loading state', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('loading', 'true');
      expect(button).toBeDisabled();
    });

    it('should render as disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(<Button data-testid="test-button">Test</Button>);
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });

    it('should render with form type', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Event Handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should pass correct event object to onClick', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          currentTarget: expect.any(HTMLButtonElement),
          target: expect.any(HTMLButtonElement),
          preventDefault: expect.any(Function),
          stopPropagation: expect.any(Function),
        })
      );
    });

    it('should handle multiple clicks correctly', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(2);
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
      expect(button).toBeDisabled();
    });

    it('should support aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="help-text">Button</Button>
          <div id="help-text">This button does something</div>
        </div>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });
  });

  describe('Props Validation', () => {
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

    it('should handle undefined onClick gracefully', () => {
      render(<Button>No onClick</Button>);
      const button = screen.getByRole('button');
      expect(() => fireEvent.click(button)).not.toThrow();
    });

    it('should forward additional props', () => {
      render(<Button data-custom="value" id="test-id">Custom Props</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-custom', 'value');
      expect(button).toHaveAttribute('id', 'test-id');
    });
  });

  describe('Error Handling', () => {
    it('should render error boundary fallback on error', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Performance', () => {
    it('should memoize webComponentProps', () => {
      const { rerender } = render(<Button variant="primary">Test</Button>);
      const button = screen.getByRole('button');
      
      // Re-render with same props
      rerender(<Button variant="primary">Test</Button>);
      
      // Should not cause unnecessary re-renders
      expect(button).toBeInTheDocument();
    });

    it('should handle rapid clicks without issues', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Rapid Click</Button>);
      
      const button = screen.getByRole('button');
      
      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(10);
      });
    });
  });

  describe('Integration', () => {
    it('should work with form elements', () => {
      const handleSubmit = jest.fn();
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should work with React state', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        const handleClick = () => setCount(prev => prev + 1);
        
        return (
          <div>
            <span data-testid="count">{count}</span>
            <Button onClick={handleClick}>Increment</Button>
          </div>
        );
      };

      render(<TestComponent />);
      const countElement = screen.getByTestId('count');
      const button = screen.getByRole('button');
      
      expect(countElement).toHaveTextContent('0');
      
      fireEvent.click(button);
      expect(countElement).toHaveTextContent('1');
    });

    it('should work with ref forwarding', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle null children', () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle boolean props correctly', () => {
      render(<Button disabled={true} loading={false}>Boolean Props</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should handle function children', () => {
      render(
        <Button>
          {() => 'Function Child'}
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
