# Polaris Web Components Migration Implementation Guide
## DelayGuard Shopify App

### Quick Start Guide

This guide provides step-by-step instructions for implementing the migration from Polaris React to Polaris Web Components, following the comprehensive migration plan.

---

## 1. Pre-Migration Setup

### 1.1 Environment Preparation

```bash
# Create migration branch
git checkout -b feature/polaris-web-migration

# Backup current state
git tag pre-migration-backup

# Install new dependencies
npm install @shopify/polaris-web@^1.0.0 @shopify/polaris-web-react@^1.0.0
npm install --save-dev @shopify/polaris-web-testing@^1.0.0 @web/test-runner@^0.18.0
```

### 1.2 Update Package.json

```json
{
  "dependencies": {
    "@shopify/polaris-web": "^1.0.0",
    "@shopify/polaris-web-react": "^1.0.0"
  },
  "devDependencies": {
    "@shopify/polaris-web-testing": "^1.0.0",
    "@web/test-runner": "^0.18.0",
    "@web/test-runner-playwright": "^0.9.0"
  }
}
```

### 1.3 Update TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "experimentalDecorators": true,
    "useDefineForClassFields": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

---

## 2. Phase 1: Foundation Setup (Week 1-2)

### 2.1 Web Components Integration

#### Step 1: Update HTML Template

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DelayGuard</title>
  
  <!-- Polaris Web Components -->
  <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
  <link rel="stylesheet" href="https://cdn.shopify.com/shopifycloud/polaris.css">
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

#### Step 2: Create Web Component Wrapper Utilities

```typescript
// src/utils/webComponentUtils.ts
import { useRef, useEffect, useCallback } from 'react';

export interface WebComponentEventMap {
  [eventName: string]: (event: CustomEvent) => void;
}

export function useWebComponent<T extends HTMLElement>(
  eventMap: WebComponentEventMap
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const cleanup: (() => void)[] = [];

    Object.entries(eventMap).forEach(([eventName, handler]) => {
      const wrappedHandler = (event: Event) => handler(event as CustomEvent);
      element.addEventListener(eventName, wrappedHandler);
      cleanup.push(() => element.removeEventListener(eventName, wrappedHandler));
    });

    return () => cleanup.forEach(cleanup => cleanup());
  }, [eventMap]);

  return ref;
}

export function createWebComponentProps(
  props: Record<string, any>
): Record<string, string> {
  const webComponentProps: Record<string, string> = {};
  
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      webComponentProps[key] = String(value);
    }
  });
  
  return webComponentProps;
}
```

#### Step 3: Update Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  // ... existing config
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        polaris: {
          test: /[\\/]node_modules[\\/]@shopify[\\/]polaris-web/,
          name: 'polaris-web',
          chunks: 'all',
        },
      },
    },
  }
};
```

### 2.2 Basic Component Migration

#### Step 1: Migrate Button Component

```typescript
// src/components/Button.tsx
import React, { forwardRef } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLButtonElement>({
      'polaris-click': useCallback((event: CustomEvent) => {
        if (onClick && !props.disabled && !props.loading) {
          onClick();
        }
      }, [onClick, props.disabled, props.loading])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-button
        ref={webComponentRef}
        {...webComponentProps}
      >
        {children}
      </s-button>
    );
  }
);

Button.displayName = 'Button';
```

#### Step 2: Write Tests for Button Component

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Web Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should handle click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent(button, new CustomEvent('polaris-click'));
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent(button, new CustomEvent('polaris-click'));
    
    await waitFor(() => {
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
```

#### Step 3: Migrate Text Component

```typescript
// src/components/Text.tsx
import React from 'react';
import { createWebComponentProps } from '@/utils/webComponentUtils';

export interface TextProps {
  children: React.ReactNode;
  variant?: 'headingLg' | 'headingMd' | 'headingSm' | 'bodyLg' | 'bodyMd' | 'bodySm';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  tone?: 'base' | 'subdued' | 'critical' | 'warning' | 'success' | 'info';
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  className?: string;
}

export const Text: React.FC<TextProps> = ({ 
  children, 
  as = 'p', 
  ...props 
}) => {
  const webComponentProps = createWebComponentProps(props);
  const Component = as as keyof JSX.IntrinsicElements;

  return (
    <s-text as={as} {...webComponentProps}>
      {children}
    </s-text>
  );
};
```

### 2.3 Update Main Application

#### Step 1: Remove PolarisProvider

```typescript
// src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './components/AppProvider';
import { App } from './components/App';

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
```

#### Step 2: Update MinimalApp Component

```typescript
// src/components/MinimalApp.tsx
import React, { useState, useEffect } from 'react';
import { Page } from './Page';
import { Card } from './Card';
import { DataTable } from './DataTable';
import { Button } from './Button';
import { Badge } from './Badge';
import { TextField } from './TextField';
import { Select } from './Select';
import { Tabs } from './Tabs';
import { Layout } from './Layout';
import { Banner } from './Banner';
import { Spinner } from './Spinner';
import { Text } from './Text';
import { BlockStack } from './BlockStack';
import { InlineStack } from './InlineStack';
import styles from '../styles/DelayGuard.module.css';

// ... rest of component implementation
```

---

## 3. Phase 2: Core Components Migration (Week 3-4)

### 3.1 Form Components Migration

#### Step 1: Migrate TextField Component

```typescript
// src/components/TextField.tsx
import React, { forwardRef, useCallback } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface TextFieldProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  multiline?: boolean;
  rows?: number;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  autoComplete?: string;
  className?: string;
  'data-testid'?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, value, onChange, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLInputElement>({
      'polaris-change': useCallback((event: CustomEvent) => {
        if (onChange) {
          onChange(event.detail.value);
        }
      }, [onChange])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-text-field
        ref={webComponentRef}
        label={label}
        value={value}
        {...webComponentProps}
      />
    );
  }
);

TextField.displayName = 'TextField';
```

#### Step 2: Migrate Select Component

```typescript
// src/components/Select.tsx
import React, { forwardRef, useCallback } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  'data-testid'?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, value, onChange, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLSelectElement>({
      'polaris-change': useCallback((event: CustomEvent) => {
        if (onChange) {
          onChange(event.detail.value);
        }
      }, [onChange])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-select
        ref={webComponentRef}
        label={label}
        value={value}
        {...webComponentProps}
      >
        {options.map(option => (
          <s-option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </s-option>
        ))}
      </s-select>
    );
  }
);

Select.displayName = 'Select';
```

### 3.2 Layout Components Migration

#### Step 1: Migrate Card Component

```typescript
// src/components/Card.tsx
import React from 'react';
import { createWebComponentProps } from '@/utils/webComponentUtils';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  sectioned?: boolean;
  subdued?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  title,
  sectioned = true,
  ...props 
}) => {
  const webComponentProps = createWebComponentProps(props);

  return (
    <s-section {...webComponentProps}>
      {title && <s-text variant="headingMd" as="h3">{title}</s-text>}
      {sectioned ? (
        <div style={{ padding: '16px' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </s-section>
  );
};
```

#### Step 2: Migrate Layout Component

```typescript
// src/components/Layout.tsx
import React from 'react';
import { createWebComponentProps } from '@/utils/webComponentUtils';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export interface LayoutSectionProps {
  children: React.ReactNode;
  variant?: 'oneHalf' | 'oneThird' | 'twoThirds' | 'fullWidth';
  className?: string;
  'data-testid'?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, ...props }) => {
  const webComponentProps = createWebComponentProps(props);

  return (
    <s-layout {...webComponentProps}>
      {children}
    </s-layout>
  );
};

export const LayoutSection: React.FC<LayoutSectionProps> = ({ 
  children, 
  variant = 'fullWidth',
  ...props 
}) => {
  const webComponentProps = createWebComponentProps({ ...props, variant });

  return (
    <s-layout-section {...webComponentProps}>
      {children}
    </s-layout-section>
  );
};
```

---

## 4. Phase 3: Complex Components Migration (Week 5-6)

### 4.1 Data Components Migration

#### Step 1: Migrate DataTable Component

```typescript
// src/components/DataTable.tsx
import React, { forwardRef, useCallback, useEffect } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface DataTableColumn {
  key: string;
  title: string;
  type: 'text' | 'numeric' | 'date' | 'boolean';
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: (string | number | boolean)[][];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortable?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const DataTable = forwardRef<HTMLTableElement, DataTableProps>(
  ({ columns, rows, onSort, sortable = true, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLTableElement>({
      'polaris-sort': useCallback((event: CustomEvent) => {
        if (onSort && sortable) {
          onSort(event.detail.column, event.detail.direction);
        }
      }, [onSort, sortable])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-data-table
        ref={webComponentRef}
        columns={JSON.stringify(columns)}
        rows={JSON.stringify(rows)}
        sortable={sortable}
        {...webComponentProps}
      />
    );
  }
);

DataTable.displayName = 'DataTable';
```

#### Step 2: Migrate ResourceList Component

```typescript
// src/components/ResourceList.tsx
import React, { forwardRef, useCallback } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface ResourceItem {
  id: string;
  [key: string]: any;
}

export interface ResourceListProps {
  items: ResourceItem[];
  renderItem: (item: ResourceItem) => React.ReactNode;
  onItemClick?: (item: ResourceItem) => void;
  onSelectionChange?: (selectedItems: string[]) => void;
  selectable?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const ResourceList = forwardRef<HTMLDivElement, ResourceListProps>(
  ({ items, renderItem, onItemClick, onSelectionChange, selectable = false, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLDivElement>({
      'polaris-item-click': useCallback((event: CustomEvent) => {
        if (onItemClick) {
          const item = items.find(i => i.id === event.detail.id);
          if (item) {
            onItemClick(item);
          }
        }
      }, [onItemClick, items]),
      'polaris-selection-change': useCallback((event: CustomEvent) => {
        if (onSelectionChange) {
          onSelectionChange(event.detail.selectedIds);
        }
      }, [onSelectionChange])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-resource-list
        ref={webComponentRef}
        items={JSON.stringify(items)}
        selectable={selectable}
        {...webComponentProps}
      >
        {items.map(item => (
          <s-resource-item
            key={item.id}
            id={item.id}
            onClick={() => onItemClick?.(item)}
          >
            {renderItem(item)}
          </s-resource-item>
        ))}
      </s-resource-list>
    );
  }
);

ResourceList.displayName = 'ResourceList';
```

### 4.2 Navigation Components Migration

#### Step 1: Migrate Tabs Component

```typescript
// src/components/Tabs.tsx
import React, { forwardRef, useCallback } from 'react';
import { useWebComponent } from '@/utils/webComponentUtils';

export interface Tab {
  id: string;
  content: string;
  panelId?: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  selected?: number;
  onSelect?: (selectedTabIndex: number) => void;
  className?: string;
  'data-testid'?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, selected = 0, onSelect, ...props }, ref) => {
    const webComponentRef = useWebComponent<HTMLDivElement>({
      'polaris-tab-change': useCallback((event: CustomEvent) => {
        if (onSelect) {
          onSelect(event.detail.selectedIndex);
        }
      }, [onSelect])
    });

    const webComponentProps = createWebComponentProps(props);

    return (
      <s-tabs
        ref={webComponentRef}
        tabs={JSON.stringify(tabs)}
        selected={selected}
        {...webComponentProps}
      />
    );
  }
);

Tabs.displayName = 'Tabs';
```

---

## 5. Phase 4: Integration & Testing (Week 7-8)

### 5.1 Complete Application Integration

#### Step 1: Update EnhancedDashboard

```typescript
// src/components/EnhancedDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Page } from './Page';
import { Card } from './Card';
import { DataTable } from './DataTable';
import { Button } from './Button';
import { Badge } from './Badge';
import { Select } from './Select';
import { Tabs } from './Tabs';
import { Layout, LayoutSection } from './Layout';
import { Banner } from './Banner';
import { Spinner } from './Spinner';
import { Modal } from './Modal';
import { FormLayout } from './FormLayout';
import { Checkbox } from './Checkbox';
import { RangeSlider } from './RangeSlider';
import { ResourceList } from './ResourceList';
import { ResourceItem } from './ResourceItem';
import { Avatar } from './Avatar';
import { Text } from './Text';
import { ButtonGroup } from './ButtonGroup';
import { Popover } from './Popover';
import { ActionList } from './ActionList';
import { Icon } from './Icon';
import { EmptyState } from './EmptyState';
import { SkeletonBodyText } from './SkeletonBodyText';
import { SkeletonDisplayText } from './SkeletonDisplayText';
import { Toast } from './Toast';
import { Frame } from './Frame';
import AnalyticsDashboard from './AnalyticsDashboard';

// ... rest of component implementation
```

#### Step 2: Update ThemeCustomizer

```typescript
// src/components/ThemeCustomizer.tsx
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { FormLayout } from './FormLayout';
import { Select } from './Select';
import { TextField } from './TextField';
import { ColorPicker } from './ColorPicker';
import { RangeSlider } from './RangeSlider';
import { Checkbox } from './Checkbox';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { Text } from './Text';
import { Divider } from './Divider';
import { Banner } from './Banner';
import { Modal } from './Modal';

// ... rest of component implementation
```

### 5.2 Comprehensive Testing Implementation

#### Step 1: Set up Test Environment

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import '@shopify/polaris-web-testing';

// Mock Web Components
beforeAll(() => {
  // Register custom elements for testing
  customElements.define('s-button', class extends HTMLElement {});
  customElements.define('s-text', class extends HTMLElement {});
  customElements.define('s-card', class extends HTMLElement {});
  // ... other components
});
```

#### Step 2: Create Integration Tests

```typescript
// tests/integration/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { Dashboard } from '@/components/Dashboard';

describe('Dashboard Integration', () => {
  it('should render all dashboard components', async () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
```

### 5.3 Performance Optimization

#### Step 1: Implement Lazy Loading

```typescript
// src/components/LazyComponents.tsx
import { lazy, Suspense } from 'react';
import { Spinner } from './Spinner';

const DataTable = lazy(() => import('./DataTable'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

export function LazyDataTable(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <DataTable {...props} />
    </Suspense>
  );
}

export function LazyAnalyticsDashboard(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <AnalyticsDashboard {...props} />
    </Suspense>
  );
}
```

#### Step 2: Bundle Optimization

```javascript
// webpack.optimized.config.js
const path = require('path');

module.exports = {
  // ... existing config
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        polaris: {
          test: /[\\/]node_modules[\\/]@shopify[\\/]polaris-web/,
          name: 'polaris-web',
          chunks: 'all',
          priority: 20,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
      },
    },
  },
};
```

---

## 6. Deployment & Monitoring

### 6.1 Staging Deployment

```bash
# Build optimized version
npm run build:optimized

# Deploy to staging
npm run deploy:staging

# Run E2E tests against staging
npm run test:e2e:staging
```

### 6.2 Production Deployment

```bash
# Final build
npm run build

# Deploy to production
npm run deploy:production

# Monitor performance
npm run monitor:performance
```

### 6.3 Rollback Plan

```bash
# If issues occur, rollback to previous version
git checkout pre-migration-backup
npm run build
npm run deploy:production
```

---

## 7. Post-Migration Checklist

### 7.1 Functionality Verification

- [ ] All components render correctly
- [ ] All interactions work as expected
- [ ] Data flows correctly through the application
- [ ] Error handling works properly
- [ ] Loading states display correctly

### 7.2 Performance Verification

- [ ] Bundle size is within acceptable limits
- [ ] Page load times are improved or maintained
- [ ] Memory usage is stable
- [ ] No performance regressions detected

### 7.3 Accessibility Verification

- [ ] All components are keyboard accessible
- [ ] Screen reader compatibility maintained
- [ ] ARIA attributes are correct
- [ ] Color contrast meets standards

### 7.4 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 8. Troubleshooting Guide

### 8.1 Common Issues

#### Issue: Web Components not rendering
**Solution**: Ensure Polaris Web Components script is loaded before React

#### Issue: Event handlers not working
**Solution**: Check that event names match Web Components API (e.g., 'polaris-click' not 'click')

#### Issue: Styling not applied
**Solution**: Verify CSS is loaded and custom properties are set correctly

#### Issue: TypeScript errors
**Solution**: Update type definitions and ensure proper component prop types

### 8.2 Debug Tools

```typescript
// src/utils/debugUtils.ts
export const debugWebComponent = (element: HTMLElement) => {
  console.log('Web Component Debug:', {
    tagName: element.tagName,
    attributes: Array.from(element.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    })),
    events: element.getEventListeners?.() || 'No event listeners found'
  });
};
```

---

## 9. Success Metrics

### 9.1 Technical Metrics

- [ ] 100% component migration completion
- [ ] 90%+ test coverage maintained
- [ ] < 5% performance regression
- [ ] Zero accessibility violations
- [ ] Zero TypeScript errors

### 9.2 Business Metrics

- [ ] Zero user-reported issues
- [ ] Maintained feature parity
- [ ] Improved development velocity
- [ ] Reduced bundle size by 20%+
- [ ] Faster page load times

---

## 10. Next Steps

1. **Review and approve** this implementation guide
2. **Set up development environment** with new dependencies
3. **Begin Phase 1** implementation
4. **Establish regular progress reviews** and checkpoints
5. **Monitor performance** and user feedback post-migration

---

*This implementation guide will be updated throughout the migration process to reflect lessons learned and any necessary adjustments.*
