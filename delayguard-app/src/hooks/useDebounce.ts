import { useState, useEffect, useRef, useCallback } from 'react';
import { logError } from '../utils/logger';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): T => {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async() => {
      try {
        const result = callback(...args);
        // Handle promises
        if (result && typeof result.catch === 'function') {
          result.catch((error: unknown) => {
            logError(error, { component: 'useDebounce', action: 'callback' });
          });
        }
      } catch (error) {
        logError(error, { component: 'useDebounce', action: 'callback' });
      }
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
};
