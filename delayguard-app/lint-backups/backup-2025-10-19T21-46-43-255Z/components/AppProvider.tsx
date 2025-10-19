import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store';
import { ErrorBoundary } from './common/ErrorBoundary';
import { ToastProvider } from './common/ToastProvider';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner message="Loading app..." />} persistor={persistor}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </PersistGate>
    </Provider>
  );
};
