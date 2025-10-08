/**
 * OpenTelemetry Tracing Configuration
 * Provides distributed tracing across the DelayGuard application
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, metrics, context } from '@opentelemetry/api';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Service configuration
const SERVICE_NAME = 'delayguard-api';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Jaeger configuration
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9464');

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeTracing(): NodeSDK {
  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'delayguard',
  });

  // Jaeger exporter for traces
  const jaegerExporter = new JaegerExporter({
    endpoint: JAEGER_ENDPOINT,
  });

  // Prometheus exporter for metrics
  const prometheusExporter = new PrometheusExporter({
    port: PROMETHEUS_PORT,
    endpoint: '/metrics',
  });

  // Create SDK instance
  const sdk = new NodeSDK({
    resource,
    traceExporter: jaegerExporter,
    spanProcessor: new BatchSpanProcessor(jaegerExporter),
    metricReader: new PeriodicExportingMetricReader({
      exporter: prometheusExporter,
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable file system instrumentation to reduce noise
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // Enable HTTP instrumentation
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.headers.user-agent': request.getHeader('user-agent') as string,
              'http.request.headers.content-type': request.getHeader('content-type') as string,
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.headers.content-type': response.getHeader('content-type') as string,
              'http.response.headers.content-length': response.getHeader('content-length') as string,
            });
          },
        },
        // Enable Express/Koa instrumentation
        '@opentelemetry/instrumentation-express': { enabled: true },
        // Enable PostgreSQL instrumentation
        '@opentelemetry/instrumentation-pg': { enabled: true },
        // Enable Redis instrumentation
        '@opentelemetry/instrumentation-redis': { enabled: true },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log(`OpenTelemetry tracing initialized for ${SERVICE_NAME} v${SERVICE_VERSION}`);
  console.log(`Jaeger endpoint: ${JAEGER_ENDPOINT}`);
  console.log(`Prometheus metrics: http://localhost:${PROMETHEUS_PORT}/metrics`);

  return sdk;
}

/**
 * Get tracer instance for custom instrumentation
 */
export function getTracer(name: string = SERVICE_NAME) {
  return trace.getTracer(name, SERVICE_VERSION);
}

/**
 * Get meter instance for custom metrics
 */
export function getMeter(name: string = SERVICE_NAME) {
  return metrics.getMeter(name, SERVICE_VERSION);
}

/**
 * Create a custom span for business logic
 */
export function createSpan(name: string, attributes?: Record<string, any>) {
  const tracer = getTracer();
  const span = tracer.startSpan(name);
  
  if (attributes) {
    span.setAttributes(attributes);
  }
  
  return span;
}

/**
 * Execute function within a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR status
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Business metrics for DelayGuard
 */
export class DelayGuardMetrics {
  private meter: any;
  private delayCounter: any;
  private notificationCounter: any;
  private apiResponseTime: any;
  private errorCounter: any;
  private queueSize: any;

  constructor() {
    this.meter = getMeter('delayguard-business');
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Counter for delays detected
    this.delayCounter = this.meter.createCounter('delays_detected_total', {
      description: 'Total number of shipping delays detected',
    });

    // Counter for notifications sent
    this.notificationCounter = this.meter.createCounter('notifications_sent_total', {
      description: 'Total number of notifications sent',
    });

    // Histogram for API response times
    this.apiResponseTime = this.meter.createHistogram('api_response_time_seconds', {
      description: 'API response time in seconds',
      unit: 's',
    });

    // Counter for errors
    this.errorCounter = this.meter.createCounter('errors_total', {
      description: 'Total number of errors',
    });

    // Gauge for queue size
    this.queueSize = this.meter.createUpDownCounter('queue_size', {
      description: 'Current size of processing queue',
    });
  }

  /**
   * Record a delay detection
   */
  recordDelayDetected(carrier: string, delayDays: number) {
    this.delayCounter.add(1, {
      carrier,
      delay_days: delayDays.toString(),
    });
  }

  /**
   * Record a notification sent
   */
  recordNotificationSent(type: 'email' | 'sms', success: boolean) {
    this.notificationCounter.add(1, {
      type,
      success: success.toString(),
    });
  }

  /**
   * Record API response time
   */
  recordApiResponseTime(endpoint: string, duration: number) {
    this.apiResponseTime.record(duration, {
      endpoint,
    });
  }

  /**
   * Record an error
   */
  recordError(service: string, errorType: string) {
    this.errorCounter.add(1, {
      service,
      error_type: errorType,
    });
  }

  /**
   * Update queue size
   */
  updateQueueSize(size: number) {
    this.queueSize.add(size);
  }
}

/**
 * Middleware for automatic request tracing
 */
export function tracingMiddleware() {
  return async (ctx: any, next: any) => {
    const tracer = getTracer();
    
    return tracer.startActiveSpan(`HTTP ${ctx.method} ${ctx.path}`, async (span) => {
      try {
        // Set span attributes
        span.setAttributes({
          'http.method': ctx.method,
          'http.url': ctx.url,
          'http.route': ctx.route?.path || ctx.path,
          'http.user_agent': ctx.get('user-agent'),
          'http.request_id': ctx.get('x-request-id'),
        });

        // Record start time
        const startTime = Date.now();
        
        // Execute request
        await next();
        
        // Record response attributes
        const duration = (Date.now() - startTime) / 1000;
        span.setAttributes({
          'http.status_code': ctx.status,
          'http.response_time': duration,
        });

        // Set span status
        if (ctx.status >= 400) {
          span.setStatus({ code: 2, message: `HTTP ${ctx.status}` });
        } else {
          span.setStatus({ code: 1 }); // OK
        }

        // Record metrics
        const metrics = new DelayGuardMetrics();
        metrics.recordApiResponseTime(ctx.path, duration);
        
        if (ctx.status >= 400) {
          metrics.recordError('api', `http_${ctx.status}`);
        }

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  };
}

/**
 * Database operation tracing
 */
export function traceDatabaseOperation<T>(
  operation: string,
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`db.${operation}`, async (span) => {
    span.setAttributes({
      'db.operation': operation,
      'db.statement': query,
      'db.system': 'postgresql',
    });

    return await fn();
  });
}

/**
 * External API call tracing
 */
export function traceExternalApi<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`external.${service}`, async (span) => {
    span.setAttributes({
      'external.service': service,
      'external.endpoint': endpoint,
    });

    return await fn();
  });
}

/**
 * Queue operation tracing
 */
export function traceQueueOperation<T>(
  operation: string,
  queueName: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`queue.${operation}`, async (span) => {
    span.setAttributes({
      'queue.operation': operation,
      'queue.name': queueName,
    });

    return await fn();
  });
}

// Export singleton metrics instance
export const delayGuardMetrics = new DelayGuardMetrics();

// Export tracing utilities
export {
  trace,
  metrics,
  context,
  getTracer,
  getMeter,
  createSpan,
  withSpan,
};
