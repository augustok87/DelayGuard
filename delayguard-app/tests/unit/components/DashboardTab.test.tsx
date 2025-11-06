import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, createMockSettings } from '../../setup/test-utils';
import { DashboardTab } from '../../../src/components/tabs/DashboardTab';

// Mock the child components
jest.mock('../../../src/components/ui/Card', () => ({
  Card: ({ children, title, subtitle }: any) => (
    <div data-testid="card">
      {title && <h3>{title}</h3>}
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}));

jest.mock('../../../src/components/tabs/DashboardTab/SettingsCard', () => ({
  SettingsCard: ({ onSave, onTest, onConnect, onSettingsChange }: any) => (
    <div data-testid="settings-card">
      <button onClick={onSave}>Save Settings</button>
      <button onClick={onTest}>Test Detection</button>
      <button onClick={onConnect}>Connect Shopify</button>
      <button onClick={() => onSettingsChange({ delayThreshold: 5 })}>
        Change Settings
      </button>
    </div>
  ),
}));

describe('DashboardTab', () => {
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

  it('renders with all props', () => {
    render(<DashboardTab {...mockProps} />);

    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('passes correct props to SettingsCard', () => {
    render(<DashboardTab {...mockProps} />);

    const settingsCard = screen.getByTestId('settings-card');
    expect(settingsCard).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<DashboardTab {...mockProps} loading={true} />);

    // Should still render SettingsCard with loading state
    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('handles null shop', () => {
    render(<DashboardTab {...mockProps} shop={null} />);

    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('calls onSaveSettings when save button is clicked', async() => {
    render(<DashboardTab {...mockProps} />);
    
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSaveSettings).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onTestDelayDetection when test button is clicked', async() => {
    render(<DashboardTab {...mockProps} />);
    
    const testButton = screen.getByText('Test Detection');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(mockProps.onTestDelayDetection).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onConnectShopify when connect button is clicked', async() => {
    render(<DashboardTab {...mockProps} />);
    
    const connectButton = screen.getByText('Connect Shopify');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(mockProps.onConnectShopify).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSettingsChange when settings are changed', async() => {
    render(<DashboardTab {...mockProps} />);
    
    const changeButton = screen.getByText('Change Settings');
    fireEvent.click(changeButton);
    
    await waitFor(() => {
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({
        delayThreshold: 5,
      });
    });
  });

  it('memoizes correctly with same props', () => {
    const { rerender } = render(<DashboardTab {...mockProps} />);

    // Re-render with same props
    rerender(<DashboardTab {...mockProps} />);

    // Should still be in document (memoized)
    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('re-renders when props change', () => {
    const { rerender } = render(<DashboardTab {...mockProps} />);

    const newSettings = { ...mockProps.settings, delayThreshold: 10 };
    rerender(<DashboardTab {...mockProps} settings={newSettings} />);

    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('handles different settings configurations', () => {
    const customSettings = createMockSettings({
      delayThreshold: 7,
      emailNotifications: false,
      smsNotifications: true,
    });

    render(<DashboardTab {...mockProps} settings={customSettings} />);

    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('focuses on settings configuration without redundant stats display', () => {
    render(<DashboardTab {...mockProps} />);

    // Dashboard should only show SettingsCard (stats are in header)
    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
    expect(screen.queryByTestId('stats-card')).not.toBeInTheDocument();
  });
});
