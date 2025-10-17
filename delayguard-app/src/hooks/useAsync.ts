import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
  resetOnExecute?: boolean;
}

export const useAsync = <T, Args extends unknown[] = unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions = {},
) => {
  const { immediate = false, resetOnExecute = true } = options;
  
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async(...args: Args) => {
    if (!isMountedRef.current) return;

    if (resetOnExecute) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const result = await asyncFunction(...args);
      
      if (isMountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
        });
      }
      
      return result;
    } catch (error) {
      if (isMountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
      
      throw error;
    }
  }, [asyncFunction, resetOnExecute]);

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
  };
};

export const useAsyncCallback = <T extends (...args: unknown[]) => Promise<unknown>>(
  asyncFunction: T,
  deps: React.DependencyList = [],
) => {
  const [state, setState] = useState<UseAsyncState<Awaited<ReturnType<T>>>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async(...args: Parameters<T>) => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFunction(...args);
      
      if (isMountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
        });
      }
      
      return result;
    } catch (error) {
      if (isMountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('An unknown error occurred'),
        });
      }
      
      throw error;
    }
  }, [asyncFunction, ...deps]);

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};
