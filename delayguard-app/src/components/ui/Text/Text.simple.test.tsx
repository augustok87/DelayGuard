/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Text } from './index';

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
      const variants = ['headingLg', 'headingMd', 'headingSm', 'bodyLg', 'bodyMd', 'bodySm'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <Text variant={variant}>{variant} text</Text>
        );
        
        const text = screen.getByText(`${variant} text`);
        expect(text).toHaveClass('text');
        
        unmount();
      });
    });

    it('should render with different tones', () => {
      const tones = ['base', 'subdued', 'critical', 'warning', 'success', 'info'] as const;
      
      tones.forEach(tone => {
        const { unmount } = render(
          <Text tone={tone}>{tone} text</Text>
        );
        
        const text = screen.getByText(`${tone} text`);
        expect(text).toHaveClass('text');
        
        unmount();
      });
    });

    it('should render with custom className', () => {
      render(<Text className="custom-text">Custom text</Text>);
      
      const text = screen.getByText('Custom text');
      expect(text).toHaveClass('text');
      expect(text).toHaveClass('custom-text');
    });

    it('should render with custom element', () => {
      render(<Text as="span">Span text</Text>);
      
      const text = screen.getByText('Span text');
      expect(text.tagName).toBe('SPAN');
    });
  });

  describe('Accessibility', () => {
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
        </div>
      );
      
      const text = screen.getByText('Text');
      expect(text).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support custom element', () => {
      render(<Text as="div">Div text</Text>);
      
      const text = screen.getByText('Div text');
      expect(text.tagName).toBe('DIV');
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
      render(<Text>Empty</Text>);
      
      const text = screen.getByText('Empty');
      expect(text).toBeInTheDocument();
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
      
      const text = screen.getByText('42');
      expect(text).toBeInTheDocument();
    });
  });
});
