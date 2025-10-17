// Re-export the unified logger from the main utils
export {
  logger,
  logInfo,
  logWarn,
  logError,
  logDebug,
  logCritical,
  logErrorWithError,
  logApiCall,
  logUserAction,
  logPerformance,
  logSecurity,
  logBusinessEvent,
  LogLevel,
  type LogContext,
  type LogEntry,
} from '../src/utils/logger';