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

      expect(screen.getByText('Delay Detection Rules')).toBeInTheDocument();
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

      // v1.26: All content always visible (no accordions)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordions)
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

      // v1.26: All icons always visible (no accordion expansion needed)
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

      // v1.25: Help text now in modal (not accordion)
      // Click "Learn More" button to open modal
      const learnMoreButton = screen.getByRole('button', { name: /Learn More About Warehouse Delays/i });
      fireEvent.click(learnMoreButton);

      // Check for the new thorough explanations (Phase 1.4 enhancement)
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

      // v1.26: Content always visible (no accordion expansion needed)
      // v1.25: Help text now in modal (not accordion)
      // Click "Learn More" button to open modal
      const learnMoreButton = screen.getByRole('button', { name: /Learn More About Carrier Reported Delays/i });
      fireEvent.click(learnMoreButton);

      // Check for the new thorough explanations (Phase 1.4 enhancement)
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

      // v1.26: Content always visible (no accordion expansion needed)
      // v1.25: Help text now in modal (not accordion)
      // Click "Learn More" button to open modal
      const learnMoreButton = screen.getByRole('button', { name: /Learn More About Stuck in Transit Detection/i });
      fireEvent.click(learnMoreButton);

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

      // v1.26: Benchmark always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

      // v1.26: Content always visible (no accordion expansion needed)
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

    // Send Test Alert button moved to NotificationPreferences component in v1.20.3
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

      // v1.26: All 3 rule cards always visible (no accordion expansion needed)
      const ruleCards = container.querySelectorAll('[class*="ruleCard"]');
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

      // v1.26: All labels always visible (no accordion expansion needed)
      expect(screen.getByLabelText(/Alert me when orders sit unfulfilled for:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Auto-detect carrier exceptions/i)).toBeInTheDocument();

      // Email and SMS notification labels are now in NotificationPreferences component
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

      // No Save Settings button with auto-save (Send Test Alert button moved to NotificationPreferences)
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

      // v1.26: Should still render without crashing (no accordions)
      expect(screen.getByText('Warehouse Delays')).toBeInTheDocument();
    });
  });

  describe('Responsive Grid Layout (v1.27)', () => {
    it('should render rules grid wrapper container', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27: Rules should be wrapped in a grid container
      const rulesGrid = container.querySelector('[class*="rulesGrid"]');
      expect(rulesGrid).toBeInTheDocument();
    });

    it('should render all 3 delay rules inside the grid container', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      const rulesGrid = container.querySelector('[class*="rulesGrid"]');
      const ruleSections = rulesGrid?.querySelectorAll('[class*="ruleSection"]');

      // v1.27: All 3 rule sections should be inside the grid
      expect(ruleSections?.length).toBe(3);
    });

    it('should maintain proper class names for grid styling', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27: Grid container should have rulesGrid class for CSS targeting
      const rulesGrid = container.querySelector('[class*="rulesGrid"]');
      expect(rulesGrid?.className).toContain('rulesGrid');
    });

    it('should render Smart Tip outside the grid container', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27: Smart Tip should remain full-width (not in grid)
      const rulesGrid = container.querySelector('[class*="rulesGrid"]');
      const smartTip = container.querySelector('[class*="smartTip"]');

      expect(smartTip).toBeInTheDocument();
      // Smart Tip should be a sibling of rulesGrid, not a child
      expect(rulesGrid?.contains(smartTip as Node)).toBe(false);
    });

    it('should preserve existing rule section structure', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27: Each rule section should still have toggle + card structure
      const ruleSections = container.querySelectorAll('[class*="ruleSection"]');
      ruleSections.forEach((section) => {
        const toggleSection = section.querySelector('[class*="toggleSection"]');
        const ruleCard = section.querySelector('[class*="ruleCard"]');

        expect(toggleSection).toBeInTheDocument();
        expect(ruleCard).toBeInTheDocument();
      });
    });

    it('should maintain accessibility with grid layout', () => {
      render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27: All rule toggles should still be accessible
      expect(screen.getByLabelText(/Enable warehouse delay notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable carrier delay notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable transit delay notifications/i)).toBeInTheDocument();
    });

    it('should render rule sections with ruleSection class for flex layout', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27.2: Rule sections should have ruleSection class (which applies display: flex)
      const ruleSections = container.querySelectorAll('[class*="ruleSection"]');
      expect(ruleSections.length).toBe(3);
      ruleSections.forEach((section) => {
        expect(section.className).toContain('ruleSection');
      });
    });

    it('should render rule cards with ruleCard class for flex: 1', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27.2: Rule cards should have ruleCard class (which applies flex: 1)
      const ruleCards = container.querySelectorAll('[class*="ruleCard"]');
      expect(ruleCards.length).toBe(3);
      ruleCards.forEach((card) => {
        expect(card.className).toContain('ruleCard');
      });
    });

    it('should render Learn More buttons with learnMoreButton class for bottom alignment', () => {
      const { container } = render(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={mockSettings}
          loading={false}
          {...mockCallbacks}
        />,
      );

      // v1.27.3: Learn More buttons should have learnMoreButton class (applies margin-top: auto)
      const learnMoreButtons = container.querySelectorAll('[class*="learnMoreButton"]');
      expect(learnMoreButtons.length).toBe(3); // One for each rule card
      learnMoreButtons.forEach((button) => {
        expect(button.className).toContain('learnMoreButton');
      });
    });
  });
});
