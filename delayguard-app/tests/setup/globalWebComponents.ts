/**
 * World-Class Web Components Mock System
 * 
 * This file provides comprehensive, production-quality mocks for Polaris Web Components
 * that behave like real HTML elements with proper accessibility, semantic structure,
 * and event handling capabilities.
 */

// Enhanced Web Component base class with world-class features
class MockWebComponent extends HTMLElement {
  private _props: Record<string, any> = {};
  private _eventListeners: Map<string, Set<EventListener>> = new Map();
  private _isConnected = false;
  private _shadowRoot: ShadowRoot | null = null;

  // Lifecycle methods
  connectedCallback() {
    this._isConnected = true;
    this.updateAttributes();
    this.render();
    this.setupAccessibility();
    this.dispatchEvent(new CustomEvent('connected', { bubbles: true }));
  }

  // Constructor to ensure initialization
  constructor() {
    super();
    // Initialize immediately for testing
    this._isConnected = true;
    this.updateAttributes();
    this.render();
    this.setupAccessibility();
    
    // Force role setting for testing
    if (this.tagName.toLowerCase() === 's-button') {
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', '0');
    }
  }

  disconnectedCallback() {
    this._isConnected = false;
    this.cleanup();
    this.dispatchEvent(new CustomEvent('disconnected', { bubbles: true }));
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this._props[name] = this.parseAttributeValue(name, newValue);
    if (this._isConnected) {
      this.updateAttributes();
      this.render();
    }
  }

  // Enhanced event handling
  addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, new Set());
    }
    this._eventListeners.get(type)!.add(listener);
    super.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: EventListener, options?: boolean | EventListenerOptions) {
    if (this._eventListeners.has(type)) {
      this._eventListeners.get(type)!.delete(listener);
    }
    super.removeEventListener(type, listener, options);
  }

  // Get all event listeners for debugging
  getEventListeners() {
    const listeners: Record<string, EventListener[]> = {};
    this._eventListeners.forEach((set, type) => {
      listeners[type] = Array.from(set);
    });
    return listeners;
  }

  // Property management
  private updateAttributes() {
    Array.from(this.attributes).forEach(attr => {
      this._props[attr.name] = this.parseAttributeValue(attr.name, attr.value);
    });
    
    // Handle className specifically
    if (this._props.className) {
      this.className = this._props.className;
    }
  }

  private parseAttributeValue(name: string, value: string): any {
    // Parse boolean attributes
    if (['disabled', 'loading', 'checked', 'open', 'active', 'sectioned', 'subdued', 'multiline', 'sortable', 'selectable', 'output'].includes(name)) {
      return value === 'true' || value === '';
    }
    
    // Parse number attributes
    if (['rows', 'min', 'max', 'step', 'value', 'selected'].includes(name)) {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    
    // Parse array attributes (comma-separated)
    if (['tabs', 'items', 'headings', 'column-content-types'].includes(name)) {
      return value ? value.split(',').map(s => s.trim()) : [];
    }
    
    return value;
  }

  // Rendering system
  private render() {
    const tagName = this.tagName.toLowerCase();
    
    // Set appropriate ARIA roles and semantic structure
    this.setupSemanticStructure(tagName);
    
    // Apply visual styling based on props
    this.applyVisualStyling(tagName);
    
    // Set up interactive behavior
    this.setupInteractiveBehavior(tagName);
  }

  private setupSemanticStructure(tagName: string) {
    // Set appropriate ARIA roles
    switch (tagName) {
      case 's-button':
        this.setAttribute('role', 'button');
        this.setAttribute('tabindex', this.disabled ? '-1' : '0');
        // Ensure className is properly set
        if (this._props.className) {
          this.className = this._props.className;
        }
        break;
      case 's-text':
        // Text elements don't need roles, but we can set appropriate heading levels
        if (this.as && this.as.startsWith('h')) {
          this.setAttribute('role', 'heading');
          this.setAttribute('aria-level', this.as.slice(1));
        }
        break;
      case 's-card':
        this.setAttribute('role', 'region');
        break;
      case 's-section':
        this.setAttribute('role', 'region');
        break;
      case 's-layout':
        this.setAttribute('role', 'main');
        break;
      case 's-page':
        this.setAttribute('role', 'main');
        break;
      case 's-badge':
        this.setAttribute('role', 'status');
        break;
      case 's-spinner':
        this.setAttribute('role', 'status');
        this.setAttribute('aria-label', 'Loading...');
        break;
      case 's-text-field':
        this.setAttribute('role', 'textbox');
        break;
      case 's-select':
        this.setAttribute('role', 'combobox');
        break;
      case 's-checkbox':
        this.setAttribute('role', 'checkbox');
        break;
      case 's-tabs':
        this.setAttribute('role', 'tablist');
        break;
      case 's-tab':
        this.setAttribute('role', 'tab');
        break;
      case 's-modal':
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
        break;
      case 's-toast':
        this.setAttribute('role', 'alert');
        break;
      case 's-banner':
        this.setAttribute('role', 'banner');
        break;
      case 's-data-table':
        this.setAttribute('role', 'table');
        break;
      case 's-resource-list':
        this.setAttribute('role', 'list');
        break;
      case 's-resource-item':
        this.setAttribute('role', 'listitem');
        break;
      case 's-empty-state':
        this.setAttribute('role', 'status');
        break;
    }
  }

  private applyVisualStyling(tagName: string) {
    // Apply visual styling based on variant, tone, size, etc.
    const styles: string[] = [];
    
    // Base styling
    styles.push(`
      display: inline-block;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `);

    // Component-specific styling
    switch (tagName) {
      case 's-button':
        styles.push(this.getButtonStyles());
        break;
      case 's-text':
        styles.push(this.getTextStyles());
        break;
      case 's-card':
        styles.push(this.getCardStyles());
        break;
      case 's-badge':
        styles.push(this.getBadgeStyles());
        break;
      case 's-spinner':
        styles.push(this.getSpinnerStyles());
        break;
    }

    // Apply styles
    if (styles.length > 0) {
      this.style.cssText = styles.join(' ');
    }
  }

  private getButtonStyles(): string {
    const variant = this.variant || 'primary';
    const size = this.size || 'medium';
    const disabled = this.disabled;
    const loading = this.loading;

    const baseStyles = `
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: ${disabled || loading ? 'not-allowed' : 'pointer'};
      font-weight: 500;
      text-align: center;
      text-decoration: none;
      transition: all 0.2s ease;
      opacity: ${disabled || loading ? '0.6' : '1'};
      pointer-events: ${disabled || loading ? 'none' : 'auto'};
    `;

    const sizeStyles = {
      small: 'padding: 4px 8px; font-size: 12px; min-height: 24px;',
      medium: 'padding: 8px 16px; font-size: 14px; min-height: 32px;',
      large: 'padding: 12px 24px; font-size: 16px; min-height: 40px;'
    };

    const variantStyles = {
      primary: 'background-color: #0070f3; color: white; border-color: #0070f3;',
      secondary: 'background-color: transparent; color: #0070f3; border-color: #0070f3;',
      tertiary: 'background-color: transparent; color: #666; border-color: transparent;',
      destructive: 'background-color: #e00; color: white; border-color: #e00;'
    };

    return baseStyles + sizeStyles[size] + variantStyles[variant];
  }

  private getTextStyles(): string {
    const variant = this.variant || 'bodyMd';
    const tone = this.tone || 'base';

    const variantStyles = {
      headingLg: 'font-size: 24px; font-weight: 600; line-height: 1.2;',
      headingMd: 'font-size: 20px; font-weight: 600; line-height: 1.3;',
      headingSm: 'font-size: 16px; font-weight: 600; line-height: 1.4;',
      bodyLg: 'font-size: 16px; font-weight: 400; line-height: 1.5;',
      bodyMd: 'font-size: 14px; font-weight: 400; line-height: 1.5;',
      bodySm: 'font-size: 12px; font-weight: 400; line-height: 1.4;'
    };

    const toneStyles = {
      base: 'color: #333;',
      subdued: 'color: #666;',
      critical: 'color: #e00;',
      warning: 'color: #f90;',
      success: 'color: #090;',
      info: 'color: #0070f3;'
    };

    return variantStyles[variant] + toneStyles[tone];
  }

  private getCardStyles(): string {
    return `
      background-color: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;
  }

  private getBadgeStyles(): string {
    const tone = this.tone || 'info';
    
    const toneStyles = {
      info: 'background-color: #e6f3ff; color: #0070f3;',
      success: 'background-color: #e6f7e6; color: #090;',
      warning: 'background-color: #fff3cd; color: #f90;',
      critical: 'background-color: #ffe6e6; color: #e00;',
      attention: 'background-color: #fff3cd; color: #f90;'
    };

    return `
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      ${toneStyles[tone]}
    `;
  }

  private getSpinnerStyles(): string {
    const size = this.size || 'small';
    const sizeValue = size === 'large' ? '24px' : '16px';
    
    return `
      display: inline-block;
      width: ${sizeValue};
      height: ${sizeValue};
      border: 2px solid #e1e5e9;
      border-top: 2px solid #0070f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
  }

  private setupInteractiveBehavior(tagName: string) {
    switch (tagName) {
      case 's-button':
        this.setupButtonBehavior();
        break;
      case 's-checkbox':
        this.setupCheckboxBehavior();
        break;
      case 's-tab':
        this.setupTabBehavior();
        break;
    }
  }

  private setupButtonBehavior() {
    // Handle click events
    this.addEventListener('click', (event) => {
      if (!this.disabled && !this.loading) {
        // Dispatch Polaris-specific event
        this.dispatchEvent(new CustomEvent('polaris-click', {
          detail: { originalEvent: event },
          bubbles: true,
          cancelable: true
        }));
      }
    });

    // Handle keyboard events
    this.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !this.disabled && !this.loading) {
        event.preventDefault();
        this.click();
      }
    });
  }

  private setupCheckboxBehavior() {
    this.addEventListener('click', (event) => {
      if (!this.disabled) {
        this.checked = !this.checked;
        this.dispatchEvent(new CustomEvent('polaris-change', {
          detail: { checked: this.checked },
          bubbles: true,
          cancelable: true
        }));
      }
    });
  }

  private setupTabBehavior() {
    this.addEventListener('click', (event) => {
      this.dispatchEvent(new CustomEvent('polaris-tab-change', {
        detail: { tabId: this.getAttribute('data-tab') },
        bubbles: true,
        cancelable: true
      }));
    });
  }

  private setupAccessibility() {
    // Ensure proper focus management
    if (this.hasAttribute('tabindex') && !this.disabled) {
      this.tabIndex = parseInt(this.getAttribute('tabindex') || '0');
    }
  }

  private cleanup() {
    this._eventListeners.clear();
  }

  // Property getters and setters
  get variant() { return this._props.variant || 'primary'; }
  set variant(value) { this._props.variant = value; this.setAttribute('variant', value); }

  get disabled() { return this._props.disabled === true || this._props.disabled === 'true'; }
  set disabled(value) { this._props.disabled = value; this.setAttribute('disabled', String(value)); }

  get loading() { return this._props.loading === true || this._props.loading === 'true'; }
  set loading(value) { this._props.loading = value; this.setAttribute('loading', String(value)); }

  get size() { return this._props.size || 'medium'; }
  set size(value) { this._props.size = value; this.setAttribute('size', value); }

  get tone() { return this._props.tone || 'base'; }
  set tone(value) { this._props.tone = value; this.setAttribute('tone', value); }

  get as() { return this._props.as || 'p'; }
  set as(value) { this._props.as = value; this.setAttribute('as', value); }

  get checked() { return this._props.checked === true || this._props.checked === 'true'; }
  set checked(value) { this._props.checked = value; this.setAttribute('checked', String(value)); }

  get value() { return this._props.value || ''; }
  set value(val) { this._props.value = val; this.setAttribute('value', val); }

  get open() { return this._props.open === true || this._props.open === 'true'; }
  set open(value) { this._props.open = value; this.setAttribute('open', String(value)); }

  get active() { return this._props.active === true || this._props.active === 'true'; }
  set active(value) { this._props.active = value; this.setAttribute('active', String(value)); }

  get sectioned() { return this._props.sectioned === true || this._props.sectioned === 'true'; }
  set sectioned(value) { this._props.sectioned = value; this.setAttribute('sectioned', String(value)); }

  get subdued() { return this._props.subdued === true || this._props.subdued === 'true'; }
  set subdued(value) { this._props.subdued = value; this.setAttribute('subdued', String(value)); }

  get className() { return this._props.className || ''; }
  set className(value) { this._props.className = value; this.setAttribute('class', value); }
}

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Register all Polaris Web Components globally
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  const componentNames = [
    's-button', 's-text', 's-card', 's-section', 's-layout', 's-layout-section',
    's-page', 's-badge', 's-spinner', 's-text-field', 's-select', 's-option',
    's-checkbox', 's-button-group', 's-tabs', 's-tab', 's-modal', 's-toast',
    's-banner', 's-data-table', 's-resource-list', 's-resource-item',
    's-empty-state', 's-form-layout', 's-form-layout-group', 's-range-slider',
    's-color-picker', 's-divider', 's-avatar', 's-popover', 's-action-list',
    's-icon', 's-skeleton-body-text', 's-skeleton-display-text', 's-frame',
    's-block-stack', 's-inline-stack'
  ];

  componentNames.forEach(tagName => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, MockWebComponent);
    }
  });
}