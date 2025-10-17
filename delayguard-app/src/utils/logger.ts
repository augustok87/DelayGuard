/**
 * World-Class Centralized Logging Utility for DelayGuard
 * 
 * Implements enterprise-grade logging with:
 * - Structured logging with proper context
 * - Type-safe error handling
 * - Performance monitoring
 * - Development vs production modes
 * - Extensible for external services (Sentry, DataDog, etc.)
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  component?: string;
  action?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  error?: Error;
}

/**
 * World-Class Logger Implementation
 * 
 * Features:
 * - Structured logging with consistent format
 * - Type-safe error handling
 * - Performance monitoring
 * - Contextual information
 * - Development vs production modes
 * - Extensible for external services
 */
class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? ` ${JSON.stringify(context, null, 2)}` : '';
    
    return `[${timestamp}] ${levelName}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);

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
        if (context?.error && this.isDevelopment) {
          console.error('Stack trace:', context.error.stack);
        }
        break;
      case LogLevel.CRITICAL:
        console.error(formattedMessage);
        if (context?.error) {
          console.error('CRITICAL ERROR Stack trace:', context.error.stack);
        }
        // In production, this would trigger immediate alerts
        break;
    }

    // In production, send to external logging service
    if (this.isProduction) {
      this.sendToExternalService(level, message, context);
    }
  }

  private sendToExternalService(level: LogLevel, message: string, context?: LogContext): void {
    // Placeholder for external logging services
    // In production, this would send to Sentry, DataDog, CloudWatch, etc.
    if (level >= LogLevel.ERROR) {
      // Send critical errors to external service immediately
    }
  }

  // Core logging methods
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, message, context);
  }

  // Specialized logging methods for common patterns
  logError(error: Error, context?: Omit<LogContext, 'error'>): void {
    this.error(`Unexpected error: ${error.message}`, {
      ...context,
      error,
    });
  }

  logApiCall(endpoint: string, method: string, statusCode?: number, duration?: number, context?: LogContext): void {
    const level = statusCode && statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API Call: ${method} ${endpoint}`, {
      ...context,
      statusCode,
      duration,
    });
  }

  logUserAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, context);
  }

  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation}`, {
      ...context,
      duration,
    });
  }

  logSecurity(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, context);
  }

  logBusinessEvent(event: string, context?: LogContext): void {
    this.info(`Business Event: ${event}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions with proper typing
export const logDebug = (message: string, context?: LogContext): void => 
  logger.debug(message, context);

export const logInfo = (message: string, context?: LogContext): void => 
  logger.info(message, context);

export const logWarn = (message: string, context?: LogContext): void => 
  logger.warn(message, context);

export const logError = (message: string, context?: LogContext): void => 
  logger.error(message, context);

export const logCritical = (message: string, context?: LogContext): void => 
  logger.critical(message, context);

// Specialized convenience functions
export const logErrorWithError = (error: Error, context?: Omit<LogContext, 'error'>): void => 
  logger.logError(error, context);

export const logApiCall = (endpoint: string, method: string, statusCode?: number, duration?: number, context?: LogContext): void => 
  logger.logApiCall(endpoint, method, statusCode, duration, context);

export const logUserAction = (action: string, context?: LogContext): void => 
  logger.logUserAction(action, context);

export const logPerformance = (operation: string, duration: number, context?: LogContext): void => 
  logger.logPerformance(operation, duration, context);

export const logSecurity = (event: string, context?: LogContext): void => 
  logger.logSecurity(event, context);

export const logBusinessEvent = (event: string, context?: LogContext): void => 
  logger.logBusinessEvent(event, context);

// Export the logger instance for advanced usage
export { logger as default };