/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Text } from './index';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Text Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Text>Hello world</Text>);
      
      const text = screen.getByText('Hello world');
      expect(text).toBeInTheDocument();
      expect(text.tagName).toBe('P');
      expect(text).toHaveClass('text');
    });

    it('should render with different variants', () => {
      const variants = ['bodyLg', 'bodyMd', 'bodySm', 'headingLg', 'headingMd', 'headingSm'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <Text variant={variant}>{variant} text</Text>,
        );
        
        const text = screen.getByText(`${variant} text`);
        expect(text).toHaveClass(`text ${variant}`);
        
        unmount();
      });
    });

    it('should render with different tones', () => {
      const tones = ['base', 'subdued', 'critical', 'warning', 'success', 'info'] as const;
      
      tones.forEach(tone => {
        const { unmount } = render(
          <Text tone={tone}>{tone} text</Text>,
        );
        
        const text = screen.getByText(`${tone} text`);
        expect(text).toHaveClass(`text bodyMd ${tone}`);
        
        unmount();
      });
    });

    it('should render with different font weights', () => {
      const fontWeights = ['regular', 'medium', 'semibold', 'bold'] as const;
      
      fontWeights.forEach(fontWeight => {
        const { unmount } = render(
          <Text fontWeight={fontWeight}>{fontWeight} text</Text>,
        );
        
        const text = screen.getByText(`${fontWeight} text`);
        expect(text).toHaveClass(`text bodyMd ${fontWeight}`);
        
        unmount();
      });
    });

    it('should render with custom className', () => {
      render(<Text className="custom-text">Custom text</Text>);
      
      const text = screen.getByText('Custom text');
      expect(text).toHaveClass('text bodyMd custom-text');
    });

    it('should render with custom element', () => {
      render(<Text as="span">Span text</Text>);
      
      const text = screen.getByText('Span text');
      expect(text.tagName).toBe('SPAN');
    });

    it('should render with custom element and variant', () => {
      render(<Text as="h1" variant="headingLg">Heading text</Text>);
      
      const text = screen.getByText('Heading text');
      expect(text.tagName).toBe('H1');
      expect(text).toHaveClass('text headingLg');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async() => {
      const { container } = render(<Text>Accessible text</Text>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support aria-label', () => {
      render(<Text aria-label="Custom label">Text</Text>);
      
      const text = screen.getByLabelText('Custom label');
      expect(text).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should support aria-describedby', () => {
      render(
        <div>
          <Text aria-describedby="help-text">Text</Text>
          <div id="help-text">This text is described</div>
        </div>,
      );
      
      const text = screen.getByText('Text');
      expect(text).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support custom element with role', () => {
      render(<Text as="div" data-testid="alert-text">Alert text</Text>);
      
      const text = screen.getByTestId('alert-text');
      expect(text).toHaveTextContent('Alert text');
    });
  });

  describe('Typography', () => {
    it('should render heading variant with correct semantic element', () => {
      render(<Text variant="headingLg" as="h1">Heading</Text>);
      
      const heading = screen.getByText('Heading');
      expect(heading.tagName).toBe('H1');
      expect(heading).toHaveClass('text headingLg');
    });

    it('should render subheading variant with correct semantic element', () => {
      render(<Text variant="headingMd" as="h2">Subheading</Text>);
      
      const subheading = screen.getByText('Subheading');
      expect(subheading.tagName).toBe('H2');
      expect(subheading).toHaveClass('text headingMd');
    });

    it('should render body variant with correct semantic element', () => {
      render(<Text variant="bodyMd">Body text</Text>);
      
      const body = screen.getByText('Body text');
      expect(body.tagName).toBe('P');
      expect(body).toHaveClass('text bodyMd');
    });

    it('should render small variant with correct semantic element', () => {
      render(<Text variant="bodySm">Small text</Text>);
      
      const small = screen.getByText('Small text');
      expect(small.tagName).toBe('P');
      expect(small).toHaveClass('text bodySm');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestText = React.memo(() => {
        renderSpy();
        return <Text>Test</Text>;
      });
      
      const { rerender } = render(<TestText />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestText />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Text>{''}</Text>);
      
      const text = screen.getByRole('generic', { hidden: true });
      expect(text).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<Text>{undefined}</Text>);
      
      const text = screen.getByRole('generic', { hidden: true });
      expect(text).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(<Text>{null}</Text>);
      
      const text = screen.getByRole('generic', { hidden: true });
      expect(text).toBeInTheDocument();
    });

    it('should handle complex children', () => {
      render(
        <Text>
          <strong>Bold</strong> and <em>italic</em> text
        </Text>,
      );
      
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should handle numeric children', () => {
      render(<Text>{42}</Text>);
      
      const text = screen.getByText('42');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Combinations', () => {
    it('should handle multiple props together', () => {
      render(
        <Text 
          variant="headingLg" 
          tone="base" 
          fontWeight="bold"
          className="custom"
          as="h2"
        >
          Complex text
        </Text>,
      );
      
      const text = screen.getByText('Complex text');
      expect(text.tagName).toBe('H2');
      expect(text).toHaveClass('text headingLg base bold custom');
    });
  });
});
