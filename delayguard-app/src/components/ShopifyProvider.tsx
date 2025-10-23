import React, { ReactNode, createContext, useContext, useMemo } from "react";
import { createApp } from "@shopify/app-bridge";

/**
 * Shopify App Bridge Provider
 *
 * This component initializes the Shopify App Bridge for embedded apps.
 * It must wrap your entire app to enable Shopify-specific features like:
 * - Session token authentication
 * - Toast notifications
 * - Navigation
 * - Modal/Fullscreen APIs
 *
 * @see https://shopify.dev/docs/api/app-bridge-library
 */

interface ShopifyProviderProps {
  children: ReactNode;
}

/**
 * Get the API key from environment variables
 * In production, this is set via Vercel/deployment config
 * In development, load from .env file
 */
const getApiKey = (): string => {
  const apiKey =
    process.env.REACT_APP_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY;

  if (!apiKey) {
    console.warn("SHOPIFY_API_KEY not found in environment variables");
    return "development-api-key"; // Fallback for local development
  }

  return apiKey;
};

/**
 * Get the shop from URL parameters
 * Shopify passes the shop domain as a query parameter when loading the app
 */
const getShopFromUrl = (): string | undefined => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("shop") || undefined;
};

/**
 * Get the host from URL parameters
 * Shopify passes the host as a query parameter for OAuth and API requests
 */
const getHostFromUrl = (): string | undefined => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("host") || undefined;
};

// Create context for App Bridge instance
const AppBridgeContext = createContext<any>(null);

/**
 * Hook to access the App Bridge instance
 * This is used by useApiClient and other components that need session tokens
 */
export const useAppBridge = () => {
  const app = useContext(AppBridgeContext);
  if (!app) {
    console.warn("useAppBridge called outside of ShopifyProvider");
  }
  return app;
};

export const ShopifyProvider: React.FC<ShopifyProviderProps> = ({
  children,
}) => {
  const config = useMemo(() => {
    const apiKey = getApiKey();
    const shop = getShopFromUrl();
    const host = getHostFromUrl();

    // Check if we're in an embedded context
    if (shop && host) {
      console.log("✅ Running in Shopify embedded context");
      return {
        apiKey,
        host,
        forceRedirect: false,
      };
    }

    // Development mode fallback
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Development mode: Running without Shopify parameters");
      console.log("ℹ️  App will render but API calls will be mocked/bypassed");
      console.log(
        "ℹ️  To test with real Shopify: deploy and open from Shopify Admin",
      );

      // Return a minimal config that won't crash App Bridge
      return {
        apiKey,
        host: btoa("development.myshopify.com/admin"),
        forceRedirect: false,
      };
    }

    // Production without parameters - should redirect to OAuth
    console.warn("⚠️  No shop or host parameters found");
    return null;
  }, []);

  // Create App Bridge instance
  const app = useMemo(() => {
    // Don't create App Bridge if no config
    if (!config) {
      console.log("Skipping App Bridge initialization - no config");
      return null;
    }

    try {
      const appInstance = createApp(config);
      console.log("✅ App Bridge initialized successfully");
      return appInstance;
    } catch (error) {
      console.error("❌ Failed to create App Bridge instance:", error);
      // In development, return null so app can still render
      if (process.env.NODE_ENV === "development") {
        console.log("ℹ️  Continuing without App Bridge in development mode");
        return null;
      }
      throw error;
    }
  }, [config]);

  return (
    <AppBridgeContext.Provider value={app}>
      {children}
    </AppBridgeContext.Provider>
  );
};

export default ShopifyProvider;
