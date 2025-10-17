/**
 * World-Class Performance Monitoring Hook
 * 
 * Features:
 * - Automatic performance measurement
 * - Memory usage tracking
 * - Render performance monitoring
 * - Custom metrics collection
 * - Performance alerts
 * - Integration with logging system
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { logPerformance, logWarn, LogContext } from '../utils/logger';

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  customMetrics: Record<string, number>;
  timestamp: number;
}

export interface PerformanceConfig {
  enableMemoryTracking?: boolean;
  enableRenderTracking?: boolean;
  performanceThreshold?: number; // ms
  memoryThreshold?: number; // MB
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface PerformanceAlert {
  type: 'render' | 'memory' | 'custom';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enableMemoryTracking: true,
  enableRenderTracking: true,
  performanceThreshold: 100, // 100ms
  memoryThreshold: 50, // 50MB
  logLevel: 'warn',
};

export const usePerformance = (
  componentName: string,
  config: PerformanceConfig = {}
) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const renderStartTime = useRef<number>(0);
  const customMetrics = useRef<Record<string, number>>({});
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const renderCount = useRef(0);

  // Track render start
  useEffect(() => {
    if (mergedConfig.enableRenderTracking) {
      renderStartTime.current = performance.now();
      renderCount.current += 1;
    }
  });

  // Track render end and performance
  useEffect(() => {
    if (mergedConfig.enableRenderTracking && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log performance
      const context: LogContext = {
        component: componentName,
        action: 'render',
        metadata: {
          renderTime,
          renderCount: renderCount.current,
        },
      };

      if (renderTime > mergedConfig.performanceThreshold) {
        logWarn(`Slow render detected in ${componentName}`, context);
        
        // Add alert
        setAlerts(prev => [...prev, {
          type: 'render',
          message: `Slow render: ${renderTime.toFixed(2)}ms`,
          value: renderTime,
          threshold: mergedConfig.performanceThreshold,
          timestamp: Date.now(),
        }]);
      } else {
        logPerformance(`Render completed in ${componentName}`, renderTime, context);
      }
    }
  });

  // Memory tracking
  useEffect(() => {
    if (mergedConfig.enableMemoryTracking && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        
        const context: LogContext = {
          component: componentName,
          action: 'memory',
          metadata: {
            memoryUsageMB,
            totalJSHeapSize: memoryInfo.totalJSHeapSize / (1024 * 1024),
            jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
          },
        };

        if (memoryUsageMB > mergedConfig.memoryThreshold) {
          logWarn(`High memory usage detected in ${componentName}`, context);
          
          // Add alert
          setAlerts(prev => [...prev, {
            type: 'memory',
            message: `High memory usage: ${memoryUsageMB.toFixed(2)}MB`,
            value: memoryUsageMB,
            threshold: mergedConfig.memoryThreshold,
            timestamp: Date.now(),
          }]);
        } else {
          logPerformance(`Memory usage in ${componentName}`, memoryUsageMB, context);
        }
      }
    }
  }, [componentName, mergedConfig.enableMemoryTracking, mergedConfig.memoryThreshold]);

  // Custom metric tracking
  const trackMetric = useCallback((name: string, value: number) => {
    customMetrics.current[name] = value;
    
    const context: LogContext = {
      component: componentName,
      action: 'custom_metric',
      metadata: {
        metricName: name,
        metricValue: value,
      },
    };

    logPerformance(`Custom metric: ${name}`, value, context);
  }, [componentName]);

  // Time a function execution
  const timeFunction = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const duration = performance.now() - start;
      
      trackMetric(`${name}_duration`, duration);
      
      return result;
    }) as T;
  }, [trackMetric]);

  // Time an async function execution
  const timeAsyncFunction = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string
  ): T => {
    return (async (...args: Parameters<T>) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        trackMetric(`${name}_duration`, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        trackMetric(`${name}_error_duration`, duration);
        throw error;
      }
    }) as T;
  }, [trackMetric]);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    const memoryInfo = (performance as any).memory;
    return {
      renderTime: renderStartTime.current > 0 ? performance.now() - renderStartTime.current : 0,
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / (1024 * 1024) : undefined,
      customMetrics: { ...customMetrics.current },
      timestamp: Date.now(),
    };
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Clear custom metrics
  const clearMetrics = useCallback(() => {
    customMetrics.current = {};
  }, []);

  return {
    trackMetric,
    timeFunction,
    timeAsyncFunction,
    getMetrics,
    alerts,
    clearAlerts,
    clearMetrics,
    renderCount: renderCount.current,
  };
};

// Hook for measuring component mount/unmount performance
export const useMountPerformance = (componentName: string) => {
  const mountTime = useRef<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    mountTime.current = performance.now();
    setIsMounted(true);
    
    return () => {
      const unmountTime = performance.now();
      const mountDuration = unmountTime - mountTime.current;
      
      logPerformance(`Component ${componentName} lifecycle`, mountDuration, {
        component: componentName,
        action: 'lifecycle',
        metadata: {
          mountDuration,
          isMounted,
        },
      });
    };
  }, [componentName, isMounted]);

  return { isMounted, mountTime: mountTime.current };
};