/**
 * Centralized logging utility for DelayGuard
 * Provides consistent logging across the application with proper error handling
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const errorStr = error ? ` Error: ${error.message}` : "";

    return `[${timestamp}] ${levelName}: ${message}${contextStr}${errorStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context, error);

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        if (this.isDevelopment) {
          console.info(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (error && this.isDevelopment) {
          console.error(error.stack || "");
        }
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Convenience methods for common patterns
  logApiCall(
    endpoint: string,
    method: string,
    status?: number,
    duration?: number,
  ): void {
    this.info(`API Call: ${method} ${endpoint}`, {
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  logUserAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, context);
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.error(`Unexpected error: ${error.message}`, error, context);
  }

  logPerformance(
    operation: string,
    duration: number,
    context?: Record<string, unknown>,
  ): void {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: Record<string, unknown>) =>
  logger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) =>
  logger.info(message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) =>
  logger.warn(message, context);
export const logError = (
  message: string,
  error?: Error,
  context?: Record<string, unknown>,
) => logger.error(message, error, context);
export const logApiCall = (
  endpoint: string,
  method: string,
  status?: number,
  duration?: number,
) => logger.logApiCall(endpoint, method, status, duration);
export const logUserAction = (
  action: string,
  context?: Record<string, unknown>,
) => logger.logUserAction(action, context);
export const logPerformance = (
  operation: string,
  duration: number,
  context?: Record<string, unknown>,
) => logger.logPerformance(operation, duration, context);
