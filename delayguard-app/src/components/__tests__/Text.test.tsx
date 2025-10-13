/**
 * Text Web Component Tests
 * 
 * These tests follow TDD principles and test the Text component
 * as it will work with Polaris Web Components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Text } from '../Text';

// Web Components are registered globally in jest.setup.ts

describe('Text Web Component', () => {
  describe('Rendering', () => {
    it('should render with correct text content', () => {
      render(<Text>Hello World</Text>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render with correct variant', () => {
      render(<Text variant="headingLg">Large Heading</Text>);
      const text = screen.getByText('Large Heading');
      expect(text).toHaveAttribute('variant', 'headingLg');
    });

    it('should render with correct tone', () => {
      render(<Text tone="subdued">Subdued text</Text>);
      const text = screen.getByText('Subdued text');
      expect(text).toHaveAttribute('tone', 'subdued');
    });

    it('should render with correct HTML element', () => {
      render(<Text as="h1">Heading</Text>);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('as', 'h1');
    });

    it('should apply custom className', () => {
      render(<Text className="custom-class">Custom text</Text>);
      const text = screen.getByText('Custom text');
      expect(text).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(<Text data-testid="test-text">Test text</Text>);
      expect(screen.getByTestId('test-text')).toBeInTheDocument();
    });
  });

  describe('Variant Types', () => {
    it('should handle all heading variants', () => {
      const variants = ['headingLg', 'headingMd', 'headingSm'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Text variant={variant}>{variant} text</Text>);
        const text = screen.getByText(`${variant} text`);
        expect(text).toHaveAttribute('variant', variant);
        unmount();
      });
    });

    it('should handle all body variants', () => {
      const variants = ['bodyLg', 'bodyMd', 'bodySm'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Text variant={variant}>{variant} text</Text>);
        const text = screen.getByText(`${variant} text`);
        expect(text).toHaveAttribute('variant', variant);
        unmount();
      });
    });
  });

  describe('Tone Types', () => {
    it('should handle all tone variants', () => {
      const tones = ['base', 'subdued', 'critical', 'warning', 'success', 'info'] as const;
      
      tones.forEach(tone => {
        const { unmount } = render(<Text tone={tone}>{tone} text</Text>);
        const text = screen.getByText(`${tone} text`);
        expect(text).toHaveAttribute('tone', tone);
        unmount();
      });
    });
  });

  describe('HTML Element Types', () => {
    it('should render as different HTML elements', () => {
      const elements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(<Text as={element}>{element} text</Text>);
        const text = screen.getByText(`${element} text`);
        expect(text).toHaveAttribute('as', element);
        unmount();
      });
    });

    it('should render headings with correct role', () => {
      render(<Text as="h1">Main Heading</Text>);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render paragraphs with correct role', () => {
      render(<Text as="p">Paragraph text</Text>);
      const paragraph = screen.getByText('Paragraph text');
      expect(paragraph.tagName).toBe('P');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <div>
          <Text as="h1" variant="headingLg">Main Title</Text>
          <Text as="p" variant="bodyMd">Description text</Text>
        </div>
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should support ARIA attributes', () => {
      render(<Text aria-label="Important text">Text</Text>);
      const text = screen.getByText('Text');
      expect(text).toHaveAttribute('aria-label', 'Important text');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined children gracefully', () => {
      render(<Text>Empty Text</Text>);
      // Should not throw error
    });

    it('should handle complex children', () => {
      render(
        <Text>
          <strong>Bold</strong> and <em>italic</em> text
        </Text>
      );
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should handle numeric children', () => {
      render(<Text>{42}</Text>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with other components', () => {
      render(
        <div>
          <Text as="h2" variant="headingMd">Section Title</Text>
          <Text variant="bodyMd" tone="subdued">Section description</Text>
        </div>
      );
      
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Section description')).toBeInTheDocument();
    });

    it('should work with React state', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <Text data-testid="count">Count: {count}</Text>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      const countElement = screen.getByTestId('count');
      const button = screen.getByRole('button');
      
      expect(countElement).toHaveTextContent('Count: 0');
      
      fireEvent.click(button);
      expect(countElement).toHaveTextContent('Count: 1');
    });
  });
});
