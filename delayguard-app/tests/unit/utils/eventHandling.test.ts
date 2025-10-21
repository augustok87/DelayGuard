/**
 * Comprehensive test suite for eventHandling utility
 * 
 * Testing Strategy:
 * - Test simple event handler creation
 * - Test EventListenerManager class
 * - Test EventUtils debouncing and throttling
 * - Test cleanup and memory management
 */

import React from 'react';
import {
  createSimpleEventHandler,
  EventListenerManager,
  EventUtils,
} from '../../../src/utils/eventHandling';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Event Handling Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('createSimpleEventHandler', () => {
    it('should create a simple event handler', () => {
      const mockHandler = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.SyntheticEvent;

      const handler = createSimpleEventHandler(mockHandler);
      handler(mockEvent);

      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });

    it('should call preventDefault when option is true', () => {
      const mockHandler = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.SyntheticEvent;

      const handler = createSimpleEventHandler(mockHandler, {
        preventDefault: true,
      });
      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    });

    it('should call stopPropagation when option is true', () => {
      const mockHandler = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.SyntheticEvent;

      const handler = createSimpleEventHandler(mockHandler, {
        stopPropagation: true,
      });
      handler(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle both preventDefault and stopPropagation', () => {
      const mockHandler = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.SyntheticEvent;

      const handler = createSimpleEventHandler(mockHandler, {
        preventDefault: true,
        stopPropagation: true,
      });
      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    });

    it('should re-throw errors from handler', () => {
      const error = new Error('Handler failed');
      const mockHandler = jest.fn(() => {
        throw error;
      });
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.SyntheticEvent;

      const handler = createSimpleEventHandler(mockHandler);

      expect(() => handler(mockEvent)).toThrow(error);
    });
  });

  describe('EventListenerManager', () => {
    let manager: EventListenerManager;
    let element: HTMLElement;

    beforeEach(() => {
      manager = new EventListenerManager();
      element = document.createElement('div');
    });

    it('should add event listener to element', () => {
      const mockHandler = jest.fn();
      const addEventListenerSpy = jest.spyOn(element, 'addEventListener');

      manager.addEventListener(element, 'click', mockHandler);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        mockHandler,
        undefined,
      );
    });

    it('should return cleanup function', () => {
      const mockHandler = jest.fn();
      const cleanup = manager.addEventListener(element, 'click', mockHandler);

      expect(typeof cleanup).toBe('function');
    });

    it('should cleanup event listener when cleanup is called', () => {
      const mockHandler = jest.fn();
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');

      const cleanup = manager.addEventListener(element, 'click', mockHandler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', mockHandler);
    });

    it('should remove event listener', () => {
      const mockHandler = jest.fn();
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');

      manager.addEventListener(element, 'click', mockHandler);
      manager.removeEventListener(element, 'click');

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', mockHandler);
    });

    it('should remove all event listeners for an element', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');

      manager.addEventListener(element, 'click', mockHandler1);
      manager.addEventListener(element, 'mouseover', mockHandler2);
      manager.removeAllListeners(element);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', mockHandler1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseover', mockHandler2);
    });

    it('should cleanup all event listeners', () => {
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');
      const mockHandler = jest.fn();

      manager.addEventListener(element1, 'click', mockHandler);
      manager.addEventListener(element2, 'click', mockHandler);

      const removeEventListenerSpy1 = jest.spyOn(element1, 'removeEventListener');
      const removeEventListenerSpy2 = jest.spyOn(element2, 'removeEventListener');

      manager.cleanup();

      expect(removeEventListenerSpy1).toHaveBeenCalled();
      expect(removeEventListenerSpy2).toHaveBeenCalled();
    });
  });

  describe('EventUtils.debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = EventUtils.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const mockFn = jest.fn();
      const debouncedFn = EventUtils.debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2');

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = EventUtils.debounce(mockFn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('EventUtils.throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = EventUtils.throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to throttled function', () => {
      const mockFn = jest.fn();
      const throttledFn = EventUtils.throttle(mockFn, 100);

      throttledFn('arg1', 'arg2');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should allow immediate execution', () => {
      const mockFn = jest.fn();
      const throttledFn = EventUtils.throttle(mockFn, 100);

      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not call function multiple times within throttle period', () => {
      const mockFn = jest.fn();
      const throttledFn = EventUtils.throttle(mockFn, 100);

      throttledFn();
      jest.advanceTimersByTime(50);
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('EventUtils.isWithinElement', () => {
    it('should return true when event target is within element', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      const mockEvent = {
        target: child,
      } as unknown as Event;

      expect(EventUtils.isWithinElement(mockEvent, parent)).toBe(true);
    });

    it('should return false when event target is not within element', () => {
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      const mockEvent = {
        target: element2,
      } as unknown as Event;

      expect(EventUtils.isWithinElement(mockEvent, element1)).toBe(false);
    });
  });

  describe('EventUtils.getRelativeCoordinates', () => {
    it('should return relative coordinates', () => {
      const element = document.createElement('div');
      jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 200,
        bottom: 150,
        width: 100,
        height: 100,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      });

      const mockEvent = {
        clientX: 150,
        clientY: 100,
      } as MouseEvent;

      const coords = EventUtils.getRelativeCoordinates(mockEvent, element);

      expect(coords).toEqual({
        x: 50,
        y: 50,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle debounce with 0 delay', () => {
      const mockFn = jest.fn();
      const debouncedFn = EventUtils.debounce(mockFn, 0);

      debouncedFn();

      jest.advanceTimersByTime(0);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle throttle with 0 delay', () => {
      const mockFn = jest.fn();
      const throttledFn = EventUtils.throttle(mockFn, 0);

      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent event listener', () => {
      const manager = new EventListenerManager();
      const element = document.createElement('div');
      expect(() => {
        manager.removeEventListener(element, 'click');
      }).not.toThrow();
    });

    it('should handle cleanup of empty listener manager', () => {
      const manager = new EventListenerManager();
      expect(() => {
        manager.cleanup();
      }).not.toThrow();
    });
  });
});
