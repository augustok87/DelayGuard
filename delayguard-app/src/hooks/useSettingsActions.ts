import { useCallback } from "react";
import { useSettings } from "./useSettings";
import { useToasts } from "./useToasts";
import { AppSettings } from "../types";

export const useSettingsActions = () => {
  const {
    updateSettings,
    resetSettings,
    validateSettings,
    applyPreset,
    exportSettings,
    importSettings,
  } = useSettings();

  const {
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    showSaveSuccessToast,
    showSaveErrorToast,
    showConnectionSuccessToast,
    showConnectionErrorToast,
    showTestSuccessToast,
    showTestErrorToast,
  } = useToasts();

  const saveSettings = useCallback(
    async(settings: AppSettings) => {
      try {
        const validation = validateSettings(settings);

        if (!validation.isValid) {
          showErrorToast(`Validation failed: ${validation.errors.join(", ")}`);
          return { success: false, error: validation.errors.join(", ") };
        }

        await updateSettings(settings);
        showSaveSuccessToast();
        return { success: true };
      } catch (error) {
        showErrorToast("An unexpected error occurred while saving settings");
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [
      updateSettings,
      validateSettings,
      showErrorToast,
      showSaveSuccessToast,
      showSaveErrorToast,
    ],
  );

  const resetToDefaults = useCallback(async() => {
    try {
      await resetSettings();
      showSuccessToast("Settings reset to defaults successfully!");
      return { success: true };
    } catch (error) {
      showErrorToast("An unexpected error occurred while resetting settings");
      return { success: false, error: "An unexpected error occurred" };
    }
  }, [resetSettings, showSuccessToast, showErrorToast]);

  const applySettingsPreset = useCallback(
    async(preset: "conservative" | "balanced" | "aggressive") => {
      try {
        await applyPreset(preset);
        showSuccessToast(
          `${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied successfully!`,
        );
        return { success: true };
      } catch (error) {
        showErrorToast("An unexpected error occurred while applying preset");
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [applyPreset, showSuccessToast, showErrorToast],
  );

  const testDelayDetection = useCallback(async() => {
    try {
      showInfoToast("Testing delay detection system...");

      // Simulate delay detection test
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate random success/failure for demo
      const isSuccess = Math.random() > 0.3; // 70% success rate

      if (isSuccess) {
        showTestSuccessToast();
        return { success: true };
      } else {
        showTestErrorToast();
        return { success: false, error: "Delay detection test failed" };
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred during testing");
      return { success: false, error: "An unexpected error occurred" };
    }
  }, [showInfoToast, showTestSuccessToast, showTestErrorToast, showErrorToast]);

  const connectToShopify = useCallback(async() => {
    try {
      showInfoToast("Connecting to Shopify...");

      // Simulate Shopify connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate random success/failure for demo
      const isSuccess = Math.random() > 0.2; // 80% success rate

      if (isSuccess) {
        showConnectionSuccessToast();
        return { success: true };
      } else {
        showConnectionErrorToast();
        return { success: false, error: "Failed to connect to Shopify" };
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred during connection");
      return { success: false, error: "An unexpected error occurred" };
    }
  }, [
    showInfoToast,
    showConnectionSuccessToast,
    showConnectionErrorToast,
    showErrorToast,
  ]);

  const exportSettingsToFile = useCallback(() => {
    try {
      exportSettings();
      showSuccessToast("Settings exported successfully!");
      return { success: true };
    } catch (error) {
      showErrorToast("Failed to export settings");
      return { success: false, error: "Failed to export settings" };
    }
  }, [exportSettings, showSuccessToast, showErrorToast]);

  const importSettingsFromFile = useCallback(
    async(file: File) => {
      try {
        const result = await importSettings(file);
        showSuccessToast("Settings imported successfully!");
        return result;
      } catch (error) {
        showErrorToast("An unexpected error occurred while importing settings");
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [importSettings, showSuccessToast, showErrorToast],
  );

  const validateCurrentSettings = useCallback(
    (settings: AppSettings) => {
      const validation = validateSettings(settings);

      if (!validation.isValid) {
        showWarningToast(
          `Settings validation failed: ${validation.errors.join(", ")}`,
        );
      }

      return validation;
    },
    [validateSettings, showWarningToast],
  );

  return {
    saveSettings,
    resetToDefaults,
    applySettingsPreset,
    testDelayDetection,
    connectToShopify,
    exportSettingsToFile,
    importSettingsFromFile,
    validateCurrentSettings,
  };
};
