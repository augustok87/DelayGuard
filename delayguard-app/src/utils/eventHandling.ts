/**
 * World-Class Event Handling Utilities for React Components
 *
 * This module provides robust, type-safe event handling utilities
 * for React Components, following modern best practices.
 */

import * as React from "react";
import { logger } from '../utils/logger';

/**
 * Simple event handler for React components
 */
export function createSimpleEventHandler(
  handler: (event: React.SyntheticEvent) => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {},
) {
  const { preventDefault = false, stopPropagation = false } = options;

  return (event: React.SyntheticEvent) => {
    try {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      handler(event);
    } catch (error) {
      logger.error("Event handling failed", error as Error);
      throw error;
    }
  };
}

/**
 * Event listener manager for DOM elements
 */
export class EventListenerManager {
  private listeners = new Map<HTMLElement, Map<string, EventListener>>();

  addEventListener(
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }

    const elementListeners = this.listeners.get(element)!;
    elementListeners.set(eventType, handler);
    element.addEventListener(eventType, handler, options);

    // Return cleanup function
    return () => {
      element.removeEventListener(eventType, handler);
      elementListeners.delete(eventType);
      if (elementListeners.size === 0) {
        this.listeners.delete(element);
      }
    };
  }

  removeEventListener(element: HTMLElement, eventType: string) {
    const elementListeners = this.listeners.get(element);
    if (elementListeners) {
      const handler = elementListeners.get(eventType);
      if (handler) {
        element.removeEventListener(eventType, handler);
        elementListeners.delete(eventType);
        if (elementListeners.size === 0) {
          this.listeners.delete(element);
        }
      }
    }
  }

  removeAllListeners(element: HTMLElement) {
    const elementListeners = this.listeners.get(element);
    if (elementListeners) {
      for (const [eventType, handler] of elementListeners) {
        element.removeEventListener(eventType, handler);
      }
      this.listeners.delete(element);
    }
  }

  cleanup() {
    for (const [element, elementListeners] of this.listeners) {
      for (const [eventType, handler] of elementListeners) {
        element.removeEventListener(eventType, handler);
      }
    }
    this.listeners.clear();
  }
}

/**
 * Global event listener manager instance
 */
export const globalEventListenerManager = new EventListenerManager();

/**
 * Utility functions for common event handling patterns
 */
export const EventUtils = {
  /**
   * Debounce function for event handlers
   */
  debounce<T extends(...args: unknown[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function for event handlers
   */
  throttle<T extends(...args: unknown[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Check if event target is within a specific element
   */
  isWithinElement(event: Event, element: HTMLElement): boolean {
    return element.contains(event.target as Node);
  },

  /**
   * Get event coordinates relative to an element
   */
  getRelativeCoordinates(event: MouseEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  },
};
