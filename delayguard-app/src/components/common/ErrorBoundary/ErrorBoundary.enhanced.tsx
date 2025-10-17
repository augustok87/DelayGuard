import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logErrorWithError, logUserAction } from '../../../utils/logger';
import { ErrorBoundaryState } from '../../../types/ui';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  showRetryButton?: boolean;
  showReloadButton?: boolean;
  showErrorDetails?: boolean;
  enableErrorReporting?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
  lastErrorTime?: number;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableErrorReporting = true } = this.props;
    const { retryCount } = this.state;

    // Log the error with comprehensive context
    logErrorWithError(error, {
      component: 'EnhancedErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        errorInfo,
        retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Send to error reporting service if enabled
    if (enableErrorReporting) {
      this.reportError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, this would send to Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    };

    // Placeholder for external error reporting
    console.error('Error Report:', errorReport);
  };

  private handleRetry = () => {
    const { maxRetries = 3, retryDelay = 1000, onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      logUserAction('Max retries exceeded', {
        component: 'EnhancedErrorBoundary',
        action: 'retry_exceeded',
        metadata: { retryCount, maxRetries },
      });
      return;
    }

    this.setState({ isRetrying: true });

    // Log retry attempt
    logUserAction('Error boundary retry initiated', {
      component: 'EnhancedErrorBoundary',
      action: 'retry',
      metadata: { retryCount: retryCount + 1, maxRetries },
    });

    // Call custom retry handler if provided
    if (onRetry) {
      onRetry();
    }

    // Delay retry to avoid immediate re-failure
    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, retryDelay);
  };

  private handleReload = () => {
    logUserAction('Page reload initiated from error boundary', {
      component: 'EnhancedErrorBoundary',
      action: 'reload',
      metadata: { retryCount: this.state.retryCount },
    });
    window.location.reload();
  };

  private generateErrorReport = () => {
    const { error, errorInfo, retryCount } = this.state;
    const errorReport = {
      error: {
        message: error?.message,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      context: {
        retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
      },
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        logUserAction('Error report copied to clipboard', {
          component: 'EnhancedErrorBoundary',
          action: 'copy_error_report',
        });
        alert('Error report copied to clipboard');
      })
      .catch(() => {
        // Fallback: show in alert
        alert(JSON.stringify(errorReport, null, 2));
      });
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { 
      children, 
      fallback, 
      showRetryButton = true, 
      showReloadButton = true,
      showErrorDetails = false,
      maxRetries = 3,
    } = this.props;
    const { hasError, error, retryCount, isRetrying } = this.state;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const canRetry = retryCount < maxRetries;
      const isRetryExceeded = retryCount >= maxRetries;

      return (
        <div className={styles.errorFallback}>
          <div className={styles.errorIcon}>
            {isRetryExceeded ? '🚫' : '⚠️'}
          </div>
          
          <h2 className={styles.errorTitle}>
            {isRetryExceeded ? 'Maximum Retries Exceeded' : 'Something went wrong'}
          </h2>
          
          <p className={styles.errorMessage}>
            {error?.message || 'An unexpected error occurred'}
          </p>

          {showErrorDetails && error && (
            <details className={styles.errorDetails}>
              <summary>Error Details</summary>
              <pre className={styles.errorStack}>
                {error.stack}
              </pre>
            </details>
          )}

          {retryCount > 0 && (
            <p className={styles.retryInfo}>
              Retry attempt {retryCount} of {maxRetries}
            </p>
          )}

          <div className={styles.errorActions}>
            {canRetry && showRetryButton && (
              <button 
                className={styles.retryButton}
                onClick={this.handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}
            
            {showReloadButton && (
              <button 
                className={styles.reloadButton}
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            )}

            <button 
              className={styles.reportButton}
              onClick={this.generateErrorReport}
            >
              Copy Error Report
            </button>
          </div>

          {isRetryExceeded && (
            <div className={styles.maxRetriesMessage}>
              <p>We've tried to recover from this error multiple times but it keeps occurring.</p>
              <p>Please try reloading the page or contact support if the problem persists.</p>
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}