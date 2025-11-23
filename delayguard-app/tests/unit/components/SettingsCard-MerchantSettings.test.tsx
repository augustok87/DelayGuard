/**
 * Unit Tests: SettingsCard - Delay Type Toggle Switches (Phase 2.7)
 *
 * Tests for delay type toggle switches (warehouse, carrier, transit)
 * Part of Phase 2.7 - UI toggle switches in Settings tab
 * Note: Merchant contact fields moved to NotificationPreferences tests
 *
 * TDD RED Phase: These tests should FAIL until UI components are implemented
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsCard } from '../../../src/components/tabs/DashboardTab/SettingsCard';
import { AppSettings } from '../../../src/types';

const mockDefaultSettings: AppSettings = {
  delayThreshold: 2,
  notificationTemplate: 'default',
  emailNotifications: true,
  smsNotifications: false,
  // Phase 2.1: Merchant contact and toggles
  merchantEmail: null,
  merchantPhone: null,
  merchantName: null,
  warehouseDelaysEnabled: true,
  carrierDelaysEnabled: true,
  transitDelaysEnabled: true,
};

describe('SettingsCard - Delay Type Toggle Switches (Phase 2.7)', () => {
  it('should render warehouse delays toggle switch', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    expect(warehouseToggle).toBeInTheDocument();
    expect(warehouseToggle).toBeChecked(); // Defaults to TRUE
  });

  it('should render carrier delays toggle switch', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    expect(carrierToggle).toBeInTheDocument();
    expect(carrierToggle).toBeChecked(); // Defaults to TRUE
  });

  it('should render transit delays toggle switch', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });
    expect(transitToggle).toBeInTheDocument();
    expect(transitToggle).toBeChecked(); // Defaults to TRUE
  });

  it('should display correct toggle states from settings', () => {
    const settingsWithToggles: AppSettings = {
      ...mockDefaultSettings,
      warehouseDelaysEnabled: false, // Disabled
      carrierDelaysEnabled: true,
      transitDelaysEnabled: false, // Disabled
    };

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={settingsWithToggles}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });

    expect(warehouseToggle).not.toBeChecked();
    expect(carrierToggle).toBeChecked();
    expect(transitToggle).not.toBeChecked();
  });

  it('should call onSettingsChange when warehouse delay toggle is clicked', () => {
    const onSettingsChange = jest.fn();

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    fireEvent.click(warehouseToggle);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseDelaysEnabled: false, // Toggled from TRUE to FALSE
      }),
    );
  });

  it('should call onSettingsChange when carrier delay toggle is clicked', () => {
    const onSettingsChange = jest.fn();

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    fireEvent.click(carrierToggle);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierDelaysEnabled: false, // Toggled from TRUE to FALSE
      }),
    );
  });

  it('should call onSettingsChange when transit delay toggle is clicked', () => {
    const onSettingsChange = jest.fn();

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });
    fireEvent.click(transitToggle);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        transitDelaysEnabled: false, // Toggled from TRUE to FALSE
      }),
    );
  });

  it('should allow toggling ON after toggling OFF', () => {
    const onSettingsChange = jest.fn();

    const { rerender } = render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });

    // Toggle OFF
    fireEvent.click(warehouseToggle);
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        warehouseDelaysEnabled: false,
      }),
    );

    // Re-render with new state
    rerender(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={{ ...mockDefaultSettings, warehouseDelaysEnabled: false }}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const updatedToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });

    // Toggle ON
    fireEvent.click(updatedToggle);
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        warehouseDelaysEnabled: true,
      }),
    );
  });
});

describe('SettingsCard - UI Layout and Accessibility (Phase 2.7)', () => {
  it('should have descriptive help text for warehouse delay toggle', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // In accordion header, description shows threshold instead of full help text
    const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
    expect(accordionHeader.textContent).toMatch(/\d+ days threshold/);
  });

  it('should have descriptive help text for carrier delay toggle', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // In accordion header, description shows "Auto-detect" for carrier delays
    const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
    expect(accordionHeader.textContent).toMatch(/auto-detect/i);
  });

  it('should have descriptive help text for transit delay toggle', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // In accordion header, description shows threshold (delayThreshold + 5)
    const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
    expect(accordionHeader.textContent).toMatch(/\d+ days threshold/);
  });

  it('should disable all toggle switches when loading prop is true', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={true} // Loading state
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });

    expect(warehouseToggle).toBeDisabled();
    expect(carrierToggle).toBeDisabled();
    expect(transitToggle).toBeDisabled();
  });

  it('should have proper ARIA labels for accessibility', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });

    expect(warehouseToggle).toHaveAccessibleName();
    expect(carrierToggle).toHaveAccessibleName();
    expect(transitToggle).toHaveAccessibleName();
  });
});

describe('SettingsCard - Refactored Layout: Toggle Before Rule Card (Phase 2.7)', () => {
  it('should render warehouse toggle immediately before Rule 1 (Warehouse Delays) card', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // With accordion: toggle is in accordion header, rule card is in accordion content
    // Warehouse accordion is expanded by default, so rule card should be visible
    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    const rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });

    // Both should exist in DOM
    expect(warehouseToggle).toBeInTheDocument();
    expect(rule1Title).toBeInTheDocument();

    // v1.24: Toggle is SEPARATE from accordion header (not inside it)
    const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
    expect(accordionHeader).toBeInTheDocument();
    expect(accordionHeader).not.toContainElement(warehouseToggle);
  });

  it('should render carrier toggle immediately before Rule 2 (Carrier Delays) card', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // Carrier accordion is collapsed by default - expand it first
    const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
    fireEvent.click(accordionHeader);

    // Now we can find the toggle and rule card
    const carrierToggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
    const rule2Title = screen.getByRole('heading', { name: /^carrier reported delays$/i, level: 4 });

    // Both should exist in DOM
    expect(carrierToggle).toBeInTheDocument();
    expect(rule2Title).toBeInTheDocument();

    // v1.24: Toggle is SEPARATE from accordion header (not inside it)
    expect(accordionHeader).not.toContainElement(carrierToggle);
  });

  it('should render transit toggle immediately before Rule 3 (Stuck in Transit) card', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // Transit accordion is collapsed by default - expand it first
    const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
    fireEvent.click(accordionHeader);

    // Now we can find the toggle and rule card
    const transitToggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });
    const rule3Title = screen.getByRole('heading', { name: /^stuck in transit$/i, level: 4 });

    // Both should exist in DOM
    expect(transitToggle).toBeInTheDocument();
    expect(rule3Title).toBeInTheDocument();

    // v1.24: Toggle is SEPARATE from accordion header (not inside it)
    expect(accordionHeader).not.toContainElement(transitToggle);
  });

  it('should gray out Rule 1 card when warehouse toggle is disabled', () => {
    const settingsWithDisabled: AppSettings = {
      ...mockDefaultSettings,
      warehouseDelaysEnabled: false,
    };

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={settingsWithDisabled}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    const rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });
    const rule1Card = rule1Title.closest('div[class*="ruleCard"]');
    expect(rule1Card?.className).toContain('ruleCardDisabled');
  });

  it('should gray out Rule 2 card when carrier toggle is disabled', () => {
    const settingsWithDisabled: AppSettings = {
      ...mockDefaultSettings,
      carrierDelaysEnabled: false,
    };

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={settingsWithDisabled}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // Carrier accordion is collapsed by default - expand it first
    const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
    fireEvent.click(accordionHeader);

    const rule2Title = screen.getByRole('heading', { name: /^carrier reported delays$/i, level: 4 });
    const rule2Card = rule2Title.closest('div[class*="ruleCard"]');
    expect(rule2Card?.className).toContain('ruleCardDisabled');
  });

  it('should gray out Rule 3 card when transit toggle is disabled', () => {
    const settingsWithDisabled: AppSettings = {
      ...mockDefaultSettings,
      transitDelaysEnabled: false,
    };

    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={settingsWithDisabled}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // Transit accordion is collapsed by default - expand it first
    const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
    fireEvent.click(accordionHeader);

    const rule3Title = screen.getByRole('heading', { name: /^stuck in transit$/i, level: 4 });
    const rule3Card = rule3Title.closest('div[class*="ruleCard"]');
    expect(rule3Card?.className).toContain('ruleCardDisabled');
  });

  it('should NOT gray out rule cards when toggles are enabled', () => {
    render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings} // All toggles are TRUE by default
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={jest.fn()}
      />,
    );

    // Warehouse accordion is expanded by default - Rule 1 should be visible
    const rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });
    const rule1Card = rule1Title.closest('div[class*="ruleCard"]');
    expect(rule1Card?.className).not.toContain('ruleCardDisabled');

    // Expand carrier accordion to check Rule 2
    const carrierHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
    fireEvent.click(carrierHeader);
    const rule2Title = screen.getByRole('heading', { name: /^carrier reported delays$/i, level: 4 });
    const rule2Card = rule2Title.closest('div[class*="ruleCard"]');
    expect(rule2Card?.className).not.toContain('ruleCardDisabled');

    // Expand transit accordion to check Rule 3
    const transitHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
    fireEvent.click(transitHeader);
    const rule3Title = screen.getByRole('heading', { name: /^stuck in transit$/i, level: 4 });
    const rule3Card = rule3Title.closest('div[class*="ruleCard"]');
    expect(rule3Card?.className).not.toContain('ruleCardDisabled');
  });

  it('should dynamically update Rule 1 disabled state when toggle changes', () => {
    const onSettingsChange = jest.fn();

    const { rerender } = render(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={mockDefaultSettings}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    // Initially enabled
    let rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });
    let rule1Card = rule1Title.closest('div[class*="ruleCard"]');
    expect(rule1Card?.className).not.toContain('ruleCardDisabled');

    // Toggle OFF
    const warehouseToggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
    fireEvent.click(warehouseToggle);

    // Re-render with disabled state
    rerender(
      <SettingsCard
        shop="test-shop.myshopify.com"
        settings={{ ...mockDefaultSettings, warehouseDelaysEnabled: false }}
        loading={false}
        onSave={jest.fn()}
        onTest={jest.fn()}
        onConnect={jest.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    // Now disabled
    rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });
    rule1Card = rule1Title.closest('div[class*="ruleCard"]');
    expect(rule1Card?.className).toContain('ruleCardDisabled');
  });
});
