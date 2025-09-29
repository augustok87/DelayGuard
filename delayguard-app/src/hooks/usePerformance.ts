import { useEffect, useRef, useCallback } from 'react';

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
  options: UsePerformanceOptions = {}
) => {
  const {
    trackRenderTime = true,
    trackMemoryUsage = false,
    trackFPS = false,
    logToConsole = false,
    onMetricsUpdate
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
        console.log(`${componentName} total mount time: ${totalMountTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, logToConsole]);

  // Track render time
  const trackRender = useCallback(() => {
    if (!trackRenderTime) return;

    renderStartTimeRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTimeRef.current;
      
      const metrics: PerformanceMetrics = {
        renderTime,
        componentMountTime: performance.now() - mountTimeRef.current
      };

      if (trackMemoryUsage && 'memory' in performance) {
        const memory = (performance as any).memory;
        metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      if (logToConsole) {
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
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
          console.log(`${componentName} FPS: ${fps}`);
        }

        if (onMetricsUpdate) {
          onMetricsUpdate({
            renderTime: 0,
            componentMountTime: 0,
            fps
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
    trackRender: () => trackRender()
  };
};

// Hook for measuring component performance
export const useComponentPerformance = (
  componentName: string,
  dependencies: any[] = []
) => {
  const { trackRender } = usePerformance(componentName, {
    trackRenderTime: true,
    logToConsole: process.env.NODE_ENV === 'development'
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
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`${operationName} completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`${operationName} failed after ${duration.toFixed(2)}ms:`, error);
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
        
        console.log(`${componentName} bundle load time: ${loadTime.toFixed(2)}ms`);
      };
    }
    
    return () => {};
  }, []);

  return { measureBundleSize };
};
