import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '../../setup/test-utils';
import { Card } from '../../../src/components/ui/Card/Card.memo';

describe('Card', () => {
  it('renders with children content', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <Card title="Card Title" subtitle="Card subtitle">
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card subtitle')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = (
      <button>Action Button</button>
    );
    
    render(
      <Card title="Card Title" actions={actions}>
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <Card loading>
        <p>This should not be visible</p>
      </Card>,
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('This should not be visible')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-card">
        <p>Card content</p>
      </Card>,
    );
    
    const card = screen.getByText('Card content').closest('.card');
    expect(card).toHaveClass('custom-card');
  });

  it('renders without header when no title, subtitle, or actions', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>,
    );
    
    // Should not have header section
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('memoizes correctly with same props', () => {
    const { rerender } = render(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    
    // Re-render with same props
    rerender(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    );
    
    // Should still be in document (memoized)
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('re-renders when props change', () => {
    const { rerender } = render(
      <Card title="Original Title">
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('Original Title')).toBeInTheDocument();
    
    // Change title
    rerender(
      <Card title="New Title">
        <p>Card content</p>
      </Card>,
    );
    
    expect(screen.getByText('New Title')).toBeInTheDocument();
    expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
  });

  it('handles complex children content', () => {
    const complexContent = (
      <div>
        <h3>Nested Title</h3>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    );
    
    render(
      <Card title="Parent Card">
        {complexContent}
      </Card>,
    );
    
    expect(screen.getByText('Parent Card')).toBeInTheDocument();
    expect(screen.getByText('Nested Title')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
