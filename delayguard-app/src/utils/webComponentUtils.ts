/**
 * Web Component Utilities for Polaris Web Components Integration
 * 
 * This module provides utilities for integrating Polaris Web Components
 * with React, including event handling, prop management, and lifecycle hooks.
 */

import { useRef, useEffect, useCallback, RefObject } from 'react';

/**
 * Event map for Web Component event handling
 */
export interface WebComponentEventMap {
  [eventName: string]: (event: CustomEvent) => void;
}

/**
 * Hook for managing Web Component event listeners
 * 
 * @param eventMap - Object mapping event names to handlers
 * @returns Ref to attach to Web Component
 */
export function useWebComponent<T extends HTMLElement>(
  eventMap: WebComponentEventMap
): RefObject<T> {
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

/**
 * Converts React props to Web Component attributes
 * 
 * @param props - React component props
 * @returns Object with string values for Web Component attributes
 */
export function createWebComponentProps(
  props: Record<string, any>
): Record<string, string> {
  const webComponentProps: Record<string, string> = {};
  
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Convert camelCase to kebab-case for Web Components
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      webComponentProps[kebabKey] = String(value);
    }
  });
  
  return webComponentProps;
}

/**
 * Hook for managing Web Component lifecycle
 * 
 * @param onConnected - Callback when component is connected
 * @param onDisconnected - Callback when component is disconnected
 * @returns Ref to attach to Web Component
 */
export function useWebComponentLifecycle<T extends HTMLElement>(
  onConnected?: () => void,
  onDisconnected?: () => void
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleConnected = () => onConnected?.();
    const handleDisconnected = () => onDisconnected?.();

    element.addEventListener('connected', handleConnected);
    element.addEventListener('disconnected', handleDisconnected);

    return () => {
      element.removeEventListener('connected', handleConnected);
      element.removeEventListener('disconnected', handleDisconnected);
    };
  }, [onConnected, onDisconnected]);

  return ref;
}

/**
 * Hook for managing Web Component state synchronization
 * 
 * @param state - State object to sync
 * @returns Ref to attach to Web Component
 */
export function useWebComponentState<T extends HTMLElement>(
  state: Record<string, any>
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Update Web Component properties when state changes
    Object.entries(state).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        (element as any)[key] = value;
      }
    });
  }, [state]);

  return ref;
}

/**
 * Debug utility for Web Component inspection
 * 
 * @param element - Web Component element
 * @param label - Debug label
 */
export function debugWebComponent(element: HTMLElement, label: string = 'Web Component') {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${label} Debug:`, {
      tagName: element.tagName,
      attributes: Array.from(element.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      })),
      properties: Object.getOwnPropertyNames(element).filter(prop => 
        typeof (element as any)[prop] !== 'function'
      ),
      events: (element as any).getEventListeners?.() || 'No event listeners found'
    });
  }
}

/**
 * Type guard to check if element is a Web Component
 * 
 * @param element - Element to check
 * @returns True if element is a Web Component
 */
export function isWebComponent(element: HTMLElement): boolean {
  return element.tagName.includes('-') || element.constructor.name.includes('Element');
}

/**
 * Wait for Web Component to be defined
 * 
 * @param tagName - Web Component tag name
 * @returns Promise that resolves when component is defined
 */
export function waitForWebComponent(tagName: string): Promise<CustomElementConstructor> {
  return new Promise((resolve) => {
    if (customElements.get(tagName)) {
      resolve(customElements.get(tagName)!);
    } else {
      customElements.whenDefined(tagName).then(() => {
        resolve(customElements.get(tagName)!);
      });
    }
  });
}
