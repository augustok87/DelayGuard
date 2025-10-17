import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  memoryUsage?: number;
  fps?: number;
}
import { usePerformance } from '../../../hooks/usePerformance';
import styles from './PerformanceMonitor.module.css';

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  showMetrics?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  showMetrics = false,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { trackRender } = usePerformance(componentName, {
    trackRenderTime: true,
    trackMemoryUsage: true,
    trackFPS: true,
    logToConsole: enabled,
    onMetricsUpdate: (newMetrics) => {
      setMetrics(newMetrics);
      if (onMetricsUpdate) {
        onMetricsUpdate(newMetrics);
      }
    },
  });

  // Track render performance
  useEffect(() => {
    const cleanup = trackRender();
    return cleanup;
  }, [trackRender]);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    if (enabled) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [enabled]);

  if (!enabled || !showMetrics) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <div className={styles.header}>
              <h3>Performance Monitor</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setIsVisible(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.content}>
              <div className={styles.section}>
                <h4>Component: {componentName}</h4>
                {metrics && (
                  <>
                    <div className={styles.metric}>
                      <span className={styles.label}>Render Time:</span>
                      <span className={styles.value}>
                        {metrics.renderTime?.toFixed(2)}ms
                      </span>
                    </div>
                    
                    <div className={styles.metric}>
                      <span className={styles.label}>Mount Time:</span>
                      <span className={styles.value}>
                        {metrics.componentMountTime?.toFixed(2)}ms
                      </span>
                    </div>
                    
                    {metrics.memoryUsage && (
                      <div className={styles.metric}>
                        <span className={styles.label}>Memory Usage:</span>
                        <span className={styles.value}>
                          {metrics.memoryUsage.toFixed(2)}MB
                        </span>
                      </div>
                    )}
                    
                    {metrics.fps && (
                      <div className={styles.metric}>
                        <span className={styles.label}>FPS:</span>
                        <span className={styles.value}>
                          {metrics.fps}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className={styles.instructions}>
                <p>Press <kbd>Ctrl+Shift+P</kbd> to toggle this panel</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// HOC for adding performance monitoring to any component
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <>
        <Component {...props} />
        <PerformanceMonitor 
          componentName={componentName}
          enabled={process.env.NODE_ENV === 'development'}
          showMetrics={true}
        />
      </>
    );
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
