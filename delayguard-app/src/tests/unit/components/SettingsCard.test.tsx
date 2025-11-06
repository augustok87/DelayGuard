/**
 * SettingsCard Component Tests (Phase 1.4)
 *
 * Test suite for the enhanced SettingsCard component with:
 * - Plain language rule names (Warehouse Delays, Carrier Reported Delays, Stuck in Transit)
 * - Merchant benchmarks display
 * - Improved help text and inline examples
 * - Better visual hierarchy
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsCard } from '../../../components/tabs/DashboardTab/SettingsCard';
import { AppSettings } from '../../../types';

describe('SettingsCard (Phase 1.4)', () => {
  const mockSettings: AppSettings = {
    delayThreshold: 3,
    notificationTemplate: 'default',
    emailNotifications: true,
    smsNotifications: false,
    autoResolveDays: 7,
    enableAnalytics: true,
    theme: 'light',
    language: 'en',
  };

  const mockBenchmarks = {
    avgFulfillmentDays: 2.1,
    avgDeliveryDays: 4.5,
    delaysThisMonth: 8,
    delaysTrend: -25, // 25% improvement
  };

  const mockCallbacks = {
    onSave: jest.fn(),
    onTest: jest.fn(),
    onConnect: jest.fn(),
    onSettingsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the SettingsCard component', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(SettingsCard.displayName).toBe('SettingsCard');
    });
  });

  describe('Phase 1.4: Plain Language Rule Names', () => {
    it('should display "Warehouse Delays" instead of "Pre-Shipment Alerts"', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('Warehouse Delays')).toBeInTheDocument();
      expect(screen.queryByText(/Pre-Shipment/i)).not.toBeInTheDocument();
    });

    it('should display "Carrier Reported Delays" with auto-detection', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('Carrier Reported Delays')).toBeInTheDocument();
      expect(screen.getByText(/Auto-detect when carriers report exceptions/i)).toBeInTheDocument();
    });

    it('should display "Stuck in Transit" instead of "Extended Transit"', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('Stuck in Transit')).toBeInTheDocument();
      expect(screen.queryByText(/Extended Transit/i)).not.toBeInTheDocument();
    });

    it('should display all three rules with icons', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Check for rule icons (emojis)
      expect(screen.getByText('📦')).toBeInTheDocument(); // Warehouse
      expect(screen.getByText('🚨')).toBeInTheDocument(); // Carrier
      expect(screen.getByText('⏰')).toBeInTheDocument(); // Stuck in Transit
    });
  });

  describe('Phase 1.4: Help Text and Examples', () => {
    it('should display help text for Warehouse Delays', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Check for the new thorough explanations (Phase 1.4 enhancement)
      // Multiple rules have these sections, so check they exist
      const whatDetects = screen.getAllByText(/📌 What this detects:/i);
      expect(whatDetects.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Orders that haven't been fulfilled/i)).toBeInTheDocument();
    });

    it('should display help text for Carrier Reported Delays', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Check for the new thorough explanations (Phase 1.4 enhancement)
      // Multiple rules have these sections, so check they exist
      const howWorks = screen.getAllByText(/🔍 How it works:/i);
      expect(howWorks.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/UPS, FedEx, USPS/i)).toBeInTheDocument();
    });

    it('should display help text for Stuck in Transit', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Check for the new thorough explanations (Phase 1.4 enhancement)
      // There are multiple "Real-world example" sections, so use getAllByText
      const examples = screen.getAllByText(/💼 Real-world example:/i);
      expect(examples.length).toBeGreaterThanOrEqual(1);
      // Check for text content related to stuck packages (Stuck in Transit rule)
      expect(screen.getByText(/7\+ days.*still no delivery scan/i)).toBeInTheDocument();
    });

    it('should display Smart Tip with recommendations', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/SMART TIP:/i)).toBeInTheDocument();
      expect(screen.getByText(/Based on your store's performance/i)).toBeInTheDocument();
    });
  });

  describe('Phase 1.4: Merchant Benchmarks Display', () => {
    it('should display average fulfillment time benchmark', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/Your avg fulfillment time:/i)).toBeInTheDocument();
      expect(screen.getByText(/2.1/)).toBeInTheDocument();
    });

    it('should display average delivery time benchmark', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/Your avg delivery time:/i)).toBeInTheDocument();
      expect(screen.getByText(/4.5/)).toBeInTheDocument();
    });

    it('should display delays this month with trend', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/You've had/i)).toBeInTheDocument();
      expect(screen.getByText(/carrier delays this month/i)).toBeInTheDocument();
      // Check that the number 8 appears somewhere (can be multiple places)
      expect(screen.getAllByText(/8/).length).toBeGreaterThanOrEqual(1);
    });

    it('should display positive trend (improvement) with down arrow', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/↓ 25%/)).toBeInTheDocument();
    });

    it('should display negative trend (increase) with up arrow', () => {
      const worseBenchmarks = {
        ...mockBenchmarks,
        delaysTrend: 15, // 15% worse
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={worseBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/↑ 15%/)).toBeInTheDocument();
    });

    it('should display contextual feedback for fast fulfillment', () => {
      const fastBenchmarks = {
        ...mockBenchmarks,
        avgFulfillmentDays: 1.5,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={fastBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/you're fast!/i)).toBeInTheDocument();
    });

    it('should display contextual feedback for good fulfillment', () => {
      const goodBenchmarks = {
        ...mockBenchmarks,
        avgFulfillmentDays: 2.5,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={goodBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/\(good\)/i)).toBeInTheDocument();
    });

    it('should display contextual feedback for slow fulfillment', () => {
      const slowBenchmarks = {
        ...mockBenchmarks,
        avgFulfillmentDays: 5.5,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={slowBenchmarks}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText(/could be faster/i)).toBeInTheDocument();
    });

    it('should not display benchmarks when not provided', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.queryByText(/Your avg fulfillment time:/i)).not.toBeInTheDocument();
    });
  });

  describe('Delay Threshold Settings (Auto-save with Debouncing)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should display current delay threshold value', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i) as HTMLInputElement;
      expect(input.value).toBe('3');
    });

    it('should update UI immediately when delay threshold changes', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });

      // UI should update immediately (optimistic update)
      expect(input.value).toBe('5');
    });

    it('should NOT call onSettingsChange immediately (debounced)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i);
      fireEvent.change(input, { target: { value: '5' } });

      // Should not call immediately
      expect(mockCallbacks.onSettingsChange).not.toHaveBeenCalled();
    });

    it('should call onSettingsChange after 1 second delay (debounced auto-save)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i);
      fireEvent.change(input, { target: { value: '5' } });

      // Fast-forward time by 1 second
      jest.advanceTimersByTime(1000);

      // Should call with new value after debounce delay
      expect(mockCallbacks.onSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        delayThreshold: 5,
      });
    });

    it('should only save once if user types multiple values quickly (debounce)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i);

      // User types multiple values quickly
      fireEvent.change(input, { target: { value: '4' } });
      jest.advanceTimersByTime(500); // Wait 500ms
      fireEvent.change(input, { target: { value: '5' } });
      jest.advanceTimersByTime(500); // Wait 500ms
      fireEvent.change(input, { target: { value: '6' } });

      // No calls yet (debounce not complete)
      expect(mockCallbacks.onSettingsChange).not.toHaveBeenCalled();

      // Fast-forward by 1 second from last change
      jest.advanceTimersByTime(1000);

      // Should only call once with the final value
      expect(mockCallbacks.onSettingsChange).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        delayThreshold: 6,
      });
    });

    it('should display extended transit as auto-calculated', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Extended transit should be delayThreshold (3) + extendedTransitDays (5) = 8
      // Check that auto-calculated text is displayed (may appear multiple times)
      const autoCalcTexts = screen.getAllByText(/auto-calculated/i);
      expect(autoCalcTexts.length).toBeGreaterThanOrEqual(1);

      // Verify the value 8 appears (from the calculation)
      const inputsWithValue8 = screen.getAllByDisplayValue('8');
      expect(inputsWithValue8.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable inputs when loading', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={true}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Notification Preferences', () => {
    it('should display email notifications toggle', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable email notifications/i)).toBeChecked();
    });

    it('should display SMS notifications toggle', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('SMS Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable SMS notifications/i)).not.toBeChecked();
    });

    it('should call onSettingsChange when email toggle changes', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const emailToggle = screen.getByLabelText(/Enable email notifications/i);
      fireEvent.click(emailToggle);

      expect(mockCallbacks.onSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        emailNotifications: false,
      });
    });

    it('should call onSettingsChange when SMS toggle changes', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const smsToggle = screen.getByLabelText(/Enable SMS notifications/i);
      fireEvent.click(smsToggle);

      expect(mockCallbacks.onSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        smsNotifications: true,
      });
    });

    it('should display warning when no notifications enabled', () => {
      const noNotificationsSettings = {
        ...mockSettings,
        emailNotifications: false,
        smsNotifications: false,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={noNotificationsSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('No notifications enabled')).toBeInTheDocument();
      expect(screen.getByText(/Customers won't be notified about delays/i)).toBeInTheDocument();
    });

    it('should not display warning when at least one notification method enabled', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.queryByText('No notifications enabled')).not.toBeInTheDocument();
    });
  });

  describe('Shopify Connection Status', () => {
    it('should NOT display connection status when shop is provided (moved to header)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Connection status is now in the header, not in SettingsCard
      expect(screen.queryByText('Connected to Shopify')).not.toBeInTheDocument();
      expect(screen.queryByText('System Status')).not.toBeInTheDocument();
    });

    it('should display not connected status when shop is null', () => {
      render(
        <SettingsCard
          shop={null}
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByText('Not Connected')).toBeInTheDocument();
      expect(screen.getByText(/Connect your Shopify store/i)).toBeInTheDocument();
    });

    it('should display Connect to Shopify button when not connected', () => {
      render(
        <SettingsCard
          shop={null}
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const connectButton = screen.getByRole('button', { name: /Connect to Shopify/i });
      expect(connectButton).toBeInTheDocument();
    });

    it('should call onConnect when Connect to Shopify button clicked', () => {
      render(
        <SettingsCard
          shop={null}
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const connectButton = screen.getByRole('button', { name: /Connect to Shopify/i });
      fireEvent.click(connectButton);

      expect(mockCallbacks.onConnect).toHaveBeenCalled();
    });
  });

  describe('Action Buttons (Auto-save UX)', () => {
    it('should NOT display Save Settings button (auto-save enabled)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.queryByRole('button', { name: /Save Settings/i })).not.toBeInTheDocument();
    });

    it('should display Send Test Alert button', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByRole('button', { name: /Send Test Alert/i })).toBeInTheDocument();
    });

    it('should call onTest when Send Test Alert clicked', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const testButton = screen.getByRole('button', { name: /Send Test Alert/i });
      fireEvent.click(testButton);

      expect(mockCallbacks.onTest).toHaveBeenCalled();
    });

    it('should disable Send Test Alert button when loading', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={true}
          {...mockCallbacks}
        />,
      );

      const testButton = screen.getByRole('button', { name: /Send Test Alert/i });
      expect(testButton).toBeDisabled();
    });

    it('should disable Send Test Alert when not connected', () => {
      render(
        <SettingsCard
          shop={null}
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const testButton = screen.getByRole('button', { name: /Send Test Alert/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('Visual Hierarchy and Layout', () => {
    it('should display rules in card format', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const ruleCards = container.querySelectorAll('.ruleCard');
      expect(ruleCards.length).toBe(3); // Three rule cards
    });

    it('should display benchmark containers when benchmarks provided', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      const benchmarkContainers = container.querySelectorAll('.benchmarkContainer');
      expect(benchmarkContainers.length).toBeGreaterThan(0);
    });

    it('should display smart tip box', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={mockBenchmarks}
          {...mockCallbacks}
        />,
      );

      const smartTip = container.querySelector('.smartTip');
      expect(smartTip).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all input fields', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      expect(screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable SMS notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Auto-detect carrier exceptions/i)).toBeInTheDocument();
    });

    it('should have proper button roles and labels (auto-save UX)', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // Only Send Test Alert button exists (no Save Settings button with auto-save)
      expect(screen.getByRole('button', { name: /Send Test Alert/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Save Settings/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay threshold', () => {
      const zeroSettings = {
        ...mockSettings,
        delayThreshold: 0,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={zeroSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i) as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should handle very high delay threshold', () => {
      const highSettings = {
        ...mockSettings,
        delayThreshold: 30,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={highSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const input = screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i) as HTMLInputElement;
      expect(input.value).toBe('30');
    });

    it('should handle missing benchmark data gracefully', () => {
      const incompleteBenchmarks = {
        avgFulfillmentDays: 2.1,
        avgDeliveryDays: 4.5,
        delaysThisMonth: 0,
      };

      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          benchmarks={incompleteBenchmarks as any}
          {...mockCallbacks}
        />,
      );

      // Should still render without crashing
      expect(screen.getByText('Warehouse Delays')).toBeInTheDocument();
    });
  });
});
