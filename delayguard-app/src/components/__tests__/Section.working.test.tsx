/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Section Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Section component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Section } from '../Section';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-section
  class MockSectionElement extends HTMLElement {
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
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-section')) {
      customElements.define('s-section', MockSectionElement);
    }
  }
});

describe('Section Web Component - Working Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Section>Default Section Content</Section>);
      const section = screen.getByText('Default Section Content');
      expect(section).toBeInTheDocument();
      expect(section.tagName.toLowerCase()).toBe('s-section');
    });

    it('should render with title', () => {
      render(<Section title="Section Title">Section Content</Section>);
      const section = screen.getByText('Section Content');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('title', 'Section Title');
    });

    it('should render as sectioned', () => {
      render(<Section sectioned>Sectioned Section</Section>);
      const section = screen.getByText('Sectioned Section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('sectioned', 'true');
    });

    it('should render as subdued', () => {
      render(<Section subdued>Subdued Section</Section>);
      const section = screen.getByText('Subdued Section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('subdued', 'true');
    });

    it('should apply custom className', () => {
      render(<Section className="custom-class">Custom Section</Section>);
      const section = screen.getByText('Custom Section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Section 
          title="Complete Section" 
          sectioned 
          subdued 
          className="test-class"
          data-testid="complete-section"
        >
          Complete Section Content
        </Section>
      );
      const section = screen.getByText('Complete Section Content');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('title', 'Complete Section');
      expect(section).toHaveAttribute('sectioned', 'true');
      expect(section).toHaveAttribute('subdued', 'true');
      expect(section).toHaveAttribute('class', 'test-class');
      expect(section).toHaveAttribute('data-testid', 'complete-section');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined title gracefully', () => {
      render(<Section>No Title Section</Section>);
      const section = screen.getByText('No Title Section');
      expect(section).toBeInTheDocument();
      expect(section).not.toHaveAttribute('title');
    });

    it('should handle empty title', () => {
      render(<Section title="">Empty Title Section</Section>);
      const section = screen.getByText('Empty Title Section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('title', '');
    });

    it('should handle boolean props correctly', () => {
      render(<Section sectioned={true} subdued={false}>Boolean Props Section</Section>);
      const section = screen.getByText('Boolean Props Section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('sectioned', 'true');
      expect(section).toHaveAttribute('subdued', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Section title="Accessible Section">Accessible Content</Section>);
      const section = screen.getByText('Accessible Content');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('role', 'region');
    });

    it('should be keyboard accessible', () => {
      render(<Section>Keyboard accessible section</Section>);
      const section = screen.getByText('Keyboard accessible section');
      section.focus();
      expect(section).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [content, setContent] = React.useState('Initial Content');
        return (
          <div>
            <Section title="State Section">{content}</Section>
            <button onClick={() => setContent('Updated Content')}>Update</button>
          </div>
        );
      };

      render(<TestComponent />);
      const section = screen.getByText('Initial Content');
      const button = screen.getByText('Update');
      
      expect(section).toBeInTheDocument();
      
      fireEvent.click(button);
      
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });

    it('should work with nested components', () => {
      render(
        <Section title="Nested Section">
          <div>
            <h3>Nested Heading</h3>
            <p>Nested paragraph</p>
            <button>Action Button</button>
          </div>
        </Section>
      );
      
      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        title: 'Test Section',
        sectioned: true,
        subdued: false,
        className: 'test-class',
        'data-testid': 'test-section',
      };

      render(<Section {...props}>Test Content</Section>);
      const section = screen.getByText('Test Content');
      expect(section).toBeInTheDocument();
    });
  });
});
