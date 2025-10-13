/**
 * Global TypeScript declarations for Web Components
 * 
 * This file provides comprehensive type definitions for Web Components
 * integration with React and TypeScript.
 */

// Global JSX namespace augmentation for Web Components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Polaris Web Components
      's-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
        size?: 'small' | 'medium' | 'large';
        disabled?: boolean;
        loading?: boolean;
        type?: 'button' | 'submit' | 'reset';
        'data-testid'?: string;
        'aria-label'?: string;
        'aria-disabled'?: boolean;
      };
      
      's-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        variant?: 'headingLg' | 'headingMd' | 'headingSm' | 'bodyLg' | 'bodyMd' | 'bodySm';
        as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
        tone?: 'base' | 'subdued' | 'critical' | 'warning' | 'success' | 'info';
        fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
        'data-testid'?: string;
        'aria-label'?: string;
        'aria-describedby'?: string;
      };
      
      's-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        title?: string;
        sectioned?: boolean;
        subdued?: boolean;
        'data-testid'?: string;
      };
      
      's-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        title?: string;
        sectioned?: boolean;
        subdued?: boolean;
        'data-testid'?: string;
      };
      
      's-layout': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-layout-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        variant?: 'oneHalf' | 'oneThird' | 'twoThirds' | 'fullWidth';
        'data-testid'?: string;
      };
      
      's-page': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        title?: string;
        subtitle?: string;
        primaryAction?: any;
        secondaryActions?: any[];
        'data-testid'?: string;
      };
      
      's-badge': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        tone?: 'info' | 'success' | 'warning' | 'critical' | 'attention';
        'data-testid'?: string;
      };
      
      's-spinner': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: 'small' | 'large';
        'data-testid'?: string;
      };
      
      's-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        error?: string;
        helpText?: string;
        multiline?: boolean;
        rows?: number;
        type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
        autoComplete?: string;
        'data-testid'?: string;
      };
      
      's-select': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        error?: string;
        helpText?: string;
        'data-testid'?: string;
      };
      
      's-option': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
        disabled?: boolean;
        'data-testid'?: string;
      };
      
      's-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        checked?: boolean;
        disabled?: boolean;
        error?: string;
        helpText?: string;
        'data-testid'?: string;
      };
      
      's-button-group': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        tabs?: any[];
        selected?: number;
        'data-testid'?: string;
      };
      
      's-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-tab'?: string;
        'data-testid'?: string;
      };
      
      's-modal': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        open?: boolean;
        title?: string;
        primaryAction?: any;
        secondaryActions?: any[];
        'data-testid'?: string;
      };
      
      's-toast': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        content?: string;
        'data-testid'?: string;
      };
      
      's-banner': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        tone?: 'info' | 'success' | 'warning' | 'critical';
        'data-testid'?: string;
      };
      
      's-data-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'column-content-types'?: string;
        headings?: string;
        sortable?: boolean;
        'data-testid'?: string;
      };
      
      's-resource-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        items?: string;
        selectable?: boolean;
        'data-testid'?: string;
      };
      
      's-resource-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        'data-testid'?: string;
      };
      
      's-empty-state': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        heading?: string;
        image?: string;
        'data-testid'?: string;
      };
      
      's-form-layout': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-form-layout-group': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-range-slider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: number;
        min?: number;
        max?: number;
        step?: number;
        output?: boolean;
        disabled?: boolean;
        'data-testid'?: string;
      };
      
      's-color-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        color?: any;
        'data-testid'?: string;
      };
      
      's-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-avatar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        source?: string;
        name?: string;
        initials?: string;
        'data-testid'?: string;
      };
      
      's-popover': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        active?: boolean;
        'data-testid'?: string;
      };
      
      's-action-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        source?: string;
        'data-testid'?: string;
      };
      
      's-skeleton-body-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-skeleton-display-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-frame': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-testid'?: string;
      };
      
      's-block-stack': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        gap?: string;
        align?: string;
        'data-testid'?: string;
      };
      
      's-inline-stack': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        gap?: string;
        align?: string;
        'data-testid'?: string;
      };
    }
  }

  // Extend HTMLElement interface for Web Components
  interface HTMLElement {
    connectedCallback?(): void;
    disconnectedCallback?(): void;
    attributeChangedCallback?(name: string, oldValue: string, newValue: string): void;
    getEventListeners?(): any[];
  }
}

// Web Component event types
export interface WebComponentEvent extends CustomEvent {
  detail?: any;
}

// Web Component lifecycle events
export interface WebComponentLifecycleEvents {
  'connected': CustomEvent;
  'disconnected': CustomEvent;
  'attribute-changed': CustomEvent<{ name: string; oldValue: string; newValue: string }>;
}

// Polaris Web Component events
export interface PolarisWebComponentEvents {
  'polaris-click': CustomEvent;
  'polaris-change': CustomEvent<{ value: any }>;
  'polaris-focus': CustomEvent;
  'polaris-blur': CustomEvent;
  'polaris-sort': CustomEvent<{ column: string; direction: 'asc' | 'desc' }>;
  'polaris-selection-change': CustomEvent<{ selectedIds: string[] }>;
  'polaris-tab-change': CustomEvent<{ selectedIndex: number }>;
  'polaris-modal-close': CustomEvent;
  'polaris-toast-dismiss': CustomEvent;
}

// Event conversion utilities
export interface SyntheticEventData {
  currentTarget: HTMLElement;
  target: HTMLElement;
  preventDefault: () => void;
  stopPropagation: () => void;
  nativeEvent: Event;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  timeStamp: number;
  type: string;
}

export type WebComponentEventConverter<T extends Event = CustomEvent> = (
  event: T
) => SyntheticEventData;