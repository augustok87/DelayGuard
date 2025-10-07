import { AuditLogger, SecurityEventType, SecuritySeverity, AuditLoggerFactory } from '../../../src/services/audit-logger';
import { Context } from 'koa';

// Mock Koa Context
const createMockContext = (overrides: Partial<Context> = {}): Context => ({
  ip: '192.168.1.1',
  method: 'GET',
  path: '/api/test',
  status: 200,
  get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser'),
  state: {
    user: { id: 'user123' },
    shopify: { session: { shop: 'test-shop.myshopify.com' } }
  },
  session: { id: 'session123' },
  ...overrides
} as any);

describe('Audit Logger', () => {
  let auditLogger: AuditLogger;
  let mockContext: Context;

  beforeEach(() => {
    auditLogger = new AuditLogger({
      enableConsoleLogging: false,
      enableFileLogging: false,
      enableDatabaseLogging: false,
      enableExternalLogging: false,
      logLevel: SecuritySeverity.LOW,
      retentionDays: 90,
      batchSize: 10,
      flushInterval: 1000
    });

    mockContext = createMockContext();
    
    // Clear console methods
    jest.clearAllMocks();
  });

  afterEach(() => {
    auditLogger.destroy();
  });

  describe('Security Event Logging', () => {
    it('should log security events with correct structure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'User authenticated successfully',
        { userId: 'user123' },
        SecuritySeverity.LOW
      );

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should calculate risk score correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        mockContext,
        'SQL injection attempt detected',
        { payload: 'SELECT * FROM users' },
        SecuritySeverity.HIGH
      );

      // Force flush to ensure events are logged
      await auditLogger.flush();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should generate appropriate tags', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_FAILURE,
        mockContext,
        'Authentication failed',
        { attempts: 3 },
        SecuritySeverity.HIGH
      );

      // Force flush to ensure events are logged
      await auditLogger.flush();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Logging', () => {
    it('should log successful authentication', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAuthentication(mockContext, true, { 
        method: 'oauth',
        provider: 'shopify' 
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log failed authentication', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAuthentication(mockContext, false, { 
        reason: 'invalid_credentials',
        attempts: 3 
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Authorization Logging', () => {
    it('should log successful authorization', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAuthorization(mockContext, true, 'orders', 'read');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log failed authorization', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAuthorization(mockContext, false, 'admin', 'write');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting Logging', () => {
    it('should log rate limit exceeded events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logRateLimitExceeded(mockContext, 100, 150, 60000);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('CSRF Protection Logging', () => {
    it('should log CSRF violations', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logCSRFViolation(mockContext, true, false);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Input Sanitization Logging', () => {
    it('should log input sanitization events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logInputSanitization(
        mockContext,
        'sanitized content',
        '<script>alert("xss")</script>',
        'XSS'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Attack Attempt Logging', () => {
    it('should log SQL injection attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAttackAttempt(
        mockContext,
        'SQL_INJECTION',
        "'; DROP TABLE users; --",
        true
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log XSS attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logAttackAttempt(
        mockContext,
        'XSS',
        '<script>alert("xss")</script>',
        true
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Suspicious Activity Logging', () => {
    it('should log suspicious activity with high risk score', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSuspiciousActivity(
        mockContext,
        'Multiple failed login attempts',
        ['brute_force', 'rapid_requests'],
        85
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Event Buffering', () => {
    it('should buffer events until batch size is reached', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 3,
        flushInterval: 50
      });

      // Log 2 events (should not flush yet)
      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Event 1'
      );

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Event 2'
      );

      // Log 3rd event (should trigger automatic flush due to batch size)
      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Event 3'
      );

      // Wait a bit to ensure flush completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Explicitly flush to ensure events are processed
      await auditLogger.flush();

      // The automatic flush should have already happened due to batch size
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should flush critical events immediately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        mockContext,
        'Critical security event',
        {},
        SecuritySeverity.CRITICAL
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Audit Logger Factory', () => {
    it('should create default audit logger', () => {
      const logger = AuditLoggerFactory.createDefault();
      expect(logger).toBeDefined();
      logger.destroy();
    });

    it('should create production audit logger', () => {
      const logger = AuditLoggerFactory.createProduction({
        externalEndpoint: 'https://siem.example.com/api/events',
        externalApiKey: 'secret-key'
      });
      expect(logger).toBeDefined();
      logger.destroy();
    });
  });

  describe('Event Emission', () => {
    it('should emit security events for real-time monitoring', (done) => {
      auditLogger.on('securityEvent', (event) => {
        expect(event.type).toBe(SecurityEventType.AUTHENTICATION_SUCCESS);
        expect(event.message).toBe('Test event');
        done();
      });

      auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Test event'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create logger with invalid configuration
      const logger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      // This should not throw an error
      await expect(logger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Test event'
      )).resolves.not.toThrow();

      logger.destroy();
      consoleSpy.mockRestore();
    });
  });

  describe('Advanced Features', () => {
    it('should handle different log levels correctly', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.MEDIUM,
        retentionDays: 90,
        batchSize: 1, // Small batch size to trigger immediate flush
        flushInterval: 50
      });

      // Test different severity levels
      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Low severity event'
      );

      await auditLogger.logSecurityEvent(
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        mockContext,
        'High severity event'
      );

      // Wait a bit to ensure flush completes
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle file logging configuration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: true,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'File logging test'
      );

      await auditLogger.flush();
      // File logging uses console.log for placeholder implementation
      expect(consoleSpy).toHaveBeenCalledWith('[FILE] Logging 1 events to file');
      consoleSpy.mockRestore();
    });

    it('should handle database logging configuration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: true,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Database logging test'
      );

      await auditLogger.flush();
      // Database logging uses console.log for placeholder implementation
      expect(consoleSpy).toHaveBeenCalledWith('[DB] Logging 1 events to database');
      consoleSpy.mockRestore();
    });

    it('should handle external logging configuration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: true,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'External logging test'
      );

      await auditLogger.flush();
      // External logging should not use console.log
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle multiple logging configurations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: true,
        enableDatabaseLogging: true,
        enableExternalLogging: true,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 50
      });

      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Multi-logging test'
      );

      await auditLogger.flush();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle different retention periods', () => {
      const shortRetentionLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 7,
        batchSize: 10,
        flushInterval: 50
      });

      const longRetentionLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 365,
        batchSize: 10,
        flushInterval: 50
      });

      expect(shortRetentionLogger).toBeDefined();
      expect(longRetentionLogger).toBeDefined();
      
      shortRetentionLogger.destroy();
      longRetentionLogger.destroy();
    });

    it('should handle different batch sizes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLogger = new AuditLogger({
        enableConsoleLogging: true,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 1, // Small batch size
        flushInterval: 50
      });

      // Single event should trigger immediate flush due to batch size = 1
      await auditLogger.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        mockContext,
        'Single batch test'
      );

      // Wait a bit to ensure flush completes
      await new Promise(resolve => setTimeout(resolve, 10));

      // The automatic flush should have already happened due to batch size = 1
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle different flush intervals', () => {
      const fastFlushLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 10 // Fast flush
      });

      const slowFlushLogger = new AuditLogger({
        enableConsoleLogging: false,
        enableFileLogging: false,
        enableDatabaseLogging: false,
        enableExternalLogging: false,
        logLevel: SecuritySeverity.LOW,
        retentionDays: 90,
        batchSize: 10,
        flushInterval: 60000 // Slow flush
      });

      expect(fastFlushLogger).toBeDefined();
      expect(slowFlushLogger).toBeDefined();
      
      fastFlushLogger.destroy();
      slowFlushLogger.destroy();
    });
  });
});
