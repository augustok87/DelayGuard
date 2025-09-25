import React, { useState, useEffect } from 'react';
import {
  Card,
  FormLayout,
  Select,
  TextField,
  ColorPicker,
  RangeSlider,
  Checkbox,
  Button,
  ButtonGroup,
  Stack,
  Text,
  Divider,
  Banner,
  Modal,
  DisplayText,
  TextStyle
} from '@shopify/polaris';

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
  compactMode: boolean;
  showAnimations: boolean;
  customCSS: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  variables: string[];
}

export function ThemeCustomizer() {
  const [settings, setSettings] = useState<ThemeSettings>({
    primaryColor: '#007ace',
    secondaryColor: '#f6f6f7',
    accentColor: '#00a047',
    backgroundColor: '#ffffff',
    textColor: '#202223',
    borderRadius: 8,
    spacing: 16,
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    animationSpeed: 300,
    darkMode: false,
    compactMode: false,
    showAnimations: true,
    customCSS: ''
  });

  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 'default',
      name: 'Default Template',
      subject: 'Update on Your Order #{order_number}',
      body: 'Hi {customer_name},\n\nWe wanted to let you know that your order #{order_number} is experiencing a delay in shipping.\n\nExpected delivery: {estimated_delivery_date}\nTracking number: {tracking_number}\n\nWe apologize for any inconvenience and appreciate your patience.\n\nBest regards,\n{store_name}',
      isDefault: true,
      variables: ['order_number', 'customer_name', 'estimated_delivery_date', 'tracking_number', 'store_name']
    },
    {
      id: 'friendly',
      name: 'Friendly Template',
      subject: 'Hey {customer_name}! Quick update on your order 🚚',
      body: 'Hi {customer_name}!\n\nWe hope you\'re doing well! We wanted to give you a heads up that your order #{order_number} is taking a bit longer than expected to ship.\n\nDon\'t worry though - it\'s on its way! Expected delivery: {estimated_delivery_date}\n\nYou can track it here: {tracking_url}\n\nThanks for your patience! 😊\n\n{store_name} Team',
      isDefault: false,
      variables: ['order_number', 'customer_name', 'estimated_delivery_date', 'tracking_url', 'store_name']
    },
    {
      id: 'professional',
      name: 'Professional Template',
      subject: 'Order #{order_number} - Shipping Delay Notification',
      body: 'Dear {customer_name},\n\nWe are writing to inform you that your order #{order_number} is experiencing a shipping delay.\n\nOrder Details:\n- Order Number: {order_number}\n- Expected Delivery: {estimated_delivery_date}\n- Tracking Number: {tracking_number}\n- Carrier: {carrier_name}\n\nWe apologize for any inconvenience this may cause. Our team is working diligently to resolve this matter.\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{store_name} Customer Service',
      isDefault: false,
      variables: ['order_number', 'customer_name', 'estimated_delivery_date', 'tracking_number', 'carrier_name', 'store_name']
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/theme-settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        // Apply theme changes immediately
        applyTheme(settings);
      }
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', themeSettings.primaryColor);
    root.style.setProperty('--secondary-color', themeSettings.secondaryColor);
    root.style.setProperty('--accent-color', themeSettings.accentColor);
    root.style.setProperty('--background-color', themeSettings.backgroundColor);
    root.style.setProperty('--text-color', themeSettings.textColor);
    root.style.setProperty('--border-radius', `${themeSettings.borderRadius}px`);
    root.style.setProperty('--spacing', `${themeSettings.spacing}px`);
    root.style.setProperty('--font-size', `${themeSettings.fontSize}px`);
    root.style.setProperty('--font-family', themeSettings.fontFamily);
    root.style.setProperty('--animation-speed', `${themeSettings.animationSpeed}ms`);
    
    if (themeSettings.darkMode) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
    
    if (themeSettings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    if (!themeSettings.showAnimations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  };

  const resetToDefault = () => {
    const defaultSettings: ThemeSettings = {
      primaryColor: '#007ace',
      secondaryColor: '#f6f6f7',
      accentColor: '#00a047',
      backgroundColor: '#ffffff',
      textColor: '#202223',
      borderRadius: 8,
      spacing: 16,
      fontSize: 14,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      animationSpeed: 300,
      darkMode: false,
      compactMode: false,
      showAnimations: true,
      customCSS: ''
    };
    
    setSettings(defaultSettings);
    applyTheme(defaultSettings);
  };

  const exportTheme = () => {
    const themeData = {
      settings,
      templates,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delayguard-theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const themeData = JSON.parse(e.target?.result as string);
          if (themeData.settings) {
            setSettings(themeData.settings);
            applyTheme(themeData.settings);
          }
        } catch (error) {
          console.error('Failed to import theme:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <DisplayText size="large">Theme Customizer</DisplayText>
      <TextStyle variation="subdued">
        Customize the appearance and behavior of your DelayGuard dashboard
      </TextStyle>

      <div style={{ marginTop: '20px' }}>
        <Stack distribution="fill">
          <Card title="Color Scheme" sectioned>
            <FormLayout>
              <ColorPicker
                label="Primary Color"
                color={settings.primaryColor}
                onChange={(color) => setSettings({ ...settings, primaryColor: color })}
              />
              
              <ColorPicker
                label="Secondary Color"
                color={settings.secondaryColor}
                onChange={(color) => setSettings({ ...settings, secondaryColor: color })}
              />
              
              <ColorPicker
                label="Accent Color"
                color={settings.accentColor}
                onChange={(color) => setSettings({ ...settings, accentColor: color })}
              />
              
              <ColorPicker
                label="Background Color"
                color={settings.backgroundColor}
                onChange={(color) => setSettings({ ...settings, backgroundColor: color })}
              />
              
              <ColorPicker
                label="Text Color"
                color={settings.textColor}
                onChange={(color) => setSettings({ ...settings, textColor: color })}
              />
            </FormLayout>
          </Card>

          <Card title="Layout & Typography" sectioned>
            <FormLayout>
              <RangeSlider
                label="Border Radius"
                value={settings.borderRadius}
                min={0}
                max={20}
                step={1}
                onChange={(value) => setSettings({ ...settings, borderRadius: value })}
                output
              />
              
              <RangeSlider
                label="Spacing"
                value={settings.spacing}
                min={8}
                max={32}
                step={4}
                onChange={(value) => setSettings({ ...settings, spacing: value })}
                output
              />
              
              <RangeSlider
                label="Font Size"
                value={settings.fontSize}
                min={12}
                max={18}
                step={1}
                onChange={(value) => setSettings({ ...settings, fontSize: value })}
                output
              />
              
              <Select
                label="Font Family"
                options={[
                  { label: 'Inter', value: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' },
                  { label: 'Roboto', value: 'Roboto, sans-serif' },
                  { label: 'Open Sans', value: 'Open Sans, sans-serif' },
                  { label: 'Lato', value: 'Lato, sans-serif' },
                  { label: 'Montserrat', value: 'Montserrat, sans-serif' }
                ]}
                value={settings.fontFamily}
                onChange={(value) => setSettings({ ...settings, fontFamily: value })}
              />
            </FormLayout>
          </Card>
        </Stack>

        <div style={{ marginTop: '20px' }}>
          <Card title="Preferences" sectioned>
            <FormLayout>
              <Checkbox
                label="Dark Mode"
                checked={settings.darkMode}
                onChange={(checked) => setSettings({ ...settings, darkMode: checked })}
              />
              
              <Checkbox
                label="Compact Mode"
                checked={settings.compactMode}
                onChange={(checked) => setSettings({ ...settings, compactMode: checked })}
              />
              
              <Checkbox
                label="Show Animations"
                checked={settings.showAnimations}
                onChange={(checked) => setSettings({ ...settings, showAnimations: checked })}
              />
              
              <RangeSlider
                label="Animation Speed"
                value={settings.animationSpeed}
                min={100}
                max={1000}
                step={50}
                onChange={(value) => setSettings({ ...settings, animationSpeed: value })}
                output
                disabled={!settings.showAnimations}
              />
            </FormLayout>
          </Card>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Card title="Notification Templates" sectioned>
            <FormLayout>
              <Select
                label="Template"
                options={templates.map(t => ({ label: t.name, value: t.id }))}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
              />
              
              <TextField
                label="Subject"
                value={templates.find(t => t.id === selectedTemplate)?.subject || ''}
                onChange={(value) => {
                  const updatedTemplates = templates.map(t => 
                    t.id === selectedTemplate ? { ...t, subject: value } : t
                  );
                  setTemplates(updatedTemplates);
                }}
                multiline
              />
              
              <TextField
                label="Body"
                value={templates.find(t => t.id === selectedTemplate)?.body || ''}
                onChange={(value) => {
                  const updatedTemplates = templates.map(t => 
                    t.id === selectedTemplate ? { ...t, body: value } : t
                  );
                  setTemplates(updatedTemplates);
                }}
                multiline
                rows={8}
              />
              
              <div>
                <Text variant="headingMd">Available Variables:</Text>
                <div style={{ marginTop: '8px' }}>
                  {templates.find(t => t.id === selectedTemplate)?.variables.map(variable => (
                    <span key={variable} style={{ 
                      display: 'inline-block', 
                      margin: '2px', 
                      padding: '4px 8px', 
                      backgroundColor: '#f6f6f7', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      {`{${variable}}`}
                    </span>
                  ))}
                </div>
              </div>
            </FormLayout>
          </Card>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Card title="Custom CSS" sectioned>
            <FormLayout>
              <TextField
                label="Custom CSS"
                value={settings.customCSS}
                onChange={(value) => setSettings({ ...settings, customCSS: value })}
                multiline
                rows={6}
                helpText="Add custom CSS to further customize the appearance"
              />
            </FormLayout>
          </Card>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Card title="Actions" sectioned>
            <ButtonGroup>
              <Button primary onClick={saveSettings} loading={saving}>
                Save Changes
              </Button>
              
              <Button onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>
              
              <Button onClick={resetToDefault}>
                Reset to Default
              </Button>
              
              <Button onClick={exportTheme}>
                Export Theme
              </Button>
              
              <Button>
                <label htmlFor="import-theme" style={{ cursor: 'pointer' }}>
                  Import Theme
                </label>
                <input
                  id="import-theme"
                  type="file"
                  accept=".json"
                  onChange={importTheme}
                  style={{ display: 'none' }}
                />
              </Button>
            </ButtonGroup>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Theme Preview"
        large
      >
        <Modal.Section>
          <div style={{ 
            padding: '20px',
            backgroundColor: settings.backgroundColor,
            color: settings.textColor,
            borderRadius: `${settings.borderRadius}px`,
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`
          }}>
            <h2 style={{ color: settings.primaryColor }}>DelayGuard Dashboard</h2>
            <p>This is a preview of how your dashboard will look with the current theme settings.</p>
            
            <div style={{ 
              marginTop: '20px',
              padding: '16px',
              backgroundColor: settings.secondaryColor,
              borderRadius: `${settings.borderRadius}px`,
              border: `1px solid ${settings.accentColor}`
            }}>
              <h3 style={{ color: settings.accentColor }}>Sample Alert</h3>
              <p>Order #12345 is experiencing a delay</p>
              <button style={{
                backgroundColor: settings.primaryColor,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: `${settings.borderRadius}px`,
                cursor: 'pointer'
              }}>
                View Details
              </button>
            </div>
          </div>
        </Modal.Section>
      </Modal>
    </div>
  );
}
