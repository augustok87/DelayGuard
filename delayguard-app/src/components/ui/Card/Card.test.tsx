/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Card } from './index';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('card');
    });

    it('should render with title', () => {
      render(<Card title="Card Title">Card content</Card>);
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with actions', () => {
      const actions = [
        { label: 'Action 1', onClick: jest.fn() },
        { label: 'Action 2', onClick: jest.fn() }
      ];
      
      render(<Card actions={actions}>Card content</Card>);
      
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Card className="custom-card">Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toHaveClass('card', 'custom-card');
    });

    it('should render with loading state', () => {
      render(<Card loading>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toHaveClass('card', 'loading');
    });

    it('should render with different variants', () => {
      const variants = ['default', 'outlined', 'elevated'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <Card variant={variant}>{variant} card</Card>
        );
        
        const card = screen.getByText(`${variant} card`);
        expect(card).toHaveClass('card', variant);
        
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async () => {
      const { container } = render(<Card>Accessible card</Card>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure with title', () => {
      render(<Card title="Card Title">Card content</Card>);
      
      const heading = screen.getByRole('heading', { name: /card title/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should support custom heading level', () => {
      render(<Card title="Card Title" titleLevel={2}>Card content</Card>);
      
      const heading = screen.getByRole('heading', { name: /card title/i });
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Actions', () => {
    it('should handle action clicks', async () => {
      const user = userEvent.setup();
      const handleAction1 = jest.fn();
      const handleAction2 = jest.fn();
      
      const actions = [
        { label: 'Action 1', onClick: handleAction1 },
        { label: 'Action 2', onClick: handleAction2 }
      ];
      
      render(<Card actions={actions}>Card content</Card>);
      
      await user.click(screen.getByText('Action 1'));
      expect(handleAction1).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByText('Action 2'));
      expect(handleAction2).toHaveBeenCalledTimes(1);
    });

    it('should handle disabled actions', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();
      
      const actions = [
        { label: 'Disabled Action', onClick: handleAction, disabled: true }
      ];
      
      render(<Card actions={actions}>Card content</Card>);
      
      const actionButton = screen.getByText('Disabled Action');
      expect(actionButton).toBeDisabled();
      
      await user.click(actionButton);
      expect(handleAction).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestCard = React.memo(() => {
        renderSpy();
        return <Card>Test</Card>;
      });
      
      const { rerender } = render(<TestCard />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestCard />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty actions array', () => {
      render(<Card actions={[]}>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
    });

    it('should handle undefined title', () => {
      render(<Card title={undefined}>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
    });

    it('should handle complex children', () => {
      render(
        <Card>
          <div>
            <h4>Complex</h4>
            <p>Content</p>
          </div>
        </Card>
      );
      
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
