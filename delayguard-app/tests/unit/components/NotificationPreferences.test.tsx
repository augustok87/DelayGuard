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
});
