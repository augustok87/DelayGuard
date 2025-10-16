import React from 'react';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  testId?: string;
}

/**
 * EmptyState Component
 * 
 * A reusable component for displaying empty states across the application.
 * Provides consistent styling and behavior for when there's no data to display.
 * 
 * @param title - Main title for the empty state
 * @param description - Optional description text
 * @param action - Optional action button
 * @param icon - Optional icon to display
 * @param testId - Test ID for testing purposes
 */
export function EmptyState({ 
  title, 
  description, 
  action, 
  icon, 
  testId = 'empty-state' 
}: EmptyStateProps) {
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
      {icon && (
        <div style={{ marginBottom: '16px' }}>
          {icon}
        </div>
      )}
      
      <Text variant="headingMd" as="h3" style={{ marginBottom: '8px' }}>
        {title}
      </Text>
      
      {description && (
        <Text variant="bodyMd" as="p" style={{ marginBottom: '24px', color: '#6b7280' }}>
          {description}
        </Text>
      )}
      
      {action && (
        <Button onClick={action.onClick} data-testid={`${testId}-action`}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
