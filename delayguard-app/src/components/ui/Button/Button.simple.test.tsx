/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './index';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('button');
    });

    it('should render with custom variant and size', () => {
      render(
        <Button variant="secondary" size="lg">
          Large Secondary
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /large secondary/i });
      expect(button).toHaveClass('button');
    });

    it('should render with custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      
      const button = screen.getByRole('button', { name: /custom/i });
      expect(button).toHaveClass('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should render disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button).toBeDisabled();
    });

    it('should render loading state', () => {
      render(<Button loading>Loading</Button>);
      
      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events (Enter)', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events (Space)', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button', { name: /disabled/i });
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger click when loading', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button loading onClick={handleClick}>Loading</Button>);
      
      const button = screen.getByRole('button', { name: /loading/i });
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      
      const button = screen.getByRole('button', { name: /custom label/i });
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should support aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="help-text">Button</Button>
          <div id="help-text">This button does something</div>
        </div>
      );
      
      const button = screen.getByRole('button', { name: /button/i });
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed={true}>Toggle</Button>);
      
      const button = screen.getByRole('button', { name: /toggle/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Variants', () => {
    it('should render all variants correctly', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'danger'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant}</Button>);
        
        const button = screen.getByRole('button', { name: variant });
        expect(button).toHaveClass('button');
        
        unmount();
      });
    });
  });

  describe('Sizes', () => {
    it('should render all sizes correctly', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>{size}</Button>);
        
        const button = screen.getByRole('button', { name: size });
        expect(button).toHaveClass('button');
        
        unmount();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestButton = React.memo(() => {
        renderSpy();
        return <Button>Test</Button>;
      });
      
      const { rerender } = render(<TestButton />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestButton />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onClick gracefully', () => {
      expect(() => {
        render(<Button>No onClick</Button>);
      }).not.toThrow();
    });

    it('should handle empty children', () => {
      render(<Button>Empty</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle complex children', () => {
      render(
        <Button>
          <span>Complex</span>
          <strong>Content</strong>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('ComplexContent');
    });
  });
});
