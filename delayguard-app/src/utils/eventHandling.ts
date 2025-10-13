/**
 * World-Class Event Handling Utilities for Web Components
 * 
 * This module provides robust, type-safe event handling utilities
 * for integrating Web Components with React, following modern best practices.
 */

import * as React from 'react';
import { SyntheticEventData, WebComponentEventConverter } from '../types/global';

/**
 * Type-safe event converter factory
 * Creates a converter function that transforms Web Component events to React SyntheticEvents
 */
export function createEventConverter<T extends Event = CustomEvent>(
  eventType: string
): WebComponentEventConverter<T> {
  return (event: T): SyntheticEventData => {
    const syntheticEvent: SyntheticEventData = {
      currentTarget: event.currentTarget as HTMLElement,
      target: event.target as HTMLElement,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
      nativeEvent: event,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      eventPhase: event.eventPhase,
      isTrusted: event.isTrusted,
      timeStamp: event.timeStamp,
      type: eventType,
    };

    return syntheticEvent;
  };
}

/**
 * Enhanced event handler with proper error handling and logging
 */
export function createEventHandler<T extends Event = CustomEvent>(
  handler: (event: SyntheticEventData) => void,
  eventType: string,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    logErrors?: boolean;
  } = {}
) {
  const { preventDefault = false, stopPropagation = false, logErrors = true } = options;
  const converter = createEventConverter<T>(eventType);

  return (event: T) => {
    try {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      const syntheticEvent = converter(event);
      handler(syntheticEvent);
    } catch (error) {
      if (logErrors) {
        console.error(`Error in ${eventType} event handler:`, error);
      }
      throw error;
    }
  };
}

/**
 * Event listener manager with automatic cleanup
 */
export class EventListenerManager {
  private listeners: Map<HTMLElement, Map<string, (event: Event) => void>> = new Map();

  addListener<T extends Event = CustomEvent>(
    element: HTMLElement,
    eventType: string,
    handler: (event: SyntheticEventData) => void,
    options: {
      preventDefault?: boolean;
      stopPropagation?: boolean;
      logErrors?: boolean;
    } = {}
  ): () => void {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }

    const elementListeners = this.listeners.get(element)!;
    const eventHandler = createEventHandler<T>(handler, eventType, options) as EventListener;
    
    elementListeners.set(eventType, eventHandler);
    element.addEventListener(eventType, eventHandler);

    // Return cleanup function
    return () => {
      element.removeEventListener(eventType, eventHandler);
      elementListeners.delete(eventType);
      if (elementListeners.size === 0) {
        this.listeners.delete(element);
      }
    };
  }

  removeAllListeners(element: HTMLElement): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    elementListeners.forEach((handler, eventType) => {
      element.removeEventListener(eventType, handler);
    });

    this.listeners.delete(element);
  }

  cleanup(): void {
    this.listeners.forEach((elementListeners, element) => {
      elementListeners.forEach((handler, eventType) => {
        element.removeEventListener(eventType, handler);
      });
    });
    this.listeners.clear();
  }
}

/**
 * React hook for managing Web Component event listeners
 */
export function useWebComponentEvents<T extends Event = CustomEvent>(
  elementRef: React.RefObject<HTMLElement>,
  eventMap: Record<string, (event: SyntheticEventData) => void>,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    logErrors?: boolean;
  } = {}
): void {
  const manager = React.useRef(new EventListenerManager());

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || Object.keys(eventMap).length === 0) return;

    const cleanupFunctions: (() => void)[] = [];

    Object.entries(eventMap).forEach(([eventType, handler]) => {
      const cleanup = manager.current.addListener<T>(
        element,
        eventType,
        handler,
        options
      );
      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [elementRef, eventMap, options]);

  React.useEffect(() => {
    return () => {
      manager.current.cleanup();
    };
  }, []);
}

/**
 * Event delegation utility for handling events on dynamic content
 */
export function createEventDelegator<T extends Event = Event>(
  container: HTMLElement,
  selector: string,
  eventType: string,
  handler: (event: T, target: HTMLElement) => void
): () => void {
  const delegatedHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.matches(selector)) {
      handler(event as T, target);
    }
  };

  container.addEventListener(eventType, delegatedHandler);

  return () => {
    container.removeEventListener(eventType, delegatedHandler);
  };
}

/**
 * Debounced event handler factory
 */
export function createDebouncedHandler<T extends Event = Event>(
  handler: (event: T) => void,
  delay: number
): (event: T) => void {
  let timeoutId: NodeJS.Timeout;

  return (event: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => handler(event), delay);
  };
}

/**
 * Throttled event handler factory
 */
export function createThrottledHandler<T extends Event = Event>(
  handler: (event: T) => void,
  delay: number
): (event: T) => void {
  let lastCall = 0;

  return (event: T) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      handler(event);
    }
  };
}

/**
 * Event validation utility
 */
export function validateEvent<T extends Event>(
  event: T,
  expectedType: string,
  requiredProperties: string[] = []
): boolean {
  if (event.type !== expectedType) {
    console.warn(`Expected event type '${expectedType}', got '${event.type}'`);
    return false;
  }

  for (const prop of requiredProperties) {
    if (!(prop in event)) {
      console.warn(`Event missing required property: ${prop}`);
      return false;
    }
  }

  return true;
}

/**
 * Event debugging utility
 */
export function debugEvent<T extends Event>(
  event: T,
  label: string = 'Event'
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${label} Debug:`, {
      type: event.type,
      target: event.target,
      currentTarget: event.currentTarget,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      eventPhase: event.eventPhase,
      isTrusted: event.isTrusted,
      timeStamp: event.timeStamp,
      detail: (event as any).detail,
    });
  }
}
