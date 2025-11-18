/**
 * Unit Tests: SettingsCard - Accordion Layout (Phase 2.7 Refactor)
 *
 * Tests for collapsible accordion sections wrapping delay rules
 * Part of Phase 2.7 - Accordion UI for better vertical space management
 *
 * TDD RED Phase: These tests should FAIL until accordion implementation is complete
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
  merchantEmail: null,
  merchantPhone: null,
  merchantName: null,
  warehouseDelaysEnabled: true,
  carrierDelaysEnabled: true,
  transitDelaysEnabled: true,
};

describe('SettingsCard - Accordion Layout (Phase 2.7 Refactor)', () => {
  describe('Default Accordion State', () => {
    it('should render Warehouse Delays accordion expanded by default', () => {
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

      // Find accordion header and check aria-expanded
      const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Rule card content should be visible
      const thresholdInput = screen.getByLabelText(/alert me when orders sit unfulfilled for/i);
      expect(thresholdInput).toBeVisible();
    });

    it('should render Carrier Delays accordion collapsed by default', () => {
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

      // Find accordion header and check aria-expanded
      const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Rule card content should be hidden (not in DOM)
      const autoDetectCheckbox = screen.queryByLabelText(/auto-detect when carriers report exceptions/i);
      expect(autoDetectCheckbox).not.toBeInTheDocument();
    });

    it('should render Stuck in Transit accordion collapsed by default', () => {
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

      // Find accordion header and check aria-expanded
      const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Rule card content should be hidden (not in DOM)
      const transitInput = screen.queryByLabelText(/alert when packages are in transit for/i);
      expect(transitInput).not.toBeInTheDocument();
    });
  });

  describe('Accordion Toggle Behavior', () => {
    it('should expand Carrier Delays accordion when header is clicked', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });

      // Initially collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(accordionHeader);

      // Now expanded
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Content should be visible
      const autoDetectCheckbox = screen.getByLabelText(/auto-detect when carriers report exceptions/i);
      expect(autoDetectCheckbox).toBeInTheDocument();
    });

    it('should collapse Warehouse Delays accordion when header is clicked', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });

      // Initially expanded
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(accordionHeader);

      // Now collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Content should be hidden (not in DOM)
      const thresholdInput = screen.queryByLabelText(/alert me when orders sit unfulfilled for/i);
      expect(thresholdInput).not.toBeInTheDocument();
    });

    it('should toggle accordion multiple times', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });

      // Initially collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(accordionHeader);
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(accordionHeader);
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Click to expand again
      fireEvent.click(accordionHeader);
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Accordion Header Content', () => {
    it('should display toggle checkbox in Warehouse Delays accordion header', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
      const toggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });

      // Toggle should be inside or near accordion header
      expect(toggle).toBeInTheDocument();
      expect(accordionHeader).toBeInTheDocument();
    });

    it('should display threshold summary in accordion header when collapsed', () => {
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

      // Carrier accordion (collapsed by default) should show summary
      const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
      expect(accordionHeader).toBeInTheDocument();
      // Summary text like "Auto-detect" should be in header
      expect(accordionHeader.textContent).toMatch(/auto-detect/i);
    });
  });

  describe('Toggle Functionality Within Accordion', () => {
    it('should allow toggling delay type ON/OFF without expanding accordion', () => {
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

      // Find carrier accordion (collapsed by default)
      const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Find and click toggle checkbox
      const toggle = screen.getByRole('checkbox', { name: /enable carrier delay notifications/i });
      fireEvent.click(toggle);

      // onSettingsChange should be called
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          carrierDelaysEnabled: false,
        }),
      );

      // Accordion should still be collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('should NOT expand accordion when clicking toggle checkbox', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });
      const toggle = screen.getByRole('checkbox', { name: /enable transit delay notifications/i });

      // Initially collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Click toggle
      fireEvent.click(toggle);

      // Should still be collapsed (toggle click doesn't expand accordion)
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Disabled State Interaction with Accordion', () => {
    it('should gray out rule card when toggle is OFF (accordion expanded)', () => {
      const { rerender } = render(
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

      // Warehouse accordion is expanded by default - verify it's expanded
      const accordionHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Turn off the toggle
      const toggle = screen.getByRole('checkbox', { name: /enable warehouse delay notifications/i });
      fireEvent.click(toggle);

      // Re-render with disabled state
      rerender(
        <SettingsCard
          shop="test-shop.myshopify.com"
          settings={{ ...mockDefaultSettings, warehouseDelaysEnabled: false }}
          loading={false}
          onSave={jest.fn()}
          onTest={jest.fn()}
          onConnect={jest.fn()}
          onSettingsChange={jest.fn()}
        />,
      );

      // Accordion should still be expanded (state persists across rerenders)
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');

      // Rule card should be grayed out
      const rule1Title = screen.getByRole('heading', { name: /^warehouse delays$/i, level: 4 });
      const rule1Card = rule1Title.closest('div[class*="ruleCard"]');
      expect(rule1Card?.className).toContain('ruleCardDisabled');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on accordion headers', () => {
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

      const warehouseHeader = screen.getByRole('button', { name: 'Warehouse Delays accordion' });
      const carrierHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });
      const transitHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });

      // All headers should have aria-expanded
      expect(warehouseHeader).toHaveAttribute('aria-expanded');
      expect(carrierHeader).toHaveAttribute('aria-expanded');
      expect(transitHeader).toHaveAttribute('aria-expanded');

      // All headers should have role="button"
      expect(warehouseHeader).toHaveAttribute('role', 'button');
      expect(carrierHeader).toHaveAttribute('role', 'button');
      expect(transitHeader).toHaveAttribute('role', 'button');
    });

    it('should support keyboard navigation (Enter key)', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Carrier Reported Delays accordion' });

      // Initially collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Press Enter key
      fireEvent.keyDown(accordionHeader, { key: 'Enter', code: 'Enter' });

      // Should expand
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');
    });

    it('should support keyboard navigation (Space key)', () => {
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

      const accordionHeader = screen.getByRole('button', { name: 'Stuck in Transit accordion' });

      // Initially collapsed
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false');

      // Press Space key
      fireEvent.keyDown(accordionHeader, { key: ' ', code: 'Space' });

      // Should expand
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
