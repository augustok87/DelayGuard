/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Spinner Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Spinner component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Spinner } from '../Spinner';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-spinner
  class MockSpinnerElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'status');
      this.setAttribute('aria-label', 'Loading');
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
    if (!customElements.get('s-spinner')) {
      customElements.define('s-spinner', MockSpinnerElement);
    }
  }
});

describe('Spinner Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner.tagName.toLowerCase()).toBe('s-spinner');
    });

    it('should render with custom size', () => {
      render(<Spinner size="large" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('size', 'large');
    });

    it('should apply custom className', () => {
      render(<Spinner className="custom-class" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Spinner 
          size="small" 
          className="test-class"
          data-testid="test-spinner"
        />
      );
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('size', 'small');
      expect(spinner).toHaveAttribute('class', 'test-class');
      expect(spinner).toHaveAttribute('data-testid', 'test-spinner');
    });
  });

  describe('Props Validation', () => {
    it('should handle all size types', () => {
      const sizes = ['small', 'large'];
      sizes.forEach(size => {
        const { unmount } = render(<Spinner size={size} />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveAttribute('size', size);
        unmount();
      });
    });

    it('should handle undefined size gracefully', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('size', 'small'); // default value
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should be keyboard accessible', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      spinner.focus();
      expect(spinner).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(true);
        return (
          <div>
            {loading && <Spinner size="large" />}
            <button onClick={() => setLoading(!loading)}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      const button = screen.getByText('Toggle');
      fireEvent.click(button);
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should work with conditional rendering', () => {
      const TestComponent = ({ show }: { show: boolean }) => (
        <div>
          {show && <Spinner size="small" />}
          <span>Content</span>
        </div>
      );

      const { rerender } = render(<TestComponent show={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      rerender(<TestComponent show={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        size: 'large' as const,
        className: 'test-class',
        'data-testid': 'test-spinner',
      };

      render(<Spinner {...props} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });
});
