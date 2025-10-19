/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Tabs } from './index';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Tabs Component', () => {
  const defaultTabs = [
    { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
    { id: 'tab2', label: 'Tab 2', content: 'Content 2' },
    { id: 'tab3', label: 'Tab 3', content: 'Content 3' },
  ];

  const defaultProps = {
    tabs: defaultTabs,
    activeTab: 'tab1',
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      render(<Tabs {...defaultProps} />);
      
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should render active tab content', () => {
      render(<Tabs {...defaultProps} />);
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<Tabs {...defaultProps} />);
      
      const activeTab = screen.getByRole('tab', { name: /tab 1/i });
      expect(activeTab).toHaveClass('active');
    });

    it('should render with custom className', () => {
      render(<Tabs {...defaultProps} className="custom-tabs" />);
      
      const tabsContainer = screen.getByRole('tablist');
      expect(tabsContainer).toHaveClass('tabs custom-tabs');
    });

    it('should render with different active tabs', () => {
      const { rerender } = render(<Tabs {...defaultProps} activeTab="tab2" />);
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      
      rerender(<Tabs {...defaultProps} activeTab="tab1" />);
      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      expect(tab1).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Interactions', () => {
    it('should change active tab when clicked', async() => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      render(<Tabs {...defaultProps} onTabChange={onTabChange} />);
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });
      await user.click(tab2);
      
      expect(onTabChange).toHaveBeenCalledWith('tab2');
    });

    it('should show new tab content after change', async() => {
      const user = userEvent.setup();
      
      const { rerender } = render(<Tabs {...defaultProps} />);
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });
      await user.click(tab2);
      
      // Update props to reflect the change
      rerender(<Tabs {...defaultProps} activeTab="tab2" />);
      
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should handle keyboard navigation', async() => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      render(<Tabs {...defaultProps} onTabChange={onTabChange} />);
      
      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      tab1.focus();
      
      // Arrow right should move to next tab
      await user.keyboard('{ArrowRight}');
      expect(onTabChange).toHaveBeenCalledWith('tab2');
      
      // Arrow left should move to previous tab
      await user.keyboard('{ArrowLeft}');
      expect(onTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should handle disabled tabs', async() => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      const tabsWithDisabled = [
        { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
        { id: 'tab2', label: 'Tab 2', content: 'Content 2', disabled: true },
        { id: 'tab3', label: 'Tab 3', content: 'Content 3' },
      ];
      
      render(
        <Tabs 
          {...defaultProps} 
          tabs={tabsWithDisabled} 
          onTabChange={onTabChange} 
        />,
      );
      
      const disabledTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
      
      await user.click(disabledTab);
      expect(onTabChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async() => {
      const { container } = render(<Tabs {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(<Tabs {...defaultProps} />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      });
      
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby');
    });

    it('should support aria-label', () => {
      render(<Tabs {...defaultProps} aria-label="Custom tabs" />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Custom tabs');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestTabs = React.memo(() => {
        renderSpy();
        return <Tabs {...defaultProps} />;
      });
      
      const { rerender } = render(<TestTabs />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestTabs />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs array', () => {
      render(<Tabs {...defaultProps} tabs={[]} />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('should handle undefined activeTab', () => {
      render(<Tabs {...defaultProps} activeTab={undefined} />);
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should handle invalid activeTab', () => {
      render(<Tabs {...defaultProps} activeTab="invalid" />);
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should handle tabs with complex content', () => {
      const complexTabs = [
        { 
          id: 'tab1', 
          label: 'Tab 1', 
          content: (
            <div>
              <h3>Complex Content</h3>
              <p>With multiple elements</p>
              <button>Action</button>
            </div>
          ),
        },
      ];
      
      render(<Tabs {...defaultProps} tabs={complexTabs} />);
      
      expect(screen.getByText('Complex Content')).toBeInTheDocument();
      expect(screen.getByText('With multiple elements')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should handle undefined onTabChange', () => {
      expect(() => {
        render(<Tabs {...defaultProps} onTabChange={undefined} />);
      }).not.toThrow();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('should work as controlled component', () => {
      const onTabChange = jest.fn();
      
      render(<Tabs {...defaultProps} onTabChange={onTabChange} />);
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });
      fireEvent.click(tab2);
      
      expect(onTabChange).toHaveBeenCalledWith('tab2');
    });

    it('should work as uncontrolled component', () => {
      const { rerender } = render(<Tabs {...defaultProps} />);
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });
      fireEvent.click(tab2);
      
      // Re-render with new activeTab to simulate state update
      rerender(<Tabs {...defaultProps} activeTab="tab2" />);
      
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
