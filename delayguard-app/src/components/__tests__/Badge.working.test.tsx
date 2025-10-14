/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Badge Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Badge component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Badge } from '../Badge';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-badge
  class MockBadgeElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'status');
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
    if (!customElements.get('s-badge')) {
      customElements.define('s-badge', MockBadgeElement);
    }
  }
});

describe('Badge Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText('Default Badge');
      expect(badge).toBeInTheDocument();
      expect(badge.tagName.toLowerCase()).toBe('s-badge');
    });

    it('should render with custom tone', () => {
      render(<Badge tone="success">Success Badge</Badge>);
      const badge = screen.getByText('Success Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('tone', 'success');
    });

    it('should apply custom className', () => {
      render(<Badge className="custom-class">Custom Badge</Badge>);
      const badge = screen.getByText('Custom Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Badge 
          tone="critical" 
          className="test-class"
          data-testid="critical-badge"
        >
          Critical Badge
        </Badge>
      );
      const badge = screen.getByText('Critical Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('tone', 'critical');
      expect(badge).toHaveAttribute('class', 'test-class');
      expect(badge).toHaveAttribute('data-testid', 'critical-badge');
    });
  });

  describe('Props Validation', () => {
    it('should handle all tone types', () => {
      const tones = ['info', 'success', 'warning', 'critical', 'attention'];
      tones.forEach(tone => {
        const { unmount } = render(<Badge tone={tone}>{tone} Badge</Badge>);
        const badge = screen.getByText(`${tone} Badge`);
        expect(badge).toHaveAttribute('tone', tone);
        unmount();
      });
    });

    it('should handle undefined tone gracefully', () => {
      render(<Badge>No Tone Badge</Badge>);
      const badge = screen.getByText('No Tone Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('tone', 'info'); // default value
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Badge>Accessible Badge</Badge>);
      const badge = screen.getByText('Accessible Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('role', 'status');
    });

    it('should be keyboard accessible', () => {
      render(<Badge>Keyboard accessible badge</Badge>);
      const badge = screen.getByText('Keyboard accessible badge');
      badge.focus();
      expect(badge).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [tone, setTone] = React.useState<'info' | 'success'>('info');
        return (
          <div>
            <Badge tone={tone}>Status Badge</Badge>
            <button onClick={() => setTone(tone === 'info' ? 'success' : 'info')}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);
      const badge = screen.getByText('Status Badge');
      const button = screen.getByText('Toggle');
      
      expect(badge).toHaveAttribute('tone', 'info');
      
      fireEvent.click(button);
      
      expect(badge).toHaveAttribute('tone', 'success');
    });

    it('should work with nested components', () => {
      render(
        <Badge tone="warning">
          <span>Warning</span>
          <span>!</span>
        </Badge>
      );
      
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('!')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        tone: 'success' as const,
        className: 'test-class',
        'data-testid': 'test-badge',
      };

      render(<Badge {...props}>Test Badge</Badge>);
      const badge = screen.getByText('Test Badge');
      expect(badge).toBeInTheDocument();
    });
  });
});
