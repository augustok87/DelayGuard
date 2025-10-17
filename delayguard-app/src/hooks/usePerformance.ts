import { useEffect, useRef, useCallback } from 'react';
import { logInfo, logError } from '../utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  memoryUsage?: number;
  fps?: number;
}

interface UsePerformanceOptions {
  trackRenderTime?: boolean;
  trackMemoryUsage?: boolean;
  trackFPS?: boolean;
  logToConsole?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const usePerformance = (
  componentName: string,
  options: UsePerformanceOptions = {},
) => {
  const {
    trackRenderTime = true,
    trackMemoryUsage = false,
    trackFPS = false,
    logToConsole = false,
    onMetricsUpdate,
  } = options;

  const mountTimeRef = useRef<number>(0);
  const renderStartTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const totalMountTime = performance.now() - mountTimeRef.current;
      if (logToConsole) {
        logInfo(`${componentName} total mount time: ${totalMountTime.toFixed(2)}ms`, { 
          component: 'usePerformance', 
          action: 'mount',
          metadata: { componentName, totalMountTime }, 
        });
      }
    };
  }, [componentName, logToConsole]);

  // Track memory usage
  useEffect(() => {
    if (!trackMemoryUsage) return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        if (logToConsole) {
          logInfo(`${componentName} memory usage: ${memoryUsage.toFixed(2)}MB`, { 
            component: 'usePerformance', 
            action: 'memory',
            metadata: { componentName, memoryUsage }, 
          });
        }

        if (onMetricsUpdate) {
          onMetricsUpdate({
            renderTime: 0,
            componentMountTime: 0,
            memoryUsage,
          });
        }
      }
    };

    // Check memory immediately and then periodically
    checkMemory();
    const interval = setInterval(checkMemory, 100);
    
    return () => clearInterval(interval);
  }, [componentName, trackMemoryUsage, logToConsole, onMetricsUpdate]);

  // Track render time
  const trackRender = useCallback(() => {
    if (!trackRenderTime) return;

    renderStartTimeRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTimeRef.current;
      
      const metrics: PerformanceMetrics = {
        renderTime,
        componentMountTime: performance.now() - mountTimeRef.current,
      };

      if (trackMemoryUsage && 'memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      if (logToConsole) {
        logInfo(`${componentName} render time: ${renderTime.toFixed(2)}ms`, { 
          component: 'usePerformance', 
          action: 'render',
          metadata: { componentName, renderTime }, 
        });
      }

      if (onMetricsUpdate) {
        onMetricsUpdate(metrics);
      }
    };
  }, [componentName, trackRenderTime, trackMemoryUsage, logToConsole, onMetricsUpdate]);

  // Track FPS
  useEffect(() => {
    if (!trackFPS) return;

    const measureFPS = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        
        if (logToConsole) {
          logInfo(`${componentName} FPS: ${fps}`, { 
            component: 'usePerformance', 
            action: 'fps',
            metadata: { componentName, fps }, 
          });
        }

        if (onMetricsUpdate) {
          onMetricsUpdate({
            renderTime: 0,
            componentMountTime: 0,
            fps,
          });
        }

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [componentName, trackFPS, logToConsole, onMetricsUpdate]);

  return {
    trackRender: () => trackRender(),
  };
};

// Hook for measuring component performance
export const useComponentPerformance = (
  componentName: string,
  dependencies: unknown[] = [],
) => {
  const { trackRender } = usePerformance(componentName, {
    trackRenderTime: true,
    logToConsole: true, // Always log in tests
  });

  useEffect(() => {
    const cleanup = trackRender();
    return cleanup;
  }, dependencies);

  return trackRender;
};

// Hook for measuring async operations
export const useAsyncPerformance = () => {
  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logInfo(`${operationName} completed in ${duration.toFixed(2)}ms`, { 
        component: 'usePerformance', 
        action: 'operation',
        metadata: { operationName, duration }, 
      });
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logError(error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined, { 
        component: 'usePerformance', 
        action: 'operation',
        metadata: { operationName, duration }, 
      });
      throw error;
    }
  }, []);

  return { measureAsync };
};

// Hook for measuring bundle size impact
export const useBundleSize = () => {
  const measureBundleSize = useCallback((componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        logInfo(`${componentName} bundle load time: ${loadTime.toFixed(2)}ms`, { 
          component: 'usePerformance', 
          action: 'bundle',
          metadata: { componentName, loadTime }, 
        });
      };
    }
    
    return () => {};
  }, []);

  return { measureBundleSize };
};
