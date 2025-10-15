import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './components/AppProvider';
import { App } from './components/App';

/**
 * Main entry point for DelayGuard
 * 
 * This version uses pure React components with TypeScript for
 * world-class engineering standards.
 */

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AppProvider>
      <App />
    </AppProvider>,
  );
} else {
  console.error('Root element not found');
}
