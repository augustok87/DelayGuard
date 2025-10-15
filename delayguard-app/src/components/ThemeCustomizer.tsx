import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  // React UI Components
  Button,
  Text,
  Card,
  Modal,
  Toast,
} from './ui';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  spacing: number;
  fontSize: number;
  fontFamily: string;
  animationSpeed: number;
  darkMode: boolean;
}

interface ThemeCustomizerProps {
  onThemeChange?: (theme: ThemeSettings) => void;
  initialTheme?: ThemeSettings;
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#008060',
  secondaryColor: '#6B7280',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  borderRadius: 8,
  spacing: 16,
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  animationSpeed: 200,
  darkMode: false,
};

function ThemeCustomizer({ onThemeChange, initialTheme = defaultTheme }: ThemeCustomizerProps) {
  const [theme, setTheme] = useState<ThemeSettings>(initialTheme);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [theme, onThemeChange]);

  const handleColorChange = (colorType: keyof ThemeSettings, value: string) => {
    setTheme(prev => ({ ...prev, [colorType]: value }));
  };

  const handleNumberChange = (property: keyof ThemeSettings, value: number) => {
    setTheme(prev => ({ ...prev, [property]: value }));
  };

  const handleBooleanChange = (property: keyof ThemeSettings, value: boolean) => {
    setTheme(prev => ({ ...prev, [property]: value }));
  };

  const handleReset = () => {
    setTheme(defaultTheme);
    setToastMessage('Theme reset to defaults!');
    setShowToast(true);
  };

  const handleSave = () => {
    setShowModal(false);
    setToastMessage('Theme saved successfully!');
    setShowToast(true);
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  const renderColorPicker = (label: string, colorType: keyof ThemeSettings, value: string) => (
    <div style={{ marginBottom: '16px' }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: '8px' }}>{label}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
        />
      </div>
    </div>
  );

  const renderNumberInput = (label: string, property: keyof ThemeSettings, value: number, min = 0, max = 100) => (
    <div style={{ marginBottom: '16px' }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: '8px' }}>{label}</Text>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => handleNumberChange(property, parseInt(e.target.value))}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
      />
    </div>
  );

  const renderSelect = (label: string, property: keyof ThemeSettings, value: string, options: string[]) => (
    <div style={{ marginBottom: '16px' }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: '8px' }}>{label}</Text>
      <select
        value={value}
        onChange={(e) => setTheme(prev => ({ ...prev, [property]: e.target.value }))}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );

  const renderCheckbox = (label: string, property: keyof ThemeSettings, value: boolean) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleBooleanChange(property, e.target.checked)}
        />
        <Text variant="bodyMd" as="span">{label}</Text>
      </label>
    </div>
  );

  const renderModal = () => (
    <Modal
      isOpen={showModal}
      title="Theme Customizer"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: 'Reset',
          onAction: handleReset,
        },
        {
          content: 'Cancel',
          onAction: () => setShowModal(false),
        },
      ]}
      onClose={() => setShowModal(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Text variant="headingMd" as="h3">Colors</Text>
        {renderColorPicker('Primary Color', 'primaryColor', theme.primaryColor)}
        {renderColorPicker('Secondary Color', 'secondaryColor', theme.secondaryColor)}
        {renderColorPicker('Accent Color', 'accentColor', theme.accentColor)}
        {renderColorPicker('Background Color', 'backgroundColor', theme.backgroundColor)}
        {renderColorPicker('Text Color', 'textColor', theme.textColor)}
        
        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0' }} />
        
        <Text variant="headingMd" as="h3">Layout</Text>
        {renderNumberInput('Border Radius (px)', 'borderRadius', theme.borderRadius, 0, 20)}
        {renderNumberInput('Spacing (px)', 'spacing', theme.spacing, 8, 32)}
        {renderNumberInput('Font Size (px)', 'fontSize', theme.fontSize, 12, 20)}
        {renderSelect('Font Family', 'fontFamily', theme.fontFamily, [
          'Inter, system-ui, sans-serif',
          'Helvetica, Arial, sans-serif',
          'Georgia, serif',
          'Monaco, monospace',
        ])}
        {renderNumberInput('Animation Speed (ms)', 'animationSpeed', theme.animationSpeed, 100, 500)}
        
        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0' }} />
        
        <Text variant="headingMd" as="h3">Preferences</Text>
        {renderCheckbox('Dark Mode', 'darkMode', theme.darkMode)}
      </div>
    </Modal>
  );

  return (
    <div>
      <Card>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Text variant="headingMd" as="h3">Theme Customizer</Text>
            <Button onClick={() => setShowModal(true)}>
              Customize
            </Button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <Text variant="bodySm" tone="subdued" as="div">Primary Color</Text>
              <div style={{ 
                width: '100%', 
                height: '40px', 
                backgroundColor: theme.primaryColor, 
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }} />
            </div>
            <div>
              <Text variant="bodySm" tone="subdued" as="div">Secondary Color</Text>
              <div style={{ 
                width: '100%', 
                height: '40px', 
                backgroundColor: theme.secondaryColor, 
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }} />
            </div>
            <div>
              <Text variant="bodySm" tone="subdued" as="div">Accent Color</Text>
              <div style={{ 
                width: '100%', 
                height: '40px', 
                backgroundColor: theme.accentColor, 
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }} />
            </div>
            <div>
              <Text variant="bodySm" tone="subdued" as="div">Background</Text>
              <div style={{ 
                width: '100%', 
                height: '40px', 
                backgroundColor: theme.backgroundColor, 
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }} />
            </div>
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowModal(true)}>
              Advanced
            </Button>
          </div>
        </div>
      </Card>

      {renderModal()}

      {showToast && (
        <Toast message={toastMessage} onClose={handleCloseToast} />
      )}
    </div>
  );
}

export default ThemeCustomizer;
