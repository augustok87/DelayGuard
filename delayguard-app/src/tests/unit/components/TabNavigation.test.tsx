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
      expect(settingsTab).toHaveTextContent('Settings');

      // Should have SVG icon, not emoji
      const iconSpan = settingsTab.querySelector('.tabIcon');
      const svg = iconSpan?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render Delay Alerts tab with icon and label', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
      expect(alertsTab).toHaveTextContent('Delay Alerts');

      // Should have SVG icon, not emoji
      const iconSpan = alertsTab.querySelector('.tabIcon');
      const svg = iconSpan?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render Orders tab with icon and label', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const ordersTab = screen.getByRole('tab', { name: /orders/i });
      expect(ordersTab).toHaveTextContent('Orders');

      // Should have SVG icon, not emoji
      const iconSpan = ordersTab.querySelector('.tabIcon');
      const svg = iconSpan?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should always show both icon and label for all tabs (mobile requirement)', () => {
      render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        // Each tab should have both SVG icon and text label
        const iconSpan = tab.querySelector('.tabIcon');
        const labelSpan = tab.querySelector('.tabLabel');
        const svg = iconSpan?.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(labelSpan).toBeInTheDocument();
        expect(labelSpan?.textContent).toBeTruthy();
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

  describe('v1.31: Lucide Icon Integration', () => {
    describe('SVG Icon Rendering', () => {
      it('should render SVG icons instead of emoji for all tabs', () => {
        const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        // All tabs should have SVG elements (Lucide icons)
        const svgIcons = container.querySelectorAll('.tabIcon svg');
        expect(svgIcons.length).toBe(3);
      });

      it('should render Settings icon (Lucide Settings component)', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const settingsTab = screen.getByRole('tab', { name: /settings/i });
        const iconSpan = settingsTab.querySelector('.tabIcon');
        const svgIcon = iconSpan?.querySelector('svg');

        // Verify SVG exists
        expect(svgIcon).toBeInTheDocument();
        // Lucide icons have specific attributes
        expect(svgIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });

      it('should render Delay Alerts icon (Lucide AlertTriangle component)', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
        const iconSpan = alertsTab.querySelector('.tabIcon');
        const svgIcon = iconSpan?.querySelector('svg');

        // Verify SVG exists
        expect(svgIcon).toBeInTheDocument();
        expect(svgIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });

      it('should render Orders icon (Lucide Package component)', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const ordersTab = screen.getByRole('tab', { name: /orders/i });
        const iconSpan = ordersTab.querySelector('.tabIcon');
        const svgIcon = iconSpan?.querySelector('svg');

        // Verify SVG exists
        expect(svgIcon).toBeInTheDocument();
        expect(svgIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });
    });

    describe('Icon Accessibility', () => {
      it('should have aria-hidden="true" on SVG icons (label is provided by text)', () => {
        const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const svgIcons = container.querySelectorAll('.tabIcon svg');
        svgIcons.forEach(svg => {
          expect(svg).toHaveAttribute('aria-hidden', 'true');
        });
      });

      it('should maintain accessible labels for all tabs with Lucide icons', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        // Labels should still be accessible via screen reader
        expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /delay alerts/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /orders/i })).toBeInTheDocument();
      });
    });

    describe('Icon Styling', () => {
      it('should apply consistent icon size to all Lucide icons', () => {
        const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const svgIcons = container.querySelectorAll('.tabIcon svg');
        svgIcons.forEach(svg => {
          // Lucide icons should have width/height attributes
          expect(svg).toHaveAttribute('width');
          expect(svg).toHaveAttribute('height');
          // Default Lucide size is 24x24
          expect(svg.getAttribute('width')).toBe('20');
          expect(svg.getAttribute('height')).toBe('20');
        });
      });

      it('should apply currentColor to SVG icons for theming', () => {
        const { container } = render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const svgIcons = container.querySelectorAll('.tabIcon svg');
        svgIcons.forEach(svg => {
          // Lucide icons use currentColor for stroke
          expect(svg).toHaveAttribute('stroke', 'currentColor');
        });
      });
    });

    describe('Icon Display Consistency', () => {
      it('should show icons alongside labels on all screen sizes', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const tabs = screen.getAllByRole('tab');
        tabs.forEach(tab => {
          // Each tab should have both icon span and label span
          const iconSpan = tab.querySelector('.tabIcon');
          const labelSpan = tab.querySelector('.tabLabel');

          expect(iconSpan).toBeInTheDocument();
          expect(labelSpan).toBeInTheDocument();

          // Icon span should contain SVG
          const svg = iconSpan?.querySelector('svg');
          expect(svg).toBeInTheDocument();
        });
      });

      it('should maintain icon-label order with Lucide icons', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const settingsTab = screen.getByRole('tab', { name: /settings/i });
        const children = Array.from(settingsTab.children);

        // Icon (span with SVG) should come before label
        expect(children[0].className).toContain('tabIcon');
        expect(children[0].querySelector('svg')).toBeInTheDocument();
        expect(children[1].className).toContain('tabLabel');
      });
    });

    describe('No Emoji Fallback', () => {
      it('should not contain emoji characters in Settings tab', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const settingsTab = screen.getByRole('tab', { name: /settings/i });
        // Should NOT contain gear emoji ⚙️
        expect(settingsTab.textContent).not.toContain('⚙️');
      });

      it('should not contain emoji characters in Delay Alerts tab', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const alertsTab = screen.getByRole('tab', { name: /delay alerts/i });
        // Should NOT contain siren emoji 🚨
        expect(alertsTab.textContent).not.toContain('🚨');
      });

      it('should not contain emoji characters in Orders tab', () => {
        render(<TabNavigation selectedTab={0} onTabChange={mockOnTabChange} />);

        const ordersTab = screen.getByRole('tab', { name: /orders/i });
        // Should NOT contain package emoji 📦
        expect(ordersTab.textContent).not.toContain('📦');
      });
    });
  });
});
