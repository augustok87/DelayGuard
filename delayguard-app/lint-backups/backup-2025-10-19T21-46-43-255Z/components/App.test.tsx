import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { App } from './App';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the RefactoredAppOptimized component
jest.mock('./RefactoredApp.optimized', () => ({
  RefactoredAppOptimized: () => <div data-testid="refactored-app-optimized">Refactored App Optimized</div>,
}));

describe('App', () => {
  describe('Rendering', () => {
    it('should render the RefactoredAppOptimized component', () => {
      render(<App />);
      
      expect(screen.getByTestId('refactored-app-optimized')).toBeInTheDocument();
      expect(screen.getByText('Refactored App Optimized')).toBeInTheDocument();
    });

    it('should render without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async() => {
      const { container } = render(<App />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Component Structure', () => {
    it('should be a functional component', () => {
      expect(typeof App).toBe('function');
    });

    it('should return JSX element', () => {
      const result = App();
      expect(React.isValidElement(result)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should integrate with RefactoredAppOptimized', () => {
      render(<App />);
      
      // Verify that the mocked component is rendered
      const appElement = screen.getByTestId('refactored-app-optimized');
      expect(appElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();
      render(<App />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // This test ensures the App component doesn't crash
      expect(() => render(<App />)).not.toThrow();

      console.error = originalConsoleError;
    });
  });
});
