import { useState, useCallback } from 'react';
import { logWarn } from '../utils/logger';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logWarn(`Error reading localStorage key "${key}"`, { 
        component: 'useLocalStorage', 
        action: 'read',
        metadata: { key, error }, 
      });
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logWarn(`Error setting localStorage key "${key}"`, { 
        component: 'useLocalStorage', 
        action: 'set',
        metadata: { key, error }, 
      });
    }
  }, [key, storedValue]);

  // Remove from local storage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logWarn(`Error removing localStorage key "${key}"`, { 
        component: 'useLocalStorage', 
        action: 'remove',
        metadata: { key, error }, 
      });
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

export const useSessionStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logWarn(`Error reading sessionStorage key "${key}"`, { 
        component: 'useSessionStorage', 
        action: 'read',
        metadata: { key, error }, 
      });
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logWarn(`Error setting sessionStorage key "${key}"`, { 
        component: 'useSessionStorage', 
        action: 'set',
        metadata: { key, error }, 
      });
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logWarn(`Error removing sessionStorage key "${key}"`, { 
        component: 'useSessionStorage', 
        action: 'remove',
        metadata: { key, error }, 
      });
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};
