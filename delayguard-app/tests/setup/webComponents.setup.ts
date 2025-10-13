/**
 * Web Components Testing Setup
 * 
 * This file sets up the testing environment for Polaris Web Components.
 * It includes polyfills, mock components, and testing utilities.
 */

import '@testing-library/jest-dom';

// Web Components polyfill for testing environment
if (typeof window !== 'undefined') {
  // Mock customElements if not available
  if (!window.customElements) {
    (window as any).customElements = {
      define: jest.fn(),
      get: jest.fn(),
      whenDefined: jest.fn(() => Promise.resolve()),
      upgrade: jest.fn(),
    };
  }

  // Mock HTMLElement methods for Web Components
  if (!HTMLElement.prototype.getEventListeners) {
    (HTMLElement.prototype as any).getEventListeners = function() {
      return [];
    };
  }

  // Mock CustomEvent if not available
  if (!window.CustomEvent) {
    (window as any).CustomEvent = class CustomEvent extends Event {
      detail: any;
      constructor(type: string, eventInitDict?: CustomEventInit) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail;
      }
    };
  }
}

// Mock Web Components for testing
class MockWebComponent extends HTMLElement {
  private _props: Record<string, any> = {};

  connectedCallback() {
    this.updateAttributes();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this._props[name] = newValue;
  }

  private updateAttributes() {
    Array.from(this.attributes).forEach(attr => {
      this._props[attr.name] = attr.value;
    });
  }

  // Getters and setters for common properties
  get variant() { return this._props.variant || 'primary'; }
  set variant(value) { this._props.variant = value; this.setAttribute('variant', value); }

  get disabled() { return this._props.disabled === 'true' || this._props.disabled === true; }
  set disabled(value) { this._props.disabled = value; this.setAttribute('disabled', String(value)); }

  get loading() { return this._props.loading === 'true' || this._props.loading === true; }
  set loading(value) { this._props.loading = value; this.setAttribute('loading', String(value)); }

  get size() { return this._props.size || 'medium'; }
  set size(value) { this._props.size = value; this.setAttribute('size', value); }

  get tone() { return this._props.tone || 'base'; }
  set tone(value) { this._props.tone = value; this.setAttribute('tone', value); }

  get as() { return this._props.as || 'p'; }
  set as(value) { this._props.as = value; this.setAttribute('as', value); }
}

// Register mock Web Components
if (typeof window !== 'undefined') {
  // Only register if not already registered
  const registerComponent = (tagName: string) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, MockWebComponent);
    }
  };

  // Register all Polaris Web Components
  const componentNames = [
    's-button', 's-text', 's-card', 's-section', 's-layout', 's-page', 's-badge',
    's-spinner', 's-text-field', 's-select', 's-checkbox', 's-button-group',
    's-tabs', 's-modal', 's-toast', 's-banner', 's-data-table', 's-resource-list',
    's-resource-item', 's-empty-state', 's-form-layout', 's-range-slider',
    's-color-picker', 's-divider', 's-avatar', 's-popover', 's-action-list',
    's-icon', 's-skeleton-body-text', 's-skeleton-display-text', 's-frame',
    's-block-stack', 's-inline-stack'
  ];

  componentNames.forEach(registerComponent);
}

// Mock Web Components testing utilities
export const mockWebComponent = (tagName: string, props: Record<string, any> = {}) => {
  const element = document.createElement(tagName);
  Object.entries(props).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
};

// Mock event dispatching for Web Components
export const dispatchWebComponentEvent = (element: HTMLElement, eventName: string, detail?: any) => {
  const event = new CustomEvent(eventName, { detail });
  element.dispatchEvent(event);
  return event;
};

// Mock Web Component lifecycle
export const mockWebComponentLifecycle = (element: HTMLElement) => {
  const connectedCallback = (element as any).connectedCallback;
  const disconnectedCallback = (element as any).disconnectedCallback;
  
  if (connectedCallback) {
    connectedCallback.call(element);
  }
  
  return () => {
    if (disconnectedCallback) {
      disconnectedCallback.call(element);
    }
  };
};
