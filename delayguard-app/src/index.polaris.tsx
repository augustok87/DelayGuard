import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './components/AppProvider';
import { App } from './components/App';

/**
 * Main entry point for DelayGuard
 * 
 * This version uses our custom Web Components instead of @shopify/polaris
 * for better performance and reduced bundle size.
 */

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AppProvider>
      <App />
    </AppProvider>
  );
} else {
  console.error('Root element not found');
}
