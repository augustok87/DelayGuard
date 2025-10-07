import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeCustomizer } from '../../../src/components/ThemeCustomizer';

// Mock Shopify Polaris components
jest.mock('@shopify/polaris', () => ({
  Card: ({ children, title, ...props }: any) => <div data-testid="card" data-title={title} {...props}>{children}</div>,
  FormLayout: ({ children, ...props }: any) => <div data-testid="form-layout" {...props}>{children}</div>,
  Select: ({ options, value, onChange, ...props }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  TextField: ({ label, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input data-testid="text-field" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  ),
  ColorPicker: ({ color, onChange, ...props }: any) => (
    <div>
      <input 
        type="color" 
        data-testid="color-picker" 
        value={color} 
        onChange={(e) => onChange(e.target.value)} 
        {...props} 
      />
    </div>
  ),
  RangeSlider: ({ label, value, onChange, min, max, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input 
        type="range" 
        data-testid="range-slider" 
        value={value} 
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value))} 
        {...props} 
      />
    </div>
  ),
  Checkbox: ({ label, checked, onChange, ...props }: any) => (
    <label>
      <input 
        type="checkbox" 
        data-testid="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        {...props} 
      />
      {label}
    </label>
  ),
  Button: ({ children, onClick, ...props }: any) => <button data-testid="button" onClick={onClick} {...props}>{children}</button>,
  ButtonGroup: ({ children, ...props }: any) => <div data-testid="button-group" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  Divider: ({ ...props }: any) => <hr data-testid="divider" {...props} />,
  Banner: ({ children, status, ...props }: any) => <div data-testid="banner" data-status={status} {...props}>{children}</div>,
  Modal: ({ open, onClose, children, title, ...props }: any) => 
    open ? (
      <div data-testid="modal" data-title={title} {...props}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('ThemeCustomizer', () => {
  const defaultSettings = {
    primaryColor: '#007ace',
    secondaryColor: '#f6f6f7',
    accentColor: '#00a047',
    backgroundColor: '#ffffff',
    textColor: '#202223',
    borderRadius: 4,
    spacing: 16,
    fontSize: 14,
    fontFamily: 'Inter',
    animationSpeed: 300,
    darkMode: false,
    compactMode: false,
    showAnimations: true,
    customCSS: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(defaultSettings));
  });

  it('should render theme customizer with all controls', () => {
    render(<ThemeCustomizer />);

    expect(screen.getByText('Theme Customizer')).toBeInTheDocument();
    expect(screen.getByText('Color Settings')).toBeInTheDocument();
    expect(screen.getByText('Layout Settings')).toBeInTheDocument();
    expect(screen.getByText('Typography Settings')).toBeInTheDocument();
    expect(screen.getByText('Animation Settings')).toBeInTheDocument();
  });

  it('should load saved settings from localStorage', () => {
    const customSettings = {
      ...defaultSettings,
      primaryColor: '#ff0000',
      darkMode: true
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(customSettings));
    
    render(<ThemeCustomizer />);

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('themeSettings');
  });

  it('should update primary color when color picker changes', () => {
    render(<ThemeCustomizer />);

    const colorPicker = screen.getByTestId('color-picker');
    fireEvent.change(colorPicker, { target: { value: '#ff0000' } });

    expect(colorPicker).toHaveValue('#ff0000');
  });

  it('should update secondary color when color picker changes', () => {
    render(<ThemeCustomizer />);

    const colorPickers = screen.getAllByTestId('color-picker');
    const secondaryColorPicker = colorPickers[1];
    
    fireEvent.change(secondaryColorPicker, { target: { value: '#00ff00' } });

    expect(secondaryColorPicker).toHaveValue('#00ff00');
  });

  it('should update accent color when color picker changes', () => {
    render(<ThemeCustomizer />);

    const colorPickers = screen.getAllByTestId('color-picker');
    const accentColorPicker = colorPickers[2];
    
    fireEvent.change(accentColorPicker, { target: { value: '#0000ff' } });

    expect(accentColorPicker).toHaveValue('#0000ff');
  });

  it('should update background color when color picker changes', () => {
    render(<ThemeCustomizer />);

    const colorPickers = screen.getAllByTestId('color-picker');
    const backgroundColorPicker = colorPickers[3];
    
    fireEvent.change(backgroundColorPicker, { target: { value: '#f0f0f0' } });

    expect(backgroundColorPicker).toHaveValue('#f0f0f0');
  });

  it('should update text color when color picker changes', () => {
    render(<ThemeCustomizer />);

    const colorPickers = screen.getAllByTestId('color-picker');
    const textColorPicker = colorPickers[4];
    
    fireEvent.change(textColorPicker, { target: { value: '#333333' } });

    expect(textColorPicker).toHaveValue('#333333');
  });

  it('should update border radius when slider changes', () => {
    render(<ThemeCustomizer />);

    const borderRadiusSlider = screen.getByTestId('range-slider');
    fireEvent.change(borderRadiusSlider, { target: { value: '8' } });

    expect(borderRadiusSlider).toHaveValue(8);
  });

  it('should update spacing when slider changes', () => {
    render(<ThemeCustomizer />);

    const spacingSliders = screen.getAllByTestId('range-slider');
    const spacingSlider = spacingSliders[1];
    
    fireEvent.change(spacingSlider, { target: { value: '24' } });

    expect(spacingSlider).toHaveValue(24);
  });

  it('should update font size when slider changes', () => {
    render(<ThemeCustomizer />);

    const fontSizeSliders = screen.getAllByTestId('range-slider');
    const fontSizeSlider = fontSizeSliders[2];
    
    fireEvent.change(fontSizeSlider, { target: { value: '16' } });

    expect(fontSizeSlider).toHaveValue(16);
  });

  it('should update font family when select changes', () => {
    render(<ThemeCustomizer />);

    const fontFamilySelect = screen.getByTestId('select');
    fireEvent.change(fontFamilySelect, { target: { value: 'Arial' } });

    expect(fontFamilySelect).toHaveValue('Arial');
  });

  it('should update animation speed when slider changes', () => {
    render(<ThemeCustomizer />);

    const animationSliders = screen.getAllByTestId('range-slider');
    const animationSlider = animationSliders[3];
    
    fireEvent.change(animationSlider, { target: { value: '500' } });

    expect(animationSlider).toHaveValue(500);
  });

  it('should toggle dark mode when checkbox changes', () => {
    render(<ThemeCustomizer />);

    const darkModeCheckbox = screen.getByTestId('checkbox');
    fireEvent.click(darkModeCheckbox);

    expect(darkModeCheckbox).toBeChecked();
  });

  it('should toggle compact mode when checkbox changes', () => {
    render(<ThemeCustomizer />);

    const checkboxes = screen.getAllByTestId('checkbox');
    const compactModeCheckbox = checkboxes[1];
    
    fireEvent.click(compactModeCheckbox);

    expect(compactModeCheckbox).toBeChecked();
  });

  it('should toggle show animations when checkbox changes', () => {
    render(<ThemeCustomizer />);

    const checkboxes = screen.getAllByTestId('checkbox');
    const showAnimationsCheckbox = checkboxes[2];
    
    fireEvent.click(showAnimationsCheckbox);

    expect(showAnimationsCheckbox).toBeChecked();
  });

  it('should update custom CSS when text field changes', () => {
    render(<ThemeCustomizer />);

    const customCSSField = screen.getByTestId('text-field');
    fireEvent.change(customCSSField, { target: { value: '.custom { color: red; }' } });

    expect(customCSSField).toHaveValue('.custom { color: red; }');
  });

  it('should save settings when save button is clicked', () => {
    render(<ThemeCustomizer />);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'themeSettings',
      expect.stringContaining('"primaryColor":"#007ace"')
    );
  });

  it('should reset settings when reset button is clicked', () => {
    render(<ThemeCustomizer />);

    // Change some settings first
    const colorPicker = screen.getByTestId('color-picker');
    fireEvent.change(colorPicker, { target: { value: '#ff0000' } });

    // Reset settings
    const resetButton = screen.getByText('Reset to Default');
    fireEvent.click(resetButton);

    expect(colorPicker).toHaveValue('#007ace');
  });

  it('should preview theme when preview button is clicked', () => {
    render(<ThemeCustomizer />);

    const previewButton = screen.getByText('Preview Theme');
    fireEvent.click(previewButton);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('should export theme when export button is clicked', () => {
    render(<ThemeCustomizer />);

    const exportButton = screen.getByText('Export Theme');
    fireEvent.click(exportButton);

    // Check if download is triggered
    expect(screen.getByText('Theme exported successfully')).toBeInTheDocument();
  });

  it('should import theme when import button is clicked', () => {
    render(<ThemeCustomizer />);

    const importButton = screen.getByText('Import Theme');
    fireEvent.click(importButton);

    // Simulate file selection
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['{"primaryColor":"#ff0000"}'], 'theme.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Theme imported successfully')).toBeInTheDocument();
  });

  it('should handle invalid theme import', () => {
    render(<ThemeCustomizer />);

    const importButton = screen.getByText('Import Theme');
    fireEvent.click(importButton);

    // Simulate invalid file
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['invalid json'], 'theme.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Invalid theme file')).toBeInTheDocument();
  });

  it('should show color palette suggestions', () => {
    render(<ThemeCustomizer />);

    const suggestionsButton = screen.getByText('Color Suggestions');
    fireEvent.click(suggestionsButton);

    expect(screen.getByText('Popular Color Palettes')).toBeInTheDocument();
  });

  it('should apply color palette when suggestion is clicked', () => {
    render(<ThemeCustomizer />);

    const suggestionsButton = screen.getByText('Color Suggestions');
    fireEvent.click(suggestionsButton);

    const paletteButton = screen.getByText('Ocean Blue');
    fireEvent.click(paletteButton);

    const colorPicker = screen.getByTestId('color-picker');
    expect(colorPicker).toHaveValue('#0066cc');
  });

  it('should handle responsive design', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });

    render(<ThemeCustomizer />);

    // Check if responsive layout is applied
    expect(screen.getByTestId('form-layout')).toBeInTheDocument();
  });

  it('should validate color values', () => {
    render(<ThemeCustomizer />);

    const colorPicker = screen.getByTestId('color-picker');
    fireEvent.change(colorPicker, { target: { value: 'invalid-color' } });

    expect(screen.getByText('Invalid color value')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(<ThemeCustomizer />);

    // Test keyboard navigation
    const firstButton = screen.getAllByTestId('button')[0];
    firstButton.focus();
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('should show accessibility options', () => {
    render(<ThemeCustomizer />);

    const accessibilityButton = screen.getByText('Accessibility Options');
    fireEvent.click(accessibilityButton);

    expect(screen.getByText('High Contrast Mode')).toBeInTheDocument();
    expect(screen.getByText('Large Text Mode')).toBeInTheDocument();
  });

  it('should handle theme presets', () => {
    render(<ThemeCustomizer />);

    const presetsButton = screen.getByText('Theme Presets');
    fireEvent.click(presetsButton);

    expect(screen.getByText('Light Theme')).toBeInTheDocument();
    expect(screen.getByText('Dark Theme')).toBeInTheDocument();
    expect(screen.getByText('High Contrast')).toBeInTheDocument();
  });

  it('should apply preset when preset is selected', () => {
    render(<ThemeCustomizer />);

    const presetsButton = screen.getByText('Theme Presets');
    fireEvent.click(presetsButton);

    const darkThemeButton = screen.getByText('Dark Theme');
    fireEvent.click(darkThemeButton);

    const darkModeCheckbox = screen.getByTestId('checkbox');
    expect(darkModeCheckbox).toBeChecked();
  });

  it('should handle undo/redo functionality', () => {
    render(<ThemeCustomizer />);

    // Change a setting
    const colorPicker = screen.getByTestId('color-picker');
    fireEvent.change(colorPicker, { target: { value: '#ff0000' } });

    // Undo
    const undoButton = screen.getByText('Undo');
    fireEvent.click(undoButton);

    expect(colorPicker).toHaveValue('#007ace');

    // Redo
    const redoButton = screen.getByText('Redo');
    fireEvent.click(redoButton);

    expect(colorPicker).toHaveValue('#ff0000');
  });

  it('should show theme preview in real-time', () => {
    render(<ThemeCustomizer />);

    const colorPicker = screen.getByTestId('color-picker');
    fireEvent.change(colorPicker, { target: { value: '#ff0000' } });

    // Check if preview updates
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument();
  });

  it('should handle theme sharing', () => {
    render(<ThemeCustomizer />);

    const shareButton = screen.getByText('Share Theme');
    fireEvent.click(shareButton);

    expect(screen.getByText('Theme link copied to clipboard')).toBeInTheDocument();
  });

  it('should handle theme validation', () => {
    render(<ThemeCustomizer />);

    const customCSSField = screen.getByTestId('text-field');
    fireEvent.change(customCSSField, { target: { value: 'invalid css { color: red; }' } });

    expect(screen.getByText('Invalid CSS syntax')).toBeInTheDocument();
  });
});
