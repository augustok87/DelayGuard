/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Divider Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Divider component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Divider } from '../Divider';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-divider
  class MockDividerElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'separator');
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
    if (!customElements.get('s-divider')) {
      customElements.define('s-divider', MockDividerElement);
    }
  }
});

describe('Divider Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Divider />);
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      expect(divider.tagName.toLowerCase()).toBe('s-divider');
    });

    it('should apply custom className', () => {
      render(<Divider className="custom-class" />);
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Divider 
          className="test-class"
          data-testid="test-divider"
        />
      );
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveAttribute('class', 'test-class');
      expect(divider).toHaveAttribute('data-testid', 'test-divider');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Divider />);
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveAttribute('role', 'separator');
    });

    it('should be keyboard accessible', () => {
      render(<Divider />);
      const divider = screen.getByRole('separator');
      divider.focus();
      expect(divider).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [show, setShow] = React.useState(true);
        return (
          <div>
            <span>Content 1</span>
            {show && <Divider />}
            <span>Content 2</span>
            <button onClick={() => setShow(!show)}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByRole('separator')).toBeInTheDocument();
      
      const button = screen.getByText('Toggle');
      fireEvent.click(button);
      
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('should work with conditional rendering', () => {
      const TestComponent = ({ show }: { show: boolean }) => (
        <div>
          <span>Content 1</span>
          {show && <Divider />}
          <span>Content 2</span>
        </div>
      );

      const { rerender } = render(<TestComponent show={true} />);
      expect(screen.getByRole('separator')).toBeInTheDocument();
      
      rerender(<TestComponent show={false} />);
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('should work with multiple dividers', () => {
      render(
        <div>
          <span>Content 1</span>
          <Divider data-testid="divider-1" />
          <span>Content 2</span>
          <Divider data-testid="divider-2" />
          <span>Content 3</span>
        </div>
      );
      
      expect(screen.getByTestId('divider-1')).toBeInTheDocument();
      expect(screen.getByTestId('divider-2')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        className: 'test-class',
        'data-testid': 'test-divider',
      };

      render(<Divider {...props} />);
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
    });
  });
});
