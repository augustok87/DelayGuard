import React from 'react';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  testId?: string;
}

/**
 * ErrorState Component
 * 
 * A reusable component for displaying error states across the application.
 * Provides consistent styling and behavior for when errors occur.
 * 
 * @param title - Error title (defaults to "Something went wrong")
 * @param message - Error message to display
 * @param onRetry - Optional retry function
 * @param testId - Test ID for testing purposes
 */
export function ErrorState({ 
  title = "Something went wrong",
  message = "Failed to load data",
  onRetry,
  testId = 'error-state'
}: ErrorStateProps) {
  return (
    <div 
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        minHeight: '200px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Text variant="headingMd" as="h3" style={{ color: '#dc2626' }}>
          {title}
        </Text>
      </div>
      
      <Text variant="bodyMd" as="p" style={{ marginBottom: '24px', color: '#6b7280' }}>
        {message}
      </Text>
      
      {onRetry && (
        <Button onClick={onRetry} data-testid={`${testId}-retry`}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
