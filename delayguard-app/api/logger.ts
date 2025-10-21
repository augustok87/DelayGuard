/* eslint-disable no-console */
// API Logger utility for server-side logging - console usage is intentional
export interface LogContext {
  component?: string;
  action?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const logInfo = (message: string, context?: LogContext): void => {
  if (isDevelopment) {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }
  // In production, you might send this to a logging service like Winston, Pino, etc.
};

export const logWarn = (message: string, context?: LogContext): void => {
  if (isDevelopment) {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }
  // In production, send to logging service
};

export const logError = (error: Error | string, context?: LogContext): void => {
  const errorMessage = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;

  if (isDevelopment) {
    console.error(`[ERROR] ${errorMessage}`, stack, context ? JSON.stringify(context) : '');
  }
  // In production, send to error tracking service like Sentry
};

export const logDebug = (message: string, context?: LogContext): void => {
  if (isDevelopment) {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
  }
  // Only log in development or specific debug environments
};

export const logger = {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
};
