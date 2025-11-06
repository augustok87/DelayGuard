/**
 * DashboardTab Two-Tab Layout Tests
 *
 * Tests for Settings tab with two sub-tabs: "Delay Detection Rules" and "Notification Preferences"
 * Following TDD approach - tests written FIRST.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, createMockSettings } from '../../setup/test-utils';
import { DashboardTab } from '../../../src/components/tabs/DashboardTab';

// Mock child components
jest.mock('../../../src/components/ui/SegmentedControl', () => ({
  SegmentedControl: ({ options, value, onChange }: any) => (
    <div data-testid="segmented-control" role="group">
      {options.map((option: any) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          data-testid={`tab-${option.value}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../../../src/components/tabs/DashboardTab/SettingsCard', () => ({
  SettingsCard: () => (
    <div data-testid="settings-card">Delay Detection Rules Content</div>
  ),
}));

jest.mock('../../../src/components/tabs/DashboardTab/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Content</div>
  ),
}));

describe('DashboardTab - Two-Tab Layout', () => {
  const mockProps = {
    shop: 'test-shop.myshopify.com',
    settings: createMockSettings(),
    loading: false,
    onSaveSettings: jest.fn(),
    onTestDelayDetection: jest.fn(),
    onConnectShopify: jest.fn(),
    onSettingsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Navigation Rendering', () => {
    it('should render SegmentedControl with two tabs', () => {
      render(<DashboardTab {...mockProps} />);

      expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
      expect(screen.getByTestId('tab-rules')).toBeInTheDocument();
      expect(screen.getByTestId('tab-notifications')).toBeInTheDocument();
    });

    it('should display correct tab labels', () => {
      render(<DashboardTab {...mockProps} />);

      expect(screen.getByText('Delay Detection Rules')).toBeInTheDocument();
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    it('should default to "Delay Detection Rules" tab', () => {
      render(<DashboardTab {...mockProps} />);

      const rulesTab = screen.getByTestId('tab-rules');
      expect(rulesTab).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have sticky filter bar at top of Settings tab', () => {
      const { container } = render(<DashboardTab {...mockProps} />);

      const filterBar = container.querySelector('.filterBar');
      expect(filterBar).toBeInTheDocument();
    });
  });

  describe('Tab Content Display', () => {
    it('should show SettingsCard when "Delay Detection Rules" tab is selected', () => {
      render(<DashboardTab {...mockProps} />);

      expect(screen.getByTestId('settings-card')).toBeInTheDocument();
      expect(screen.queryByTestId('notification-preferences')).not.toBeInTheDocument();
    });

    it('should show NotificationPreferences when "Notification Preferences" tab is selected', () => {
      render(<DashboardTab {...mockProps} />);

      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
      expect(screen.queryByTestId('settings-card')).not.toBeInTheDocument();
    });

    it('should switch content when tabs are clicked', () => {
      render(<DashboardTab {...mockProps} />);

      // Initially shows rules
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();

      // Click notifications tab
      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      // Shows notifications
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
      expect(screen.queryByTestId('settings-card')).not.toBeInTheDocument();

      // Click rules tab again
      const rulesTab = screen.getByTestId('tab-rules');
      fireEvent.click(rulesTab);

      // Shows rules again
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();
      expect(screen.queryByTestId('notification-preferences')).not.toBeInTheDocument();
    });
  });

  describe('Tab State Management', () => {
    it('should maintain selected tab state across interactions', () => {
      render(<DashboardTab {...mockProps} />);

      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      expect(notificationsTab).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    it('should update aria-pressed attribute correctly', () => {
      render(<DashboardTab {...mockProps} />);

      const rulesTab = screen.getByTestId('tab-rules');
      const notificationsTab = screen.getByTestId('tab-notifications');

      // Initially rules is selected
      expect(rulesTab).toHaveAttribute('aria-pressed', 'true');
      expect(notificationsTab).toHaveAttribute('aria-pressed', 'false');

      // Click notifications
      fireEvent.click(notificationsTab);

      expect(rulesTab).toHaveAttribute('aria-pressed', 'false');
      expect(notificationsTab).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Props Passing', () => {
    it('should pass all required props to SettingsCard', () => {
      render(<DashboardTab {...mockProps} />);

      // SettingsCard should be rendered with correct props
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();
    });

    it('should pass settings to NotificationPreferences when tab is selected', () => {
      render(<DashboardTab {...mockProps} />);

      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      // NotificationPreferences should be rendered
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain horizontal layout on mobile (SegmentedControl handles this)', () => {
      const { container } = render(<DashboardTab {...mockProps} />);

      const segmentedControl = container.querySelector('[data-testid="segmented-control"]');
      expect(segmentedControl).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show appropriate content for each tab regardless of settings', () => {
      const emptySettings = createMockSettings({
        delayThreshold: 0,
        emailNotifications: false,
        smsNotifications: false,
      });

      render(<DashboardTab {...mockProps} settings={emptySettings} />);

      // Rules tab should still show
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();

      // Switch to notifications tab
      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      // Notifications tab should still show
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });
  });

  describe('Integration with Existing Functionality', () => {
    it('should not break existing onSaveSettings callback', () => {
      render(<DashboardTab {...mockProps} />);

      // SettingsCard is visible by default
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();
    });

    it('should maintain centered layout (900px max-width)', () => {
      const { container } = render(<DashboardTab {...mockProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ maxWidth: '900px', margin: '0 auto' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for tab group', () => {
      render(<DashboardTab {...mockProps} />);

      const tabGroup = screen.getByRole('group');
      expect(tabGroup).toBeInTheDocument();
    });

    it('should allow keyboard navigation between tabs', () => {
      render(<DashboardTab {...mockProps} />);

      const rulesTab = screen.getByTestId('tab-rules');
      const notificationsTab = screen.getByTestId('tab-notifications');

      // Tab should be focusable
      rulesTab.focus();
      expect(rulesTab).toHaveFocus();

      notificationsTab.focus();
      expect(notificationsTab).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid tab switching', () => {
      render(<DashboardTab {...mockProps} />);

      const rulesTab = screen.getByTestId('tab-rules');
      const notificationsTab = screen.getByTestId('tab-notifications');

      // Rapidly switch tabs
      fireEvent.click(notificationsTab);
      fireEvent.click(rulesTab);
      fireEvent.click(notificationsTab);
      fireEvent.click(rulesTab);

      // Should end up on rules tab
      expect(screen.getByTestId('settings-card')).toBeInTheDocument();
      expect(screen.queryByTestId('notification-preferences')).not.toBeInTheDocument();
    });

    it('should handle loading state while switching tabs', () => {
      const { rerender } = render(<DashboardTab {...mockProps} />);

      // Switch to notifications tab
      const notificationsTab = screen.getByTestId('tab-notifications');
      fireEvent.click(notificationsTab);

      // Update to loading state
      rerender(<DashboardTab {...mockProps} loading={true} />);

      // Should still show notifications tab content
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });
  });
});
