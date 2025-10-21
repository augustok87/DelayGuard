import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../store/store";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { ToastProvider } from "./common/ToastProvider";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ShopifyProvider } from "./ShopifyProvider";

interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * Root application provider that wraps the app with:
 * 1. Redux store and persistence
 * 2. Shopify App Bridge for authentication
 * 3. Error boundary for graceful error handling
 * 4. Toast notifications
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate
        loading={<LoadingSpinner message="Loading app..." />}
        persistor={persistor}
      >
        <ShopifyProvider>
          <ErrorBoundary>
            <ToastProvider>{children}</ToastProvider>
          </ErrorBoundary>
        </ShopifyProvider>
      </PersistGate>
    </Provider>
  );
};
