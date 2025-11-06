import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabNavigation } from '../../../components/layout/TabNavigation';

describe('TabNavigation Component', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render all 3 tabs', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /delay alerts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /orders/i })).toBeInTheDocument();
    });

    it('should render navigation element with correct role', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render exactly 3 tab buttons', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });
  });

  describe('Tab Icons and Labels', () => {
    it('should render Settings tab with icon and label', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      expect(settingsTab).toHaveTextContent('⚙️');
      expect(settingsTab).toHaveTextContent('Settings');
    });

    it('should render Delay Alerts tab with icon and label', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      expect(alertsTab).toHaveTextContent('🚨');
      expect(alertsTab).toHaveTextContent('Delay Alerts');
    });

    it('should render Orders tab with icon and label', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const ordersTab = screen.getByRole('tab', { name: /orders/i });
      expect(ordersTab).toHaveTextContent('📦');
      expect(ordersTab).toHaveTextContent('Orders');
    });

    it('should always show both icon and label for all tabs (mobile requirement)', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        // Each tab should have both emoji icon and text content
        const textContent = tab.textContent || '';
        // Check for emoji (icon) - Settings (⚙️), Delay Alerts (🚨), Orders (📦)
        expect(textContent).toMatch(/[\u{2699}\u{1F6A8}\u{1F4E6}]/u);
        // Check for text label
        expect(textContent.length).toBeGreaterThan(1); // More than just the icon
      });
    });
  });

  describe('Selected State', () => {
    it('should mark settings tab as selected when selectedTab is 0', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      expect(settingsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should mark Delay Alerts tab as selected when selectedTab is 1', () => {
      render(<TabNavigation selectedTab={1} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      expect(alertsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should mark Orders tab as selected when selectedTab is 2', () => {
      render(<TabNavigation selectedTab={2} onTabChange={mockOnTabChange} />);

      const ordersTab = screen.getByRole('tab', { name: /orders/i });
      expect(ordersTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should only mark one tab as selected at a time', () => {
      render(<TabNavigation selectedTab={1} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      const selectedTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'true');

      expect(selectedTabs).toHaveLength(1);
      expect(selectedTabs[0]).toHaveTextContent('Delay Alerts');
    });

    it('should apply active CSS class to selected tab', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      expect(settingsTab.className).toContain('tabActive');
    });

    it('should not apply active CSS class to unselected tabs', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      const ordersTab = screen.getByRole('tab', { name: /orders/i });

      expect(alertsTab.className).not.toContain('tabActive');
      expect(ordersTab.className).not.toContain('tabActive');
    });
  });

  describe('Click Interaction', () => {
    it('should call onTabChange with tab index 0 when settings is clicked', () => {
      render(<TabNavigation selectedTab={1} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      fireEvent.click(settingsTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
      expect(mockOnTabChange).toHaveBeenCalledWith(0);
    });

    it('should call onTabChange with tab index 1 when Delay Alerts is clicked', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      fireEvent.click(alertsTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
      expect(mockOnTabChange).toHaveBeenCalledWith(1);
    });

    it('should call onTabChange with tab index 2 when Orders is clicked', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const ordersTab = screen.getByRole('tab', { name: /orders/i });
      fireEvent.click(ordersTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
      expect(mockOnTabChange).toHaveBeenCalledWith(2);
    });

    it('should allow clicking the currently selected tab', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      fireEvent.click(settingsTab);

      expect(mockOnTabChange).toHaveBeenCalledWith(0);
    });

    it('should handle multiple rapid clicks', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      const ordersTab = screen.getByRole('tab', { name: /orders/i });

      fireEvent.click(alertsTab);
      fireEvent.click(ordersTab);
      fireEvent.click(alertsTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 1);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 2);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 1);
    });
  });

  describe('Loading State', () => {
    it('should disable all tabs when loading is true', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} loading={true} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toBeDisabled();
      });
    });

    it('should not disable tabs when loading is false', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} loading={false} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).not.toBeDisabled();
      });
    });

    it('should not disable tabs when loading prop is omitted (default)', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).not.toBeDisabled();
      });
    });

    it('should not call onTabChange when disabled tab is clicked', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} loading={true} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      fireEvent.click(alertsTab);

      expect(mockOnTabChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="tab" on all tab buttons', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('role', 'tab');
      });
    });

    it('should have aria-selected attribute on all tabs', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should have aria-selected="false" on unselected tabs', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      const ordersTab = screen.getByRole('tab', { name: /orders/i });

      expect(alertsTab).toHaveAttribute('aria-selected', 'false');
      expect(ordersTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should be keyboard accessible (button elements)', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Component Structure', () => {
    it('should have correct CSS class on navigation element', () => {
      const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('navigation');
    });

    it('should have correct CSS class on tab buttons', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab.className).toContain('tab');
      });
    });

    it('should have icon span with correct class', () => {
      const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const iconSpans = container.querySelectorAll('.tabIcon');
      expect(iconSpans.length).toBe(3);
    });

    it('should have label span with correct class', () => {
      const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const labelSpans = container.querySelectorAll('.tabLabel');
      expect(labelSpans.length).toBe(3);
    });

    it('should render icon before label in DOM order', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      const children = Array.from(settingsTab.children);

      expect(children[0].className).toContain('tabIcon');
      expect(children[1].className).toContain('tabLabel');
    });
  });

  describe('Edge Cases', () => {
    it('should handle selectedTab out of range (negative)', () => {
      render(<TabNavigation selectedTab={-1} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      const selectedTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'true');

      // No tabs should be selected if index is out of range
      expect(selectedTabs).toHaveLength(0);
    });

    it('should handle selectedTab out of range (too high)', () => {
      render(<TabNavigation selectedTab={99} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      const selectedTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'true');

      // No tabs should be selected if index is out of range
      expect(selectedTabs).toHaveLength(0);
    });

    it('should render correctly with selectedTab as 0 (first tab)', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      expect(settingsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should render correctly with selectedTab as 2 (last tab)', () => {
      render(<TabNavigation selectedTab={2} onTabChange={mockOnTabChange} />);

      const ordersTab = screen.getByRole('tab', { name: /orders/i });
      expect(ordersTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
