/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Icon Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Icon component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Icon } from '../Icon';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-icon
  class MockIconElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'img');
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
    if (!customElements.get('s-icon')) {
      customElements.define('s-icon', MockIconElement);
    }
  }
});

describe('Icon Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Icon />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName.toLowerCase()).toBe('s-icon');
    });

    it('should render with source', () => {
      render(<Icon source="add" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('source', 'add');
    });

    it('should apply custom className', () => {
      render(<Icon className="custom-class" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Icon 
          source="delete" 
          className="test-class"
          data-testid="test-icon"
        />
      );
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('source', 'delete');
      expect(icon).toHaveAttribute('class', 'test-class');
      expect(icon).toHaveAttribute('data-testid', 'test-icon');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined source gracefully', () => {
      render(<Icon />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).not.toHaveAttribute('source');
    });

    it('should handle empty source', () => {
      render(<Icon source="" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('source', '');
    });

    it('should handle various source types', () => {
      const sources = ['add', 'delete', 'edit', 'save', 'cancel'];
      sources.forEach(source => {
        const { unmount } = render(<Icon source={source} />);
        const icon = screen.getByRole('img');
        expect(icon).toHaveAttribute('source', source);
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Icon source="add" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('role', 'img');
    });

    it('should be keyboard accessible', () => {
      render(<Icon source="add" />);
      const icon = screen.getByRole('img');
      icon.focus();
      expect(icon).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [source, setSource] = React.useState('add');
        return (
          <div>
            <Icon source={source} />
            <button onClick={() => setSource(source === 'add' ? 'delete' : 'add')}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);
      const icon = screen.getByRole('img');
      const button = screen.getByText('Toggle');
      
      expect(icon).toHaveAttribute('source', 'add');
      
      fireEvent.click(button);
      
      expect(icon).toHaveAttribute('source', 'delete');
    });

    it('should work with conditional rendering', () => {
      const TestComponent = ({ show }: { show: boolean }) => (
        <div>
          {show && <Icon source="add" />}
          <span>Content</span>
        </div>
      );

      const { rerender } = render(<TestComponent show={true} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
      
      rerender(<TestComponent show={false} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should work with multiple icons', () => {
      render(
        <div>
          <Icon source="add" data-testid="add-icon" />
          <Icon source="delete" data-testid="delete-icon" />
          <Icon source="edit" data-testid="edit-icon" />
        </div>
      );
      
      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
      expect(screen.getByTestId('delete-icon')).toBeInTheDocument();
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        source: 'add',
        className: 'test-class',
        'data-testid': 'test-icon',
      };

      render(<Icon {...props} />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
    });
  });
});
