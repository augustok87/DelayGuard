// Observability tracing with dynamic span management
import { logger } from "../utils/logger";
import { Context, Next } from "koa";

/**
 * Simplified Tracing Configuration
 * Provides basic tracing functionality for the DelayGuard application
 * Note: Full OpenTelemetry setup is complex and requires additional configuration
 * The interfaces below mirror @opentelemetry/api's Counter / Histogram / Attributes
 * surface so the mock can be swapped for a real OTEL implementation without
 * changing call sites.
 */

// Service configuration
const SERVICE_NAME = "delayguard-api";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";

// Minimal OTEL-shaped types (no @opentelemetry/api dep — would be overkill for the mock).
type Attributes = Record<string, unknown>;
type SpanOptions = Record<string, unknown>;
type InstrumentOptions = Record<string, unknown>;

interface Counter {
  add(value: number, attributes?: Attributes): void;
}

interface Histogram {
  record(value: number, attributes?: Attributes): void;
}

// Simple tracing interface
interface Span {
  setStatus(status: { code: number; message?: string }): void;
  setAttributes(attributes: Attributes): void;
  end(): void;
}

interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
}

interface Meter {
  createCounter(name: string, options?: InstrumentOptions): Counter;
  createHistogram(name: string, options?: InstrumentOptions): Histogram;
}

// Mock implementations for development
class MockSpan implements Span {
  setStatus(status: { code: number; message?: string }): void {
    logger.info(`[TRACE] Span status: ${status.code} ${status.message || ""}`);
  }

  setAttributes(attributes: Attributes): void {
    logger.info(`[TRACE] Span attributes:`, attributes);
  }

  end(): void {
    logger.info(`[TRACE] Span ended`);
  }
}

class MockTracer implements Tracer {
  startSpan(name: string, options?: SpanOptions): Span {
    logger.info(`[TRACE] Starting span: ${name}`, options);
    return new MockSpan();
  }
}

class MockMeter implements Meter {
  createCounter(name: string, options?: InstrumentOptions): Counter {
    logger.info(`[METRICS] Creating counter: ${name}`, options);
    return {
      add: (value: number, attributes?: Attributes) => {
        logger.info(`[METRICS] Counter ${name}: +${value}`, attributes);
      },
    };
  }

  createHistogram(name: string, options?: InstrumentOptions): Histogram {
    logger.info(`[METRICS] Creating histogram: ${name}`, options);
    return {
      record: (value: number, attributes?: Attributes) => {
        logger.info(`[METRICS] Histogram ${name}: ${value}`, attributes);
      },
    };
  }
}

// Export mock implementations
export const getTracer = (name: string): Tracer => {
  logger.info(`[TRACE] Getting tracer: ${name}`);
  return new MockTracer();
};

export const getMeter = (name: string): Meter => {
  logger.info(`[METRICS] Getting meter: ${name}`);
  return new MockMeter();
};

export const createSpan = (
  tracer: Tracer,
  name: string,
  options?: SpanOptions,
): Span => {
  return tracer.startSpan(name, options);
};

export const withSpan = <T>(span: Span, fn: () => T): T => {
  try {
    const result = fn();
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.setStatus({
      code: 2,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    span.end();
  }
};

// Initialize tracing (simplified)
export async function initializeTracing(): Promise<void> {
  logger.info(
    `[TRACE] Initializing tracing for ${SERVICE_NAME} v${SERVICE_VERSION} in ${ENVIRONMENT}`,
  );

  // In a real implementation, this would set up OpenTelemetry
  // For now, we just log that tracing is initialized
  logger.info("[TRACE] Tracing initialized (mock mode)");
}

// Shutdown tracing
export async function shutdownTracing(): Promise<void> {
  logger.info("[TRACE] Shutting down tracing");
}

// HTTP request tracing middleware for Koa
export async function traceHttpRequest(
  ctx: Context,
  next: Next,
): Promise<void> {
  const tracer = getTracer("http");
  const span = tracer.startSpan(`${ctx.method} ${ctx.path}`);

  span.setAttributes({
    "http.method": ctx.method,
    "http.url": ctx.url,
    "http.user_agent": ctx.get("User-Agent") || "unknown",
  });

  try {
    await next();

    span.setAttributes({
      "http.status_code": ctx.status,
    });

    if (ctx.status >= 400) {
      span.setStatus({ code: 2, message: `HTTP ${ctx.status}` });
    } else {
      span.setStatus({ code: 1 });
    }
  } catch (error) {
    span.setStatus({
      code: 2,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    span.end();
  }
}

// Database query tracing
export function traceDatabaseQuery(query: string, params?: unknown[]): Span {
  const tracer = getTracer("database");
  const span = tracer.startSpan("db.query");

  span.setAttributes({
    "db.statement": query,
    "db.parameters": params ? JSON.stringify(params) : undefined,
  });

  return span;
}

// Business logic tracing
export function traceBusinessLogic(
  operation: string,
  data?: Attributes,
): Span {
  const tracer = getTracer("business");
  const span = tracer.startSpan(operation);

  if (data) {
    span.setAttributes({
      "business.operation": operation,
      "business.data": JSON.stringify(data),
    });
  }

  return span;
}

// Mock metrics object
export const delayGuardMetrics = {
  incrementCounter: (
    name: string,
    value: number = 1,
    attributes?: Attributes,
  ) => {
    logger.info(`[METRICS] Counter ${name}: +${value}`, attributes);
  },
  recordHistogram: (
    name: string,
    value: number,
    attributes?: Attributes,
  ) => {
    logger.info(`[METRICS] Histogram ${name}: ${value}`, attributes);
  },
  updateGauge: (
    name: string,
    value: number,
    attributes?: Attributes,
  ) => {
    logger.info(`[METRICS] Gauge ${name}: ${value}`, attributes);
  },
  recordApiResponseTime: (
    endpoint: string,
    responseTime: number,
    attributes?: Attributes,
  ) => {
    logger.info(
      `[METRICS] API Response Time ${endpoint}: ${responseTime}ms`,
      attributes,
    );
  },
  updateQueueSize: (
    queueName: string,
    size: number,
    attributes?: Attributes,
  ) => {
    logger.info(`[METRICS] Queue Size ${queueName}: ${size}`, attributes);
  },
};
