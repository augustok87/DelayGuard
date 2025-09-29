import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider as PolarisProvider } from '@shopify/polaris';
import { AppProvider } from './components/AppProvider';
import { App } from './components/App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <PolarisProvider i18n={{}}>
      <AppProvider>
        <App />
      </AppProvider>
    </PolarisProvider>
  );
} else {
  console.error('Root element not found');
}
