import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError, logInfo } from '../../../utils/logger';
import { Button } from '../../ui/Button';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  showRetry?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service
    this.logError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, this would send to an error tracking service
    logError('Error caught by EnhancedErrorBoundary', error, { 
      component: 'ErrorBoundary.enhanced', 
      action: 'logError',
      metadata: { errorInfo }, 
    });
    
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, {
    //   extra: errorInfo,
    //   tags: { component: 'ErrorBoundary' }
    // });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Call custom retry handler
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    } else {
      // Max retries reached, show permanent error
      this.setState({
        hasError: true,
        error: new Error('Maximum retry attempts reached. Please refresh the page.'),
        errorInfo: null,
      });
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    
    if (error) {
      // In a real app, this would open a bug report form or send to support
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      logInfo('Error report generated', { 
        component: 'ErrorBoundary.enhanced', 
        action: 'generateErrorReport',
        metadata: { errorReport }, 
      });
      
      // Example: Open bug report form
      // window.open(`/bug-report?error=${encodeURIComponent(JSON.stringify(errorReport))}`);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const { fallback, showRetry = true, showDetails = false } = this.props;
      const maxRetries = 3;

      if (fallback) {
        return fallback;
      }

      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>
              {retryCount >= maxRetries ? 'Something went wrong' : 'Oops! Something went wrong'}
            </h2>
            <p className={styles.errorMessage}>
              {retryCount >= maxRetries 
                ? 'We\'ve tried to fix this issue but it keeps happening. Please refresh the page or contact support.'
                : 'We encountered an unexpected error. Don\'t worry, your data is safe.'
              }
            </p>
            
            {showDetails && error && (
              <details className={styles.errorDetails}>
                <summary>Error Details</summary>
                <pre className={styles.errorStack}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className={styles.errorActions}>
              {showRetry && retryCount < maxRetries && (
                <Button
                  variant="primary"
                  onClick={this.handleRetry}
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </Button>
              )}
              
              <Button
                variant="secondary"
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
              
              <Button
                variant="secondary"
                onClick={this.handleReportError}
              >
                Report Issue
              </Button>
            </div>

            {retryCount > 0 && (
              <p className={styles.retryInfo}>
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
