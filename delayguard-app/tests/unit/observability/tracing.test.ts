/**
 * Comprehensive test suite for observability tracing
 * 
 * Testing Strategy:
 * - Test tracer initialization
 * - Test span creation and management
 * - Test metrics collection
 * - Test HTTP middleware integration
 * - Test database query tracing
 * - Test business logic tracing
 */

import {
  getTracer,
  getMeter,
  traceHttpRequest,
  traceDatabaseQuery,
  traceBusinessLogic,
  delayGuardMetrics,
  withSpan,
} from '../../../src/observability/tracing';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Observability Tracing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTracer', () => {
    it('should return a tracer instance', () => {
      const tracer = getTracer('test-tracer');
      
      expect(tracer).toBeDefined();
      expect(typeof tracer.startSpan).toBe('function');
    });

    it('should accept tracer name', () => {
      const tracer1 = getTracer('tracer-1');
      const tracer2 = getTracer('tracer-2');
      
      expect(tracer1).toBeDefined();
      expect(tracer2).toBeDefined();
    });

    it('should create spans', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(span).toBeDefined();
      expect(typeof span.setStatus).toBe('function');
      expect(typeof span.setAttributes).toBe('function');
      expect(typeof span.end).toBe('function');
    });
  });

  describe('Span Operations', () => {
    it('should set span status', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(() => {
        span.setStatus({ code: 0 });
      }).not.toThrow();
    });

    it('should set span status with message', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(() => {
        span.setStatus({ code: 2, message: 'Error occurred' });
      }).not.toThrow();
    });

    it('should set span attributes', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(() => {
        span.setAttributes({ userId: '123', action: 'test' });
      }).not.toThrow();
    });

    it('should end span', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(() => {
        span.end();
      }).not.toThrow();
    });

    it('should handle complete span lifecycle', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      span.setAttributes({ method: 'GET', path: '/api/test' });
      span.setStatus({ code: 1, message: 'Success' });
      span.end();
      
      expect(span).toBeDefined();
    });
  });

  describe('getMeter', () => {
    it('should return a meter instance', () => {
      const meter = getMeter('test-meter');
      
      expect(meter).toBeDefined();
      expect(typeof meter.createCounter).toBe('function');
      expect(typeof meter.createHistogram).toBe('function');
    });

    it('should create counter', () => {
      const meter = getMeter('test-meter');
      const counter = meter.createCounter('test-counter');
      
      expect(counter).toBeDefined();
      expect(typeof counter.add).toBe('function');
    });

    it('should create histogram', () => {
      const meter = getMeter('test-meter');
      const histogram = meter.createHistogram('test-histogram');
      
      expect(histogram).toBeDefined();
      expect(typeof histogram.record).toBe('function');
    });

    it('should increment counter', () => {
      const meter = getMeter('test-meter');
      const counter = meter.createCounter('requests');
      
      expect(() => {
        counter.add(1, { endpoint: '/api/test' });
      }).not.toThrow();
    });

    it('should record histogram values', () => {
      const meter = getMeter('test-meter');
      const histogram = meter.createHistogram('request-duration');
      
      expect(() => {
        histogram.record(150, { endpoint: '/api/test' });
      }).not.toThrow();
    });
  });

  describe('traceHttpRequest', () => {
    it('should call next middleware', async() => {
      const mockCtx = {
        method: 'GET',
        path: '/api/test',
        url: '/api/test',
        status: 200,
        get: jest.fn().mockReturnValue('test-agent'),
      };
      const mockNext = jest.fn();

      await traceHttpRequest(mockCtx as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and rethrow', async() => {
      const mockCtx = {
        method: 'GET',
        path: '/api/test',
        url: '/api/test',
        status: 500,
        get: jest.fn().mockReturnValue('test-agent'),
      };
      const mockNext = jest.fn(() => {
        throw new Error('Test error');
      });

      await expect(traceHttpRequest(mockCtx as any, mockNext)).rejects.toThrow('Test error');
    });

    it('should trace successful requests', async() => {
      const mockCtx = {
        method: 'POST',
        path: '/api/orders',
        url: '/api/orders',
        status: 201,
        get: jest.fn().mockReturnValue('test-agent'),
      };
      const mockNext = jest.fn();

      await traceHttpRequest(mockCtx as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should trace requests with error status', async() => {
      const mockCtx = {
        method: 'GET',
        path: '/api/notfound',
        url: '/api/notfound',
        status: 404,
        get: jest.fn().mockReturnValue('test-agent'),
      };
      const mockNext = jest.fn();

      await traceHttpRequest(mockCtx as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should trace different HTTP methods', async() => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const mockNext = jest.fn();

      for (const method of methods) {
        const mockCtx = {
          method,
          path: '/api/test',
          url: '/api/test',
          status: 200,
          get: jest.fn().mockReturnValue('test-agent'),
        };

        await traceHttpRequest(mockCtx as any, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe('traceDatabaseQuery', () => {
    it('should return a span for database query', () => {
      const span = traceDatabaseQuery('SELECT * FROM users');
      
      expect(span).toBeDefined();
      expect(typeof span.setStatus).toBe('function');
      expect(typeof span.end).toBe('function');
    });

    it('should trace query with parameters', () => {
      const span = traceDatabaseQuery('SELECT * FROM users WHERE id = $1', [123]);
      
      expect(span).toBeDefined();
    });

    it('should allow ending the span', () => {
      const span = traceDatabaseQuery('INSERT INTO logs VALUES ($1, $2)', ['info', 'test']);
      
      expect(() => {
        span.end();
      }).not.toThrow();
    });

    it('should handle different SQL operations', () => {
      const operations = [
        'SELECT * FROM users',
        'INSERT INTO users (name) VALUES ($1)',
        'UPDATE users SET name = $1 WHERE id = $2',
        'DELETE FROM users WHERE id = $1',
      ];

      for (const query of operations) {
        const span = traceDatabaseQuery(query);
        expect(span).toBeDefined();
        span.end();
      }
    });
  });

  describe('traceBusinessLogic', () => {
    it('should return a span for business operation', () => {
      const span = traceBusinessLogic('process-order');
      
      expect(span).toBeDefined();
      expect(typeof span.setStatus).toBe('function');
      expect(typeof span.end).toBe('function');
    });

    it('should trace operation with data', () => {
      const span = traceBusinessLogic('send-notification', {
        userId: '123',
        type: 'email',
      });
      
      expect(span).toBeDefined();
    });

    it('should allow setting status', () => {
      const span = traceBusinessLogic('calculate-shipping');
      
      expect(() => {
        span.setStatus({ code: 1 });
        span.end();
      }).not.toThrow();
    });

    it('should handle various business operations', () => {
      const operations = [
        'validate-input',
        'check-permissions',
        'process-payment',
        'update-inventory',
        'send-email',
      ];

      for (const operation of operations) {
        const span = traceBusinessLogic(operation);
        expect(span).toBeDefined();
        span.end();
      }
    });
  });

  describe('withSpan', () => {
    it('should execute function within span', () => {
      const tracer = getTracer('test');
      const span = tracer.startSpan('test-operation');
      const mockFn = jest.fn().mockReturnValue('result');
      
      const result = withSpan(span, mockFn);
      
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should handle function errors', () => {
      const tracer = getTracer('test');
      const span = tracer.startSpan('test-operation');
      const mockFn = jest.fn(() => {
        throw new Error('Function failed');
      });
      
      expect(() => withSpan(span, mockFn)).toThrow('Function failed');
    });

    it('should work with functions returning objects', () => {
      const tracer = getTracer('test');
      const span = tracer.startSpan('test-operation');
      const mockFn = jest.fn().mockReturnValue({ id: 123, name: 'test' });
      
      const result = withSpan(span, mockFn);
      
      expect(result).toEqual({ id: 123, name: 'test' });
    });
  });

  describe('delayGuardMetrics', () => {
    it('should increment counter', () => {
      expect(() => {
        delayGuardMetrics.incrementCounter('requests', 1);
      }).not.toThrow();
    });

    it('should increment counter with attributes', () => {
      expect(() => {
        delayGuardMetrics.incrementCounter('requests', 1, {
          endpoint: '/api/test',
          method: 'GET',
        });
      }).not.toThrow();
    });

    it('should record histogram value', () => {
      expect(() => {
        delayGuardMetrics.recordHistogram('response-time', 150);
      }).not.toThrow();
    });

    it('should record histogram with attributes', () => {
      expect(() => {
        delayGuardMetrics.recordHistogram('response-time', 150, {
          endpoint: '/api/orders',
        });
      }).not.toThrow();
    });

    it('should update gauge', () => {
      expect(() => {
        delayGuardMetrics.updateGauge('active-connections', 42);
      }).not.toThrow();
    });

    it('should update gauge with attributes', () => {
      expect(() => {
        delayGuardMetrics.updateGauge('queue-size', 100, {
          queue: 'email',
        });
      }).not.toThrow();
    });

    it('should record API response time', () => {
      expect(() => {
        delayGuardMetrics.recordApiResponseTime('/api/orders', 125, {
          method: 'GET',
          status: 200,
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle span creation with options', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation', {
        attributes: { userId: '123' },
      });
      
      expect(span).toBeDefined();
    });

    it('should handle empty attributes', () => {
      const tracer = getTracer('test-tracer');
      const span = tracer.startSpan('test-operation');
      
      expect(() => {
        span.setAttributes({});
      }).not.toThrow();
    });

    it('should handle counter with zero value', () => {
      expect(() => {
        delayGuardMetrics.incrementCounter('test', 0);
      }).not.toThrow();
    });

    it('should handle database query without parameters', () => {
      const span = traceDatabaseQuery('SELECT 1');
      
      expect(span).toBeDefined();
      span.end();
    });

    it('should handle business logic without data', () => {
      const span = traceBusinessLogic('simple-operation');
      
      expect(span).toBeDefined();
      span.end();
    });

    it('should handle middleware with unknown user agent', async() => {
      const mockCtx = {
        method: 'GET',
        path: '/api/test',
        url: '/api/test',
        status: 200,
        get: jest.fn().mockReturnValue(''),
      };
      const mockNext = jest.fn();

      await traceHttpRequest(mockCtx as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent traces', async() => {
      const promises = [];
      const mockNext = jest.fn();

      for (let i = 0; i < 10; i++) {
        const mockCtx = {
          method: 'GET',
          path: `/api/test/${i}`,
          url: `/api/test/${i}`,
          status: 200,
          get: jest.fn().mockReturnValue('test-agent'),
        };
        promises.push(traceHttpRequest(mockCtx as any, mockNext));
      }

      await Promise.all(promises);

      expect(mockNext).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid span creation', () => {
      const tracer = getTracer('test-tracer');
      const spans = [];

      for (let i = 0; i < 100; i++) {
        const span = tracer.startSpan(`operation-${i}`);
        spans.push(span);
      }

      expect(spans).toHaveLength(100);
      
      spans.forEach(span => span.end());
    });

    it('should handle rapid metric updates', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          delayGuardMetrics.incrementCounter('requests', 1);
        }
      }).not.toThrow();
    });
  });
});
