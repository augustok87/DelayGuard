import { useCallback } from "react";
import { useSettings } from "./useSettings";
import { useToasts } from "./useToasts";
import { useAppDispatch } from "../store/hooks";
import { testDelayDetection as testDelayDetectionThunk } from "../store/slices/settingsSlice";
import { connectShopify as connectShopifyThunk } from "../store/slices/appSlice";
import { AppSettings } from "../types";

export const useSettingsActions = () => {
  const dispatch = useAppDispatch();
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
    // showSaveErrorToast, // Not used in this hook
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

        // A createAsyncThunk that calls rejectWithValue RESOLVES with a
        // rejected action — it does not throw — so `catch` never sees a
        // server refusal. Inspect the action (LAUNCH_PLAN §6 R13); this
        // matches what testDelayDetection below already does.
        const action = (await updateSettings(settings)) as {
          type?: string;
          payload?: unknown;
        } | undefined;

        if (action?.type?.endsWith("/rejected")) {
          const reason =
            typeof action.payload === "string" && action.payload.trim() !== ""
              ? action.payload
              : "Failed to save settings";
          showErrorToast(reason);
          return { success: false, error: reason };
        }

        showSaveSuccessToast();
        return { success: true };
      } catch (error) {
        showErrorToast("An unexpected error occurred while saving settings");
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [updateSettings, validateSettings, showErrorToast, showSaveSuccessToast],
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

  // Phase 2.1.f: the dashboard "test" button POSTs to /api/test-alert via
  // the settingsSlice thunk — a real dry-run dispatch to the merchant's
  // configured contact (no more simulated setTimeout/Math.random result).
  const testDelayDetection = useCallback(async() => {
    try {
      showInfoToast("Sending test alert...");

      const result = await dispatch(testDelayDetectionThunk());

      if (testDelayDetectionThunk.fulfilled.match(result)) {
        showTestSuccessToast();
        return { success: true };
      }
      showTestErrorToast();
      return {
        success: false,
        error:
          typeof result.payload === "string"
            ? result.payload
            : "Failed to send test alert",
      };
    } catch (error) {
      showErrorToast("An unexpected error occurred during testing");
      return { success: false, error: "An unexpected error occurred" };
    }
  }, [
    dispatch,
    showInfoToast,
    showTestSuccessToast,
    showTestErrorToast,
    showErrorToast,
  ]);

  // G2: verifies the live embedded session by re-fetching the shop from
  // the backend (the OAuth install already happened for an embedded app).
  const connectToShopify = useCallback(async() => {
    try {
      showInfoToast("Connecting to Shopify...");

      const result = await dispatch(connectShopifyThunk());

      if (connectShopifyThunk.fulfilled.match(result)) {
        showConnectionSuccessToast();
        return { success: true };
      }
      showConnectionErrorToast();
      return {
        success: false,
        error:
          typeof result.payload === "string"
            ? result.payload
            : "Failed to connect to Shopify",
      };
    } catch (error) {
      showErrorToast("An unexpected error occurred during connection");
      return { success: false, error: "An unexpected error occurred" };
    }
  }, [
    dispatch,
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
