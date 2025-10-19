import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../../../utils/logger';
import { ErrorBoundaryState } from '../../../types/ui';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('Error caught by ErrorBoundary', error, { 
      component: 'ErrorBoundary', 
      action: 'componentDidCatch',
      metadata: { errorInfo }, 
    });
    // In a real app, you would send this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorFallback}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className={styles.errorActions}>
            <button 
              className={styles.retryButton}
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button 
              className={styles.reloadButton}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
