/**
 * NotificationPreferences Component Tests
 *
 * Tests for notification preferences settings (moved from SettingsCard)
 * Following TDD approach - tests written FIRST.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, createMockSettings } from '../../setup/test-utils';
import { NotificationPreferences } from '../../../src/components/tabs/DashboardTab/NotificationPreferences';

describe('NotificationPreferences Component', () => {
  const mockSettings = createMockSettings({
    emailNotifications: true,
    smsNotifications: false,
  });

  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Notifications', () => {
    it('should render email notifications checkbox', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByLabelText('Enable email notifications')).toBeInTheDocument();
    });

    it('should show checked email checkbox when emailNotifications is true', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable email notifications') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should show unchecked email checkbox when emailNotifications is false', () => {
      const settings = createMockSettings({ emailNotifications: false });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable email notifications') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onSettingsChange when email checkbox is toggled', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable email notifications');
      fireEvent.click(checkbox);

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        emailNotifications: false,
      });
    });
  });

  describe('SMS Notifications', () => {
    it('should render SMS notifications checkbox', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByLabelText('Enable SMS notifications')).toBeInTheDocument();
    });

    it('should show checked SMS checkbox when smsNotifications is true', () => {
      const settings = createMockSettings({ smsNotifications: true });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable SMS notifications') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should show unchecked SMS checkbox when smsNotifications is false', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable SMS notifications') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onSettingsChange when SMS checkbox is toggled', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const checkbox = screen.getByLabelText('Enable SMS notifications');
      fireEvent.click(checkbox);

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...mockSettings,
        smsNotifications: true,
      });
    });
  });

  describe('Warning Messages', () => {
    it('should show warning when both notifications are disabled', () => {
      const settings = createMockSettings({
        emailNotifications: false,
        smsNotifications: false,
      });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText('No notifications enabled')).toBeInTheDocument();
      expect(screen.getByText(/Customers won't be notified about delays/i)).toBeInTheDocument();
    });

    it('should NOT show warning when email is enabled', () => {
      const settings = createMockSettings({
        emailNotifications: true,
        smsNotifications: false,
      });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.queryByText('No notifications enabled')).not.toBeInTheDocument();
    });

    it('should NOT show warning when SMS is enabled', () => {
      const settings = createMockSettings({
        emailNotifications: false,
        smsNotifications: true,
      });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.queryByText('No notifications enabled')).not.toBeInTheDocument();
    });

    it('should NOT show warning when both are enabled', () => {
      const settings = createMockSettings({
        emailNotifications: true,
        smsNotifications: true,
      });
      render(
        <NotificationPreferences
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.queryByText('No notifications enabled')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable checkboxes when loading', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          loading={true}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const emailCheckbox = screen.getByLabelText('Enable email notifications');
      const smsCheckbox = screen.getByLabelText('Enable SMS notifications');

      expect(emailCheckbox).toBeDisabled();
      expect(smsCheckbox).toBeDisabled();
    });

    it('should enable checkboxes when not loading', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          loading={false}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const emailCheckbox = screen.getByLabelText('Enable email notifications');
      const smsCheckbox = screen.getByLabelText('Enable SMS notifications');

      expect(emailCheckbox).not.toBeDisabled();
      expect(smsCheckbox).not.toBeDisabled();
    });
  });

  describe('Help Text', () => {
    it('should display help text for email notifications', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Send email alerts to customers when delays are detected/i)).toBeInTheDocument();
    });

    it('should display help text for SMS notifications', () => {
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Send text message alerts to customers \(requires phone numbers\)/i)).toBeInTheDocument();
    });
  });

  describe('Test Alert Button', () => {
    it('should render Send Test Alert button', () => {
      const mockOnTest = jest.fn();
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      expect(screen.getByRole('button', { name: /Send Test Alert/i })).toBeInTheDocument();
    });

    it('should display help text for Send Test Alert button', () => {
      const mockOnTest = jest.fn();
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      expect(screen.getByText(/Test your notification system by sending a sample delay alert/i)).toBeInTheDocument();
    });

    it('should call onTest when Send Test Alert button is clicked', () => {
      const mockOnTest = jest.fn();
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      const button = screen.getByRole('button', { name: /Send Test Alert/i });
      fireEvent.click(button);

      expect(mockOnTest).toHaveBeenCalledTimes(1);
    });

    it('should disable Send Test Alert button when loading', () => {
      const mockOnTest = jest.fn();
      render(
        <NotificationPreferences
          settings={mockSettings}
          loading={true}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      const button = screen.getByRole('button', { name: /Send Test Alert/i });
      expect(button).toBeDisabled();
    });

    it('should disable Send Test Alert button when both notifications are disabled', () => {
      const mockOnTest = jest.fn();
      const noNotificationsSettings = createMockSettings({
        emailNotifications: false,
        smsNotifications: false,
      });

      render(
        <NotificationPreferences
          settings={noNotificationsSettings}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      const button = screen.getByRole('button', { name: /Send Test Alert/i });
      expect(button).toBeDisabled();
    });

    it('should enable Send Test Alert button when at least one notification is enabled', () => {
      const mockOnTest = jest.fn();
      render(
        <NotificationPreferences
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onTest={mockOnTest}
        />,
      );

      const button = screen.getByRole('button', { name: /Send Test Alert/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Merchant Contact Information', () => {
    const settingsWithContact = createMockSettings({
      merchantEmail: 'merchant@store.com',
      merchantPhone: '+1-555-1234',
      merchantName: 'Store Owner',
    });

    it('should render merchant email input field', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByLabelText('Merchant Email')).toBeInTheDocument();
    });

    it('should render merchant phone input field', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByLabelText('Merchant Phone')).toBeInTheDocument();
    });

    it('should render merchant name input field', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByLabelText('Merchant Name')).toBeInTheDocument();
    });

    it('should display existing merchant contact values', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const emailInput = screen.getByLabelText('Merchant Email') as HTMLInputElement;
      const phoneInput = screen.getByLabelText('Merchant Phone') as HTMLInputElement;
      const nameInput = screen.getByLabelText('Merchant Name') as HTMLInputElement;

      expect(emailInput.value).toBe('merchant@store.com');
      expect(phoneInput.value).toBe('+1-555-1234');
      expect(nameInput.value).toBe('Store Owner');
    });

    it('should call onSettingsChange when merchant email is updated', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const emailInput = screen.getByLabelText('Merchant Email');
      fireEvent.change(emailInput, { target: { value: 'newemail@store.com' } });

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...settingsWithContact,
        merchantEmail: 'newemail@store.com',
      });
    });

    it('should call onSettingsChange when merchant phone is updated', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const phoneInput = screen.getByLabelText('Merchant Phone');
      fireEvent.change(phoneInput, { target: { value: '+1-555-9999' } });

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...settingsWithContact,
        merchantPhone: '+1-555-9999',
      });
    });

    it('should call onSettingsChange when merchant name is updated', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const nameInput = screen.getByLabelText('Merchant Name');
      fireEvent.change(nameInput, { target: { value: 'New Owner' } });

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        ...settingsWithContact,
        merchantName: 'New Owner',
      });
    });

    it('should disable merchant contact inputs when loading', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          loading={true}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      const emailInput = screen.getByLabelText('Merchant Email');
      const phoneInput = screen.getByLabelText('Merchant Phone');
      const nameInput = screen.getByLabelText('Merchant Name');

      expect(emailInput).toBeDisabled();
      expect(phoneInput).toBeDisabled();
      expect(nameInput).toBeDisabled();
    });

    it('should display help text for merchant email', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Warehouse delay notifications will be sent here instead of to customers/i)).toBeInTheDocument();
    });

    it('should display help text for merchant phone', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Optional: Receive SMS notifications for warehouse delays/i)).toBeInTheDocument();
    });

    it('should display help text for merchant name', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Your name for personalized notifications/i)).toBeInTheDocument();
    });

    it('should render Merchant Contact Information section title', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText('Merchant Contact Information')).toBeInTheDocument();
    });

    it('should render section subtitle explaining purpose', () => {
      render(
        <NotificationPreferences
          settings={settingsWithContact}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(screen.getByText(/Receive warehouse delay notifications at these contact details/i)).toBeInTheDocument();
    });
  });

  describe('v1.32: Lucide Icon Integration - Warning Icon', () => {
    describe('Warning Icon Rendering', () => {
      it('should render SVG icon for no notifications warning', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        // Warning should have Lucide SVG icon (AlertTriangle)
        const warningIcon = container.querySelector('[class*="alertIcon"] svg');
        expect(warningIcon).toBeInTheDocument();
        expect(warningIcon).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      });

      it('should not contain emoji in warning message', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningAlert = container.querySelector('[class*="alertWarning"]');
        // Should NOT contain warning emoji ⚠
        expect(warningAlert?.textContent).not.toContain('⚠');
      });

      it('should have aria-hidden="true" on warning SVG icon', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"] svg');
        expect(warningIcon).toHaveAttribute('aria-hidden', 'true');
      });

      it('should maintain accessible warning text with Lucide icon', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        // Warning text should still be readable
        expect(screen.getByText('No notifications enabled')).toBeInTheDocument();
        expect(screen.getByText(/Customers won't be notified about delays/i)).toBeInTheDocument();
      });
    });

    describe('Icon Styling', () => {
      it('should apply consistent size to warning icon', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"] svg');
        // Lucide icons should have width/height attributes
        expect(warningIcon).toHaveAttribute('width');
        expect(warningIcon).toHaveAttribute('height');
        // Consistent size for warning icon (20px to match SettingsCard)
        expect(warningIcon?.getAttribute('width')).toBe('20');
        expect(warningIcon?.getAttribute('height')).toBe('20');
      });

      it('should apply currentColor to warning SVG icon for theming', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"] svg');
        // Lucide icons use currentColor for stroke
        expect(warningIcon).toHaveAttribute('stroke', 'currentColor');
      });
    });

    describe('Conditional Rendering', () => {
      it('should NOT render warning icon when email notifications are enabled', () => {
        const settings = createMockSettings({
          emailNotifications: true,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"]');
        expect(warningIcon).not.toBeInTheDocument();
      });

      it('should NOT render warning icon when SMS notifications are enabled', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: true,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"]');
        expect(warningIcon).not.toBeInTheDocument();
      });

      it('should render warning icon only when both notifications are disabled', () => {
        const settings = createMockSettings({
          emailNotifications: false,
          smsNotifications: false,
        });
        const { container } = render(
          <NotificationPreferences
            settings={settings}
            onSettingsChange={mockOnSettingsChange}
          />,
        );

        const warningIcon = container.querySelector('[class*="alertIcon"] svg');
        expect(warningIcon).toBeInTheDocument();
      });
    });
  });
});
