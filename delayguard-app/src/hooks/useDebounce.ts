import { useState, useEffect, useRef, useCallback } from 'react';
import { logErrorWithError, logError } from '../utils/logger';

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
        // Handle promises properly
        if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
          (result as Promise<unknown>).catch((error: unknown) => {
            if (error instanceof Error) {
              logErrorWithError(error, { component: 'useDebounce', action: 'callback' });
            } else {
              logError('Promise rejected with non-Error value', { 
                component: 'useDebounce', 
                action: 'callback',
                metadata: { error }
              });
            }
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          logErrorWithError(error, { component: 'useDebounce', action: 'callback' });
        } else {
          logError('Callback threw non-Error value', { 
            component: 'useDebounce', 
            action: 'callback',
            metadata: { error }
          });
        }
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
