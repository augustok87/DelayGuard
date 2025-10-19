/**
 * Centralized error handling utility for DelayGuard
 * Provides consistent error handling patterns across the application
 */

import { logger } from './logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  resourceName?: string;
  service?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorResult {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface SuccessResult<T = unknown> {
  success: true;
  data: T;
}

export type Result<T = unknown> = SuccessResult<T> | ErrorResult;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'UNAUTHORIZED', 401, context);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'FORBIDDEN', 403, context);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'CONFLICT', 409, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, context);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, service: string, context: ErrorContext = {}) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, { ...context, service });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {},
) {
  return async(...args: T): Promise<Result<R>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error) {
      return handleError(error, context);
    }
  };
}

/**
 * Wraps sync functions with error handling
 */
export function withSyncErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => R,
  context: ErrorContext = {},
) {
  return (...args: T): Result<R> => {
    try {
      const data = fn(...args);
      return { success: true, data };
    } catch (error) {
      return handleError(error, context);
    }
  };
}

/**
 * Handles errors and returns consistent error format
 */
export function handleError(error: unknown, context: ErrorContext = {}): ErrorResult {
  if (error instanceof AppError) {
    logger.error(`App Error: ${error.message}`, error, {
      ...context,
      ...error.context,
      code: error.code,
      statusCode: error.statusCode,
    });

    return {
      success: false,
      error: error.message,
      code: error.code,
      details: {
        statusCode: error.statusCode,
        context: { ...context, ...error.context },
      },
    };
  }

  if (error instanceof Error) {
    logger.error(`Unexpected Error: ${error.message}`, error, context as Record<string, unknown>);

    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNEXPECTED_ERROR',
      details: {
        originalMessage: error.message,
        context,
      },
    };
  }

  // Handle non-Error objects
  const errorMessage = typeof error === 'string' ? error : 'An unknown error occurred';
  logger.error(`Unknown Error: ${errorMessage}`, undefined, context as Record<string, unknown>);

  return {
    success: false,
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: {
      originalError: error,
      context,
    },
  };
}

/**
 * Creates a safe async function that never throws
 */
export function createSafeAsyncFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {},
) {
  return async(...args: T): Promise<Result<R>> => {
    return withErrorHandling(fn, context)(...args);
  };
}

/**
 * Creates a safe sync function that never throws
 */
export function createSafeSyncFunction<T extends unknown[], R>(
  fn: (...args: T) => R,
  context: ErrorContext = {},
) {
  return (...args: T): Result<R> => {
    return withSyncErrorHandling(fn, context)(...args);
  };
}

/**
 * Validates that a result is successful and returns the data
 */
export function unwrapResult<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  }
  throw new AppError(result.error, result.code, 500, result.details);
}

/**
 * Validates that a result is successful and returns the data, or returns a default value
 */
export function unwrapResultOrDefault<T>(result: Result<T>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Maps over a result, applying a function to the data if successful
 */
export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (result.success) {
    try {
      const mappedData = fn(result.data);
      return { success: true, data: mappedData };
    } catch (error) {
      return handleError(error);
    }
  }
  return result;
}

/**
 * Chains results, applying a function that returns a result
 */
export function chainResult<T, U>(result: Result<T>, fn: (data: T) => Result<U>): Result<U> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}
