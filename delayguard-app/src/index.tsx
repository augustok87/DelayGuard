import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './components/AppProvider';
import { App } from './components/App';
import { logError } from './utils/logger';

// Import Design System
import './styles/design-system.css';

/**
 * Main entry point for DelayGuard
 * 
 * World-class Shopify app with modern design system
 * and professional micro-interactions.
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
  logError('Root element not found', undefined, { component: 'index' });
}
