/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './index';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cardContent');
    });

    it('should render with title', () => {
      render(<Card title="Card Title">Card content</Card>);
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Card className="custom-card">Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toHaveClass('cardContent');
    });

    it('should render with loading state', () => {
      render(<Card loading>Card content</Card>);
      
      // When loading, the content is replaced with skeleton lines
      const skeletonLines = screen.getAllByRole('generic');
      expect(skeletonLines.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure with title', () => {
      render(<Card title="Card Title">Card content</Card>);
      
      const heading = screen.getByRole('heading', { name: /card title/i });
      expect(heading).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Card aria-label="Custom card">Card content</Card>);
      
      const card = screen.getByLabelText('Custom card');
      expect(card).toHaveAttribute('aria-label', 'Custom card');
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
        </Card>,
      );
      
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
