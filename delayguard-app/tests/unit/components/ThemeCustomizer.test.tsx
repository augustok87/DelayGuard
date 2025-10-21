import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeCustomizer from '../../../src/components/ThemeCustomizer';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('ThemeCustomizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render theme customizer with default values', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    expect(screen.getAllByText('Theme Customizer')).toHaveLength(2); // Card title and content title
    expect(screen.getByText('Customize')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Preview Theme')).toBeInTheDocument();
    expect(screen.getByText('Export Theme')).toBeInTheDocument();
    expect(screen.getByText('Color Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Share Theme')).toBeInTheDocument();
    expect(screen.getByText('Import Theme')).toBeInTheDocument();
  });

  it('should render form layout with all input fields', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const formLayout = screen.getByTestId('form-layout');
    expect(formLayout).toBeInTheDocument();

    // Check for color pickers
    const colorPickers = screen.getAllByTestId('color-picker');
    expect(colorPickers).toHaveLength(4); // primary, secondary, accent, background

    // Check for text fields
    const textFields = screen.getAllByTestId('text-field');
    expect(textFields).toHaveLength(4); // color text inputs

    // Check for range sliders
    const rangeSliders = screen.getAllByTestId('range-slider');
    expect(rangeSliders).toHaveLength(4); // borderRadius, spacing, fontSize, animationSpeed

    // Check for select
    const selects = screen.getAllByTestId('select');
    expect(selects).toHaveLength(1); // fontFamily

    // Check for checkboxes
    const checkboxes = screen.getAllByTestId('checkbox');
    expect(checkboxes).toHaveLength(3); // darkMode, compactMode, showAnimations
  });

  it('should handle color changes', () => {
    const mockOnThemeChange = jest.fn();
    render(<ThemeCustomizer onThemeChange={mockOnThemeChange} />);

    const primaryColorPicker = screen.getAllByTestId('color-picker')[0];
    fireEvent.change(primaryColorPicker, { target: { value: '#ff0000' } });

    expect(mockOnThemeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryColor: '#ff0000',
      }),
    );
  });

  it('should handle number input changes', () => {
    const mockOnThemeChange = jest.fn();
    render(<ThemeCustomizer onThemeChange={mockOnThemeChange} />);

    const borderRadiusSlider = screen.getAllByTestId('range-slider')[0];
    fireEvent.change(borderRadiusSlider, { target: { value: '12' } });

    expect(mockOnThemeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        borderRadius: 12,
      }),
    );
  });

  it('should handle select changes', () => {
    const mockOnThemeChange = jest.fn();
    render(<ThemeCustomizer onThemeChange={mockOnThemeChange} />);

    const fontFamilySelect = screen.getByTestId('select');
    fireEvent.change(fontFamilySelect, { target: { value: 'Roboto, sans-serif' } });

    expect(mockOnThemeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fontFamily: 'Roboto, sans-serif',
      }),
    );
  });

  it('should handle checkbox changes', () => {
    const mockOnThemeChange = jest.fn();
    render(<ThemeCustomizer onThemeChange={mockOnThemeChange} />);

    const darkModeCheckbox = screen.getAllByTestId('checkbox')[0];
    fireEvent.click(darkModeCheckbox);

    expect(mockOnThemeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        darkMode: true,
      }),
    );
  });

  it('should handle reset functionality', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(screen.getByText('Theme reset to defaults!')).toBeInTheDocument();
  });

  it('should open and close advanced modal', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const advancedButton = screen.getByText('Advanced');
    fireEvent.click(advancedButton);

    expect(screen.getByText('Advanced Theme Settings')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Advanced Theme Settings')).not.toBeInTheDocument();
  });

  it('should handle custom CSS changes', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const advancedButton = screen.getByText('Advanced');
    fireEvent.click(advancedButton);

    const customCSSField = screen.getByPlaceholderText('Enter custom CSS here...');
    fireEvent.change(customCSSField, { target: { value: '.test { color: red; }' } });

    expect(customCSSField).toHaveValue('.test { color: red; }');
  });

  it('should show CSS validation error for invalid CSS', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const advancedButton = screen.getByText('Advanced');
    fireEvent.click(advancedButton);

    const customCSSField = screen.getByPlaceholderText('Enter custom CSS here...');
    fireEvent.change(customCSSField, { target: { value: 'invalid css' } });

    expect(screen.getByText('Invalid CSS syntax')).toBeInTheDocument();
  });

  it('should handle theme preview', () => {
    render(<ThemeCustomizer onThemeChange={jest.fn()} />);

    const previewButton = screen.getByText('Preview Theme');
    fireEvent.click(previewButton);

    expect(screen.getByText('Theme Preview')).toBeInTheDocument();
    expect(screen.getByText('Preview of Your Theme')).toBeInTheDocument();
    expect(screen.getByText('Sample Button')).toBeInTheDocument();
  });

  it('should use initial theme when provided', () => {
    const initialTheme = {
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      accentColor: '#0000ff',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderRadius: 10,
      spacing: 20,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      animationSpeed: 300,
      darkMode: true,
      compactMode: true,
      showAnimations: false,
      customCSS: '.test { color: red; }',
    };

    render(<ThemeCustomizer onThemeChange={jest.fn()} initialTheme={initialTheme} />);

    const primaryColorPicker = screen.getAllByTestId('color-picker')[0];
    expect(primaryColorPicker).toHaveValue('#ff0000');

    const darkModeCheckbox = screen.getAllByTestId('checkbox')[0];
    expect(darkModeCheckbox).toBeChecked();
  });
});