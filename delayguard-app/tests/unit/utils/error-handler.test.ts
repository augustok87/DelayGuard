/**
 * Comprehensive test suite for error-handler utility
 * 
 * Testing Strategy:
 * - Test all custom error classes
 * - Test error handling functions
 * - Test async/sync function wrapping
 * - Test error transformation and utilities
 * - Test error context preservation
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  handleError,
  withErrorHandling,
  withSyncErrorHandling,
  createSafeAsyncFunction,
  createSafeSyncFunction,
  unwrapResult,
  unwrapResultOrDefault,
  mapResult,
  chainResult,
  ErrorContext,
  ErrorResult,
} from '../../../src/utils/error-handler';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Handler Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError Class', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create AppError with custom values', () => {
      const context: ErrorContext = {
        component: 'TestComponent',
        action: 'testAction',
        userId: '123',
      };
      
      const error = new AppError(
        'Custom error',
        'CUSTOM_CODE',
        400,
        context,
        false,
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
      expect(error.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('Custom Error Classes', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create UnauthorizedError', () => {
      const error = new UnauthorizedError('Unauthorized access');
      
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create ForbiddenError', () => {
      const error = new ForbiddenError('Access forbidden');
      
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create ConflictError', () => {
      const error = new ConflictError('Resource conflict');
      
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });

    it('should create RateLimitError', () => {
      const error = new RateLimitError('Rate limit exceeded');
      
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create ExternalServiceError', () => {
      const error = new ExternalServiceError('External service failed', 'Shopify');
      
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.name).toBe('ExternalServiceError');
      expect(error.context.service).toBe('Shopify');
    });

  });

  describe('handleError', () => {
    it('should handle AppError and return error result', () => {
      const error = new ValidationError('Invalid input');
      const context: ErrorContext = { component: 'TestComponent' };
      
      const result = handleError(error, context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid input');
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.details?.statusCode).toBe(400);
      }
    });

    it('should handle regular Error', () => {
      const error = new Error('Regular error');
      const context: ErrorContext = { component: 'TestComponent' };
      
      const result = handleError(error, context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('An unexpected error occurred');
        expect(result.code).toBe('UNEXPECTED_ERROR');
      }
    });

    it('should handle string errors', () => {
      const result = handleError('String error');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('An unknown error occurred');
        expect(result.code).toBe('UNKNOWN_ERROR');
      }
    });

    it('should handle unknown errors', () => {
      const result = handleError({ unknown: 'object' });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('An unknown error occurred');
      }
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap async function and return success result', async() => {
      const asyncFn = async() => ({ id: '123', data: 'test' });
      const wrapped = withErrorHandling(asyncFn);
      
      const result = await wrapped();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', data: 'test' });
      }
    });

    it('should wrap async function and catch errors', async() => {
      const asyncFn = async() => {
        throw new ValidationError('Invalid data');
      };
      const wrapped = withErrorHandling(asyncFn);
      
      const result = await wrapped();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid data');
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should preserve function arguments', async() => {
      const asyncFn = async(a: number, b: number) => a + b;
      const wrapped = withErrorHandling(asyncFn);
      
      const result = await wrapped(5, 3);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(8);
      }
    });

    it('should include context in error', async() => {
      const asyncFn = async() => {
        throw new Error('Failed');
      };
      const context: ErrorContext = { component: 'TestComponent' };
      const wrapped = withErrorHandling(asyncFn, context);
      
      const result = await wrapped();
      
      expect(result.success).toBe(false);
    });
  });

  describe('withSyncErrorHandling', () => {
    it('should wrap sync function and return success result', () => {
      const syncFn = () => ({ id: '123', data: 'test' });
      const wrapped = withSyncErrorHandling(syncFn);
      
      const result = wrapped();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', data: 'test' });
      }
    });

    it('should wrap sync function and catch errors', () => {
      const syncFn = () => {
        throw new ValidationError('Invalid data');
      };
      const wrapped = withSyncErrorHandling(syncFn);
      
      const result = wrapped();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid data');
      }
    });

    it('should preserve function arguments', () => {
      const syncFn = (a: number, b: number) => a * b;
      const wrapped = withSyncErrorHandling(syncFn);
      
      const result = wrapped(4, 5);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(20);
      }
    });
  });

  describe('createSafeAsyncFunction', () => {
    it('should create safe async function', async() => {
      const asyncFn = async(x: number) => x * 2;
      const safeFn = createSafeAsyncFunction(asyncFn);
      
      const result = await safeFn(5);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it('should handle errors in safe async function', async() => {
      const asyncFn = async() => {
        throw new Error('Failed');
      };
      const safeFn = createSafeAsyncFunction(asyncFn);
      
      const result = await safeFn();
      
      expect(result.success).toBe(false);
    });
  });

  describe('createSafeSyncFunction', () => {
    it('should create safe sync function', () => {
      const syncFn = (x: number) => x / 2;
      const safeFn = createSafeSyncFunction(syncFn);
      
      const result = safeFn(10);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('should handle errors in safe sync function', () => {
      const syncFn = () => {
        throw new Error('Failed');
      };
      const safeFn = createSafeSyncFunction(syncFn);
      
      const result = safeFn();
      
      expect(result.success).toBe(false);
    });
  });

  describe('unwrapResult', () => {
    it('should unwrap success result', () => {
      const result = { success: true as const, data: { value: 123 } };
      
      const data = unwrapResult(result);
      
      expect(data).toEqual({ value: 123 });
    });

    it('should throw error for error result', () => {
      const result: ErrorResult = {
        success: false,
        error: 'Failed',
        code: 'TEST_ERROR',
      };
      
      expect(() => unwrapResult(result)).toThrow(AppError);
    });
  });

  describe('unwrapResultOrDefault', () => {
    it('should unwrap success result', () => {
      const result = { success: true as const, data: { value: 123 } };
      
      const data = unwrapResultOrDefault(result, { value: 0 });
      
      expect(data).toEqual({ value: 123 });
    });

    it('should return default for error result', () => {
      const result: ErrorResult = {
        success: false,
        error: 'Failed',
      };
      
      const data = unwrapResultOrDefault(result, { value: 0 });
      
      expect(data).toEqual({ value: 0 });
    });
  });

  describe('mapResult', () => {
    it('should map success result', () => {
      const result = { success: true as const, data: 5 };
      const mappedResult = mapResult(result, (x) => x * 2);
      
      expect(mappedResult.success).toBe(true);
      if (mappedResult.success) {
        expect(mappedResult.data).toBe(10);
      }
    });

    it('should pass through error result', () => {
      const result: ErrorResult = {
        success: false,
        error: 'Failed',
        code: 'TEST_ERROR',
      };
      const mappedResult = mapResult(result, (x: number) => x * 2);
      
      expect(mappedResult.success).toBe(false);
      if (!mappedResult.success) {
        expect(mappedResult.error).toBe('Failed');
      }
    });
  });

  describe('chainResult', () => {
    it('should chain success result', () => {
      const result = { success: true as const, data: 5 };
      const chainedResult = chainResult(result, (x) => ({
        success: true as const,
        data: x * 2,
      }));
      
      expect(chainedResult.success).toBe(true);
      if (chainedResult.success) {
        expect(chainedResult.data).toBe(10);
      }
    });

    it('should pass through error result', () => {
      const result: ErrorResult = {
        success: false,
        error: 'Failed',
        code: 'TEST_ERROR',
      };
      const chainedResult = chainResult(result, () => ({
        success: true as const,
        data: 10,
      }));
      
      expect(chainedResult.success).toBe(false);
      if (!chainedResult.success) {
        expect(chainedResult.error).toBe('Failed');
      }
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const error = new ValidationError('Test');
      
      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error message', () => {
      const error = new AppError('');
      
      expect(error.message).toBe('');
    });

    it('should handle empty context', () => {
      const error = new AppError('Test', 'CODE', 500, {});
      
      expect(error.context).toEqual({});
    });

    it('should handle null in error handling', () => {
      const result = handleError(null as any);
      
      expect(result.success).toBe(false);
    });

    it('should handle undefined in error handling', () => {
      const result = handleError(undefined as any);
      
      expect(result.success).toBe(false);
    });

    it('should handle non-Error throwables', () => {
      const result = handleError(123);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('An unknown error occurred');
      }
    });
  });
});
