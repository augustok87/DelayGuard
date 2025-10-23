import { useEffect } from "react";
import { useAppBridge } from "../components/ShopifyProvider";
import { apiClient } from "../utils/api-client";
import { logger } from "../utils/logger";

/**
 * Hook to initialize and return the authenticated API client
 *
 * This hook:
 * 1. Gets the App Bridge instance from context
 * 2. Passes it to the API client for session token retrieval
 * 3. Returns the configured client for making authenticated requests
 *
 * Usage:
 * ```tsx
 * const api = useApiClient();
 * const alerts = await api.getAlerts();
 * ```
 *
 * @returns Configured API client with authentication
 */
export const useApiClient = () => {
  const app = useAppBridge();

  useEffect(() => {
    if (app) {
      // Configure the API client with the App Bridge instance
      apiClient.setApp(app);
      logger.debug("API client initialized with App Bridge");
    } else {
      logger.warn(
        "App Bridge not available - API client may not work correctly",
      );
    }
  }, [app]);

  return apiClient;
};

export default useApiClient;
