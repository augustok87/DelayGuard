/**
 * Error Boundary for Web Components
 * 
 * Provides error handling for Web Component integration issues
 * and graceful fallbacks when Web Components fail to load.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Web Component Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div 
          style={{ 
            padding: '16px', 
            border: '1px solid #e1e5e9', 
            borderRadius: '4px',
            backgroundColor: '#f6f6f7',
            color: '#637381'
          }}
          data-testid="error-boundary-fallback"
        >
          <h3>Something went wrong</h3>
          <p>There was an error loading this component. Please refresh the page.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '8px' }}>
              <summary>Error details</summary>
              <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
