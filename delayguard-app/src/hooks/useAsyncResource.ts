/**
 * World-Class Async Resource Management Hook
 * 
 * Features:
 * - Generic async resource management
 * - Built-in caching with TTL
 * - Optimistic updates
 * - Error handling and retry logic
 * - Loading states
 * - Background refresh
 * - Memory leak prevention
 * - Performance monitoring
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logErrorWithError, logPerformance, logUserAction } from '../utils/logger';

export interface AsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetch: number | null;
  retryCount: number;
  isStale: boolean;
}

export interface AsyncResourceConfig<T> {
  cacheKey?: string;
  cacheTTL?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  backgroundRefresh?: boolean;
  backgroundRefreshInterval?: number; // milliseconds
  optimisticUpdates?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (retryCount: number) => void;
  staleTime?: number; // milliseconds
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export interface AsyncResourceActions<T> {
  fetch: () => Promise<T>;
  refetch: () => Promise<T>;
  mutate: (data: T) => void;
  reset: () => void;
  retry: () => Promise<T>;
  setData: (data: T) => void;
  setError: (error: Error) => void;
  setLoading: (loading: boolean) => void;
}

// Global cache for all async resources
const globalCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const useAsyncResource = <T>(
  fetchFn: () => Promise<T>,
  config: AsyncResourceConfig<T> = {}
): [AsyncResourceState<T>, AsyncResourceActions<T>] => {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retryAttempts = 3,
    retryDelay = 1000,
    backgroundRefresh = false,
    backgroundRefreshInterval = 30 * 1000, // 30 seconds
    optimisticUpdates = false,
    onSuccess,
    onError,
    onRetry,
    staleTime = 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
  } = config;

  const [state, setState] = useState<AsyncResourceState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
    retryCount: 0,
    isStale: false,
  });

  const fetchFnRef = useRef(fetchFn);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const backgroundRefreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Update fetch function ref when it changes
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, []);

  // Check if data is stale
  const checkStaleness = useCallback((lastFetch: number | null) => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > staleTime;
  }, [staleTime]);

  // Get data from cache
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      globalCache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }, [cacheKey]);

  // Set data in cache
  const setCachedData = useCallback((data: T) => {
    if (!cacheKey) return;
    
    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });
  }, [cacheKey, cacheTTL]);

  // Core fetch function
  const performFetch = useCallback(async (isRetry = false): Promise<T> => {
    const startTime = performance.now();
    
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const data = await fetchFnRef.current();
      const duration = performance.now() - startTime;

      // Log performance
      logPerformance(`Async resource fetch completed`, duration, {
        component: 'useAsyncResource',
        action: 'fetch',
        metadata: { isRetry, cacheKey },
      });

      if (!isMountedRef.current) return data;

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        retryCount: 0,
        isStale: false,
      }));

      // Cache the data
      setCachedData(data);

      // Call success callback
      onSuccess?.(data);

      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (!isMountedRef.current) throw error;

      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Log error
      logErrorWithError(errorObj, {
        component: 'useAsyncResource',
        action: 'fetch',
        metadata: { isRetry, cacheKey, duration },
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj,
      }));

      // Call error callback
      onError?.(errorObj);

      throw errorObj;
    }
  }, [cacheKey, onSuccess, onError, setCachedData]);

  // Fetch with retry logic
  const fetchWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          // Log retry attempt
          logUserAction('Async resource retry attempt', {
            component: 'useAsyncResource',
            action: 'retry',
            metadata: { attempt, maxAttempts: retryAttempts + 1, cacheKey },
          });
          
          onRetry?.(attempt);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
        
        return await performFetch(attempt > 0);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === retryAttempts) {
          setState(prev => ({
            ...prev,
            retryCount: attempt,
          }));
          break;
        }
      }
    }
    
    throw lastError;
  }, [retryAttempts, retryDelay, performFetch, onRetry, cacheKey]);

  // Initial fetch
  const fetch = useCallback(async (): Promise<T> => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setState(prev => ({
        ...prev,
        data: cachedData,
        isStale: checkStaleness(prev.lastFetch),
      }));
    }

    return fetchWithRetry();
  }, [getCachedData, fetchWithRetry, checkStaleness]);

  // Refetch (ignores cache)
  const refetch = useCallback(async (): Promise<T> => {
    return fetchWithRetry();
  }, [fetchWithRetry]);

  // Retry last failed fetch
  const retry = useCallback(async (): Promise<T> => {
    return fetchWithRetry();
  }, [fetchWithRetry]);

  // Optimistic update
  const mutate = useCallback((data: T) => {
    if (!optimisticUpdates) return;
    
    setState(prev => ({
      ...prev,
      data,
    }));
    
    setCachedData(data);
  }, [optimisticUpdates, setCachedData]);

  // Manual data set
  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
      isStale: false,
    }));
    
    setCachedData(data);
  }, [setCachedData]);

  // Manual error set
  const setError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  // Manual loading set
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading,
    }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastFetch: null,
      retryCount: 0,
      isStale: false,
    });
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Background refresh
  useEffect(() => {
    if (!backgroundRefresh || !state.data) return;

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        refetch().catch(() => {
          // Background refresh errors are silent
        });
      }
    }, backgroundRefreshInterval);

    return () => clearInterval(interval);
  }, [backgroundRefresh, backgroundRefreshInterval, refetch, state.data]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isMountedRef.current && state.data && checkStaleness(state.lastFetch)) {
        refetch().catch(() => {
          // Silent refetch on focus
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, refetch, state.data, state.lastFetch, checkStaleness]);

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      if (isMountedRef.current && state.data) {
        refetch().catch(() => {
          // Silent refetch on reconnect
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, refetch, state.data]);

  // Actions object
  const actions = useMemo<AsyncResourceActions<T>>(() => ({
    fetch,
    refetch,
    mutate,
    reset,
    retry,
    setData,
    setError,
    setLoading,
  }), [fetch, refetch, mutate, reset, retry, setData, setError, setLoading]);

  return [state, actions];
};

// Utility hook for common patterns
export const useAsyncResourceWithFilters = <T, F>(
  fetchFn: (filters: F) => Promise<T>,
  initialFilters: F,
  config: AsyncResourceConfig<T> = {}
) => {
  const [filters, setFilters] = useState<F>(initialFilters);
  
  const fetchWithFilters = useCallback(() => fetchFn(filters), [fetchFn, filters]);
  
  const [state, actions] = useAsyncResource(fetchWithFilters, {
    ...config,
    cacheKey: config.cacheKey ? `${config.cacheKey}-${JSON.stringify(filters)}` : undefined,
  });

  const updateFilters = useCallback((newFilters: Partial<F>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    ...state,
    ...actions,
    filters,
    updateFilters,
    resetFilters,
  };
};