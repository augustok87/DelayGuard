import React, { ReactNode, createContext, useContext, useMemo } from "react";
import type { CdnAppBridge } from "../types/app-bridge";

/**
 * Shopify App Bridge provider.
 *
 * The bridge is the one the CDN script installs — `index.html` loads
 * https://cdn.shopify.com/shopifycloud/app-bridge.js as the first script in
 * <head>, and it auto-initialises from the `shopify-api-key` meta tag above
 * it. There is nothing to construct here.
 *
 * This deliberately does NOT use the npm `@shopify/app-bridge` package
 * (LAUNCH_PLAN §6 R29). Calling its `createApp()` booted the previous
 * generation of App Bridge on top of the CDN one, which failed Shopify's
 * "Using the latest App Bridge script loaded from Shopify's CDN" review check
 * and blocked submission. `app-bridge-cdn-only.test.ts` pins that.
 *
 * @see https://shopify.dev/docs/api/app-bridge-library
 */

interface ShopifyProviderProps {
  children: ReactNode;
}

export type { CdnAppBridge };

/**
 * Read the global, or null when the CDN script has not installed it — which
 * is the normal case outside the Shopify admin iframe.
 */
export function readAppBridgeGlobal(): CdnAppBridge | null {
  const candidate = (globalThis as { shopify?: Partial<CdnAppBridge> }).shopify;
  return candidate && typeof candidate.idToken === "function"
    ? (candidate as CdnAppBridge)
    : null;
}

const AppBridgeContext = createContext<CdnAppBridge | null>(null);

/**
 * The App Bridge global, or null when the app is not framed by Shopify.
 * `api-client` re-reads the live global on every request, so a null here
 * never permanently disables authentication.
 */
export const useAppBridge = (): CdnAppBridge | null =>
  useContext(AppBridgeContext);

export const ShopifyProvider: React.FC<ShopifyProviderProps> = ({
  children,
}) => {
  const appBridge = useMemo(() => {
    const bridge = readAppBridgeGlobal();

    if (bridge) {
      console.log("✅ App Bridge (CDN) available");
    } else {
      // Loud on purpose: without the global every /api/* call goes out
      // unauthenticated and the dashboard renders "Missing Authorization
      // header" rather than data.
      console.warn(
        "⚠️ App Bridge global not present — app-bridge.js has not initialised. Expected outside the Shopify admin.",
      );
    }

    return bridge;
  }, []);

  return (
    <AppBridgeContext.Provider value={appBridge}>
      {children}
    </AppBridgeContext.Provider>
  );
};

export default ShopifyProvider;
