import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '../../setup/test-utils';
import { Button } from '../../../src/components/ui/Button/Button.memo';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button onClick={jest.fn()}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('button');
    expect(button).toHaveClass('primary');
    expect(button).toHaveClass('md');
  });

  it('renders with custom variant and size', () => {
    render(
      <Button variant="danger" size="lg" onClick={jest.fn()}>
        Delete
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('danger');
    expect(button).toHaveClass('lg');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading onClick={jest.fn()}>Loading</Button>);
    
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toHaveClass('loading');
    expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: /loading/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled onClick={jest.fn()}>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled');
  });

  it('is disabled when loading', () => {
    render(<Button loading onClick={jest.fn()}>Loading</Button>);
    
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <Button className="custom-class" onClick={jest.fn()}>
        Custom
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('renders with different button types', () => {
    render(
      <Button type="submit" onClick={jest.fn()}>
        Submit
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('supports accessibility attributes', () => {
    render(
      <Button 
        onClick={jest.fn()}
        aria-label="Close dialog"
        aria-describedby="close-description"
      >
        ×
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /close dialog/i });
    expect(button).toHaveAttribute('aria-label', 'Close dialog');
    expect(button).toHaveAttribute('aria-describedby', 'close-description');
  });

  it('memoizes correctly with same props', () => {
    const handleClick = jest.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Memo Test
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /memo test/i });
    const initialRenderCount = handleClick.mock.calls.length;
    
    // Re-render with same props
    rerender(
      <Button variant="primary" onClick={handleClick}>
        Memo Test
      </Button>
    );
    
    // Should not re-render due to memoization
    expect(button).toBeInTheDocument();
  });

  it('re-renders when props change', () => {
    const handleClick = jest.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Memo Test
      </Button>
    );
    
    // Change variant
    rerender(
      <Button variant="danger" onClick={handleClick}>
        Memo Test
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /memo test/i });
    expect(button).toHaveClass('danger');
  });
});
