import * as React from "react";
import { useState, useEffect } from "react";
import {
  // React UI Components
  Button,
  Text,
  Card,
  Modal,
  Toast,
} from "./ui";

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
  compactMode?: boolean;
  showAnimations?: boolean;
  customCSS?: string;
}

interface ThemeCustomizerProps {
  onThemeChange?: (theme: ThemeSettings) => void;
  initialTheme?: ThemeSettings;
}

const defaultTheme: ThemeSettings = {
  primaryColor: "#008060",
  secondaryColor: "#6B7280",
  accentColor: "#F59E0B",
  backgroundColor: "#FFFFFF",
  textColor: "#1F2937",
  borderRadius: 8,
  spacing: 16,
  fontSize: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  animationSpeed: 200,
  darkMode: false,
  compactMode: false,
  showAnimations: true,
  customCSS: "",
};

function ThemeCustomizer({
  onThemeChange,
  initialTheme = defaultTheme,
}: {
  onThemeChange: (theme: ThemeSettings) => void;
  initialTheme?: ThemeSettings;
}): React.JSX.Element {
  const [theme, setTheme] = useState<ThemeSettings>(initialTheme);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);
  const [customCSSError, setCustomCSSError] = useState<string | null>(null);

  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [theme, onThemeChange]);

  const handleColorChange = (property: keyof ThemeSettings, value: string) => {
    setTheme((prev) => ({ ...prev, [property]: value }));
  };
handleColorChange.displayName = 'handleColorChange';

  const handleNumberChange = (property: keyof ThemeSettings, value: number) => {
    setTheme((prev) => ({ ...prev, [property]: value }));
  };
handleNumberChange.displayName = 'handleNumberChange';

  const handleStringChange = (property: keyof ThemeSettings, value: string) => {
    setTheme((prev) => ({ ...prev, [property]: value }));
  };
handleStringChange.displayName = 'handleStringChange';

  const handleBooleanChange = (
    property: keyof ThemeSettings,
    value: boolean,
  ) => {
    setTheme((prev) => ({ ...prev, [property]: value }));
  };
handleBooleanChange.displayName = 'handleBooleanChange';

  const handleReset = () => {
    setTheme(defaultTheme);
    setToastMessage("Theme reset to defaults!");
    setShowToast(true);
  };
handleReset.displayName = 'handleReset';

  const handleSave = () => {
    setShowModal(false);
    setToastMessage("Theme saved successfully!");
    setShowToast(true);
  };
handleSave.displayName = 'handleSave';

  const handleCloseToast = () => {
    setShowToast(false);
  };
handleCloseToast.displayName = 'handleCloseToast';

  const handlePreviewTheme = () => {
    setShowPreview(true);
    setToastMessage("Theme preview opened!");
    setShowToast(true);
  };
handlePreviewTheme.displayName = 'handlePreviewTheme';

  const handleExportTheme = () => {
    const themeData = JSON.stringify(theme, null, 2);
    const blob = new Blob([themeData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delayguard-theme.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Theme exported successfully!");
    setShowToast(true);
  };
handleExportTheme.displayName = 'handleExportTheme';

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string);
          setTheme(importedTheme);
          setToastMessage("Theme imported successfully!");
          setShowToast(true);
        } catch (error) {
          setToastMessage("Invalid theme file!");
          setShowToast(true);
        }
      };
// handleImportTheme.displayName = 'handleImportTheme'; // Function expressions don't have displayName
      reader.readAsText(file);
    }
  };

  const handleColorSuggestions = () => {
    setShowColorSuggestions(true);
  };
handleColorSuggestions.displayName = 'handleColorSuggestions';

  const handleShareTheme = () => {
    const themeUrl = btoa(JSON.stringify(theme));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(
        `${window.location.origin}?theme=${themeUrl}`,
      );
    } else {
      // Fallback for testing environment
      const textArea = document.createElement("textarea");
      textArea.value = `${window.location.origin}?theme=${themeUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setToastMessage("Theme link copied to clipboard");
    setShowToast(true);
  };
handleShareTheme.displayName = 'handleShareTheme';

  const handleCustomCSSChange = (value: string) => {
    setTheme((prev) => ({ ...prev, customCSS: value }));
    // Basic CSS validation
    try {
      // Simple validation - check for basic CSS syntax
      if (value && !value.match(/\{[^}]*\}/)) {
        setCustomCSSError("Invalid CSS syntax");
      } else {
        setCustomCSSError(null);
      }
    } catch (error) {
      setCustomCSSError("Invalid CSS syntax");
    }
  };
handleCustomCSSChange.displayName = 'handleCustomCSSChange';

  const colorPalettes = [
    {
      name: "Ocean Blue",
      colors: ["#0066CC", "#4A90E2", "#7BB3F0", "#FFFFFF"],
    },
    {
      name: "Forest Green",
      colors: ["#2E7D32", "#4CAF50", "#81C784", "#FFFFFF"],
    },
    {
      name: "Sunset Orange",
      colors: ["#FF5722", "#FF9800", "#FFB74D", "#FFFFFF"],
    },
    {
      name: "Royal Purple",
      colors: ["#673AB7", "#9C27B0", "#BA68C8", "#FFFFFF"],
    },
  ];

  const renderColorPicker = (
    label: string,
    colorType: keyof ThemeSettings,
    value: string,
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: "8px" }}>
        {label}
      </Text>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="color"
          data-testid="color-picker"
          value={value}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          style={{
            width: "40px",
            height: "40px",
            border: "none",
            borderRadius: "4px",
          }}
        />
        <input
          type="text"
          data-testid="text-field"
          value={value}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );

  const renderNumberInput = (
    label: string,
    property: keyof ThemeSettings,
    value: number,
    min = 0,
    max = 100,
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: "8px" }}>
        {label}
      </Text>
      <input
        data-testid="range-slider"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => handleNumberChange(property, parseInt(e.target.value))}
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
        }}
      />
    </div>
  );

  const renderSelect = (
    label: string,
    property: keyof ThemeSettings,
    value: string,
    options: { label: string; value: string }[],
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <Text variant="bodyMd" as="div" style={{ marginBottom: "8px" }}>
        {label}
      </Text>
      <select
        data-testid="select"
        value={value}
        onChange={(e) => handleStringChange(property, e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderCheckbox = (
    label: string,
    property: keyof ThemeSettings,
    value: boolean,
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          data-testid="checkbox"
          type="checkbox"
          checked={value}
          onChange={(e) => handleBooleanChange(property, e.target.checked)}
        />
        <Text variant="bodyMd" as="span">
          {label}
        </Text>
      </label>
    </div>
  );

  const renderModal = () => (
    <Modal
      isOpen={showModal}
      title="Advanced Theme Settings"
      onClose={() => setShowModal(false)}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => setShowModal(false),
        },
      ]}
    >
      <div>
        <Text variant="headingMd" as="h3">
          Custom CSS
        </Text>
        <textarea
          data-testid="text-field"
          value={theme.customCSS || ""}
          onChange={(e) => handleCustomCSSChange(e.target.value)}
          placeholder="Enter custom CSS here..."
          style={{
            width: "100%",
            height: "100px",
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "12px",
          }}
        />
        {customCSSError && (
          <Text variant="bodySm" tone="critical" style={{ marginTop: "4px" }}>
            {customCSSError}
          </Text>
        )}
      </div>
    </Modal>
  );

  return (
    <div style={{ padding: "20px" }}>
      <Card title="Theme Customizer">
        <div style={{ padding: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <Text variant="headingMd" as="h3">
              Theme Customizer
            </Text>
            <Button onClick={() => setShowModal(true)}>Customize</Button>
          </div>

          <div
            data-testid="form-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {renderColorPicker(
              "Primary Color",
              "primaryColor",
              theme.primaryColor,
            )}
            {renderColorPicker(
              "Secondary Color",
              "secondaryColor",
              theme.secondaryColor,
            )}
            {renderColorPicker(
              "Accent Color",
              "accentColor",
              theme.accentColor,
            )}
            {renderColorPicker(
              "Background",
              "backgroundColor",
              theme.backgroundColor,
            )}
            {renderNumberInput(
              "Border Radius",
              "borderRadius",
              theme.borderRadius,
              0,
              20,
            )}
            {renderNumberInput("Spacing", "spacing", theme.spacing, 8, 32)}
            {renderNumberInput("Font Size", "fontSize", theme.fontSize, 10, 24)}
            {renderSelect("Font Family", "fontFamily", theme.fontFamily, [
              { label: "Inter", value: "Inter, system-ui, sans-serif" },
              { label: "Roboto", value: "Roboto, sans-serif" },
              { label: "Open Sans", value: "Open Sans, sans-serif" },
              { label: "Lato", value: "Lato, sans-serif" },
            ])}
            {renderNumberInput(
              "Animation Speed",
              "animationSpeed",
              theme.animationSpeed,
              100,
              1000,
            )}
            {renderCheckbox("Dark Mode", "darkMode", theme.darkMode)}
            {renderCheckbox(
              "Compact Mode",
              "compactMode",
              theme.compactMode || false,
            )}
            {renderCheckbox(
              "Show Animations",
              "showAnimations",
              theme.showAnimations || true,
            )}
          </div>

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Button size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowModal(true)}
            >
              Advanced
            </Button>
            <Button size="sm" variant="secondary" onClick={handlePreviewTheme}>
              Preview Theme
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExportTheme}>
              Export Theme
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleColorSuggestions}
            >
              Color Suggestions
            </Button>
            <Button size="sm" variant="secondary" onClick={handleShareTheme}>
              Share Theme
            </Button>
            <label
              htmlFor="theme-import"
              style={{ display: "inline-block" }}
              aria-label="Import theme from file"
            >
              <input
                id="theme-import"
                type="file"
                accept=".json"
                onChange={handleImportTheme}
                style={{ display: "none" }}
              />
              <span style={{ display: "inline-block" }}>
                <Button size="sm" variant="secondary">
                  Import Theme
                </Button>
              </span>
            </label>
          </div>
        </div>
      </Card>

      {renderModal()}

      {/* Preview Modal */}
      {showPreview && (
        <Modal
          isOpen={showPreview}
          title="Theme Preview"
          onClose={() => setShowPreview(false)}
          primaryAction={{
            content: "Close",
            onAction: () => setShowPreview(false),
          }}
        >
          <div
            style={{
              padding: "20px",
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
            }}
          >
            <Text
              variant="headingMd"
              as="h3"
              style={{ color: theme.primaryColor }}
            >
              Preview of Your Theme
            </Text>
            <div
              style={{
                padding: "16px",
                backgroundColor: theme.secondaryColor,
                borderRadius: `${theme.borderRadius}px`,
                margin: "16px 0",
              }}
            >
              <Text>
                This is how your theme will look with the current settings.
              </Text>
            </div>
            <button
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.backgroundColor,
                borderRadius: `${theme.borderRadius}px`,
                padding: "8px 16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Sample Button
            </button>
          </div>
        </Modal>
      )}

      {/* Color Suggestions Modal */}
      {showColorSuggestions && (
        <Modal
          isOpen={showColorSuggestions}
          title="Color Suggestions"
          onClose={() => setShowColorSuggestions(false)}
          primaryAction={{
            content: "Close",
            onAction: () => setShowColorSuggestions(false),
          }}
        >
          <div>
            <Text variant="headingMd" as="h3" style={{ marginBottom: "16px" }}>
              Popular Color Palettes
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {colorPalettes.map((palette, index) => (
                <div
                  key={palette.name || `palette-${index}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <Text
                    variant="bodyMd"
                    as="div"
                    style={{ marginBottom: "8px" }}
                  >
                    {palette.name}
                  </Text>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {palette.colors.map((color, colorIndex) => (
                      <div
                        key={`${palette.name}-color-${colorIndex}`}
                        style={{
                          width: "30px",
                          height: "30px",
                          backgroundColor: color,
                          borderRadius: "4px",
                          cursor: "pointer",
                          border: "1px solid #d1d5db",
                        }}
                        onClick={() => {
                          setTheme((prev) => ({
                            ...prev,
                            primaryColor: palette.colors[0],
                            secondaryColor: palette.colors[1],
                            accentColor: palette.colors[2],
                            backgroundColor: palette.colors[3],
                          }));
                          setShowColorSuggestions(false);
                          setToastMessage(`${palette.name} palette applied!`);
                          setShowToast(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setTheme((prev) => ({
                              ...prev,
                              primaryColor: palette.colors[0],
                              secondaryColor: palette.colors[1],
                              accentColor: palette.colors[2],
                              backgroundColor: palette.colors[3],
                            }));
                            setShowColorSuggestions(false);
                            setToastMessage(`${palette.name} palette applied!`);
                            setShowToast(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Apply ${palette.name} color palette`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showToast && <Toast message={toastMessage} onClose={handleCloseToast} />}
    </div>
  );
}

export default ThemeCustomizer;
