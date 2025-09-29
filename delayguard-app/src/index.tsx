import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import { App } from './components/App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AppProvider i18n={{}}>
      <App />
    </AppProvider>
  );
} else {
  console.error('Root element not found');
}
