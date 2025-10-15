import { Context } from 'koa';
import { EventEmitter } from 'events';
import { AppConfig } from '../types';

/**
 * Security Event Types
 */
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHORIZATION_SUCCESS = 'AUTHORIZATION_SUCCESS',
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
  INPUT_SANITIZATION = 'INPUT_SANITIZATION',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SECURITY_HEADER_VIOLATION = 'SECURITY_HEADER_VIOLATION'
}

/**
 * Security Event Severity Levels
 */
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security Event Interface
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  shopDomain?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  message: string;
  details: Record<string, any>;
  riskScore: number;
  tags: string[];
  correlationId?: string;
}

/**
 * Audit Logger Configuration
 */
export interface AuditLoggerConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  enableDatabaseLogging: boolean;
  enableExternalLogging: boolean;
  logLevel: SecuritySeverity;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
  externalEndpoint?: string;
  externalApiKey?: string;
}

/**
 * World-Class Audit Logger
 * Implements comprehensive security event logging with real-time analysis
 */
export class AuditLogger extends EventEmitter {
  private config: AuditLoggerConfig;
  private eventBuffer: SecurityEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private riskAnalyzer: RiskAnalyzer;

  constructor(config: AuditLoggerConfig) {
    super();
    this.config = {
      ...config,
    };

    this.riskAnalyzer = new RiskAnalyzer();
    this.startFlushTimer();
  }

  /**
   * Log security event with comprehensive analysis
   */
  async logSecurityEvent(
    type: SecurityEventType,
    ctx: Context,
    message: string,
    details: Record<string, any> = {},
    severity: SecuritySeverity = SecuritySeverity.MEDIUM,
  ): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity,
      userId: ctx.state.user?.id,
      sessionId: ctx.session?.id,
      ipAddress: ctx.ip,
      userAgent: ctx.get('User-Agent') || 'Unknown',
      shopDomain: ctx.state.shopify?.session?.shop,
      endpoint: ctx.path,
      method: ctx.method,
      statusCode: ctx.status,
      message,
      details,
      riskScore: 0,
      tags: [],
    };

    // Calculate risk score
    event.riskScore = await this.riskAnalyzer.calculateRiskScore(event);
    
    // Add risk-based tags
    event.tags = this.generateTags(event);

    // Emit event for real-time monitoring
    this.emit('securityEvent', event);

    // Add to buffer for batch processing
    this.eventBuffer.push(event);

    // Immediate logging for critical events
    if (severity === SecuritySeverity.CRITICAL) {
      await this.flushEvents();
    }

    // Check if buffer needs flushing
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    ctx: Context,
    success: boolean,
    details: Record<string, any> = {},
  ): Promise<void> {
    const type = success 
      ? SecurityEventType.AUTHENTICATION_SUCCESS 
      : SecurityEventType.AUTHENTICATION_FAILURE;
    
    const severity = success 
      ? SecuritySeverity.LOW 
      : SecuritySeverity.HIGH;

    await this.logSecurityEvent(type, ctx, 
      success ? 'User authenticated successfully' : 'Authentication failed',
      details,
      severity,
    );
  }

  /**
   * Log authorization events
   */
  async logAuthorization(
    ctx: Context,
    success: boolean,
    resource: string,
    action: string,
  ): Promise<void> {
    const type = success 
      ? SecurityEventType.AUTHORIZATION_SUCCESS 
      : SecurityEventType.AUTHORIZATION_FAILURE;
    
    const severity = success 
      ? SecuritySeverity.LOW 
      : SecuritySeverity.HIGH;

    await this.logSecurityEvent(type, ctx,
      success ? 'Access granted' : 'Access denied',
      { resource, action },
      severity,
    );
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitExceeded(
    ctx: Context,
    limit: number,
    current: number,
    windowMs: number,
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      ctx,
      `Rate limit exceeded: ${current}/${limit} in ${windowMs}ms`,
      { limit, current, windowMs },
      SecuritySeverity.MEDIUM,
    );
  }

  /**
   * Log CSRF protection events
   */
  async logCSRFViolation(
    ctx: Context,
    tokenProvided: boolean,
    tokenValid: boolean,
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.CSRF_TOKEN_INVALID,
      ctx,
      'CSRF token validation failed',
      { tokenProvided, tokenValid },
      SecuritySeverity.HIGH,
    );
  }

  /**
   * Log input sanitization events
   */
  async logInputSanitization(
    ctx: Context,
    sanitizedInput: string,
    originalInput: string,
    sanitizationType: string,
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.INPUT_SANITIZATION,
      ctx,
      `Input sanitized: ${sanitizationType}`,
      { 
        sanitizedInput: sanitizedInput.substring(0, 100), // Truncate for privacy
        originalLength: originalInput.length,
        sanitizationType, 
      },
      SecuritySeverity.MEDIUM,
    );
  }

  /**
   * Log attack attempts
   */
  async logAttackAttempt(
    ctx: Context,
    attackType: 'SQL_INJECTION' | 'XSS' | 'CSRF' | 'RATE_LIMIT',
    payload: string,
    blocked: boolean = true,
  ): Promise<void> {
    const type = attackType === 'SQL_INJECTION' 
      ? SecurityEventType.SQL_INJECTION_ATTEMPT 
      : SecurityEventType.XSS_ATTEMPT;

    await this.logSecurityEvent(
      type,
      ctx,
      `${attackType} attempt ${blocked ? 'blocked' : 'detected'}`,
      { 
        attackType, 
        payload: payload.substring(0, 200), // Truncate for security
        blocked, 
      },
      SecuritySeverity.HIGH,
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    ctx: Context,
    activity: string,
    indicators: string[],
    riskScore: number,
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      ctx,
      `Suspicious activity detected: ${activity}`,
      { activity, indicators, riskScore },
      riskScore > 80 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
    );
  }

  /**
   * Public method to manually flush events
   */
  public async flush(): Promise<void> {
    await this.flushEvents();
  }

  /**
   * Flush events to all configured outputs
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Console logging
      if (this.config.enableConsoleLogging) {
        this.logToConsole(events);
      }

      // File logging
      if (this.config.enableFileLogging) {
        await this.logToFile(events);
      }

      // Database logging
      if (this.config.enableDatabaseLogging) {
        await this.logToDatabase(events);
      }

      // External logging
      if (this.config.enableExternalLogging) {
        await this.logToExternal(events);
      }

    } catch (error) {
      console.error('Failed to flush audit events:', error);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(error => {
        console.error('Failed to flush events in timer:', error);
      });
    }, this.config.flushInterval);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate tags based on event analysis
   */
  private generateTags(event: SecurityEvent): string[] {
    const tags: string[] = [];

    // Severity-based tags
    tags.push(`severity:${event.severity.toLowerCase()}`);

    // Risk-based tags
    if (event.riskScore > 80) tags.push('high-risk');
    if (event.riskScore > 60) tags.push('medium-risk');
    if (event.riskScore < 20) tags.push('low-risk');

    // Event type tags
    tags.push(`type:${event.type.toLowerCase()}`);

    // Geographic tags (if IP geolocation available)
    if (event.ipAddress) {
      tags.push(`ip:${event.ipAddress.split('.').slice(0, 2).join('.')}.x.x`);
    }

    return tags;
  }

  /**
   * Console logging
   */
  private logToConsole(events: SecurityEvent[]): void {
    events.forEach(event => {
      const logLevel = this.getLogLevel(event.severity);
      console[logLevel](`[AUDIT] ${event.type}: ${event.message}`, {
        id: event.id,
        severity: event.severity,
        riskScore: event.riskScore,
        ip: event.ipAddress,
        endpoint: event.endpoint,
      });
    });
  }

  /**
   * File logging
   */
  private async logToFile(events: SecurityEvent[]): Promise<void> {
    // Implementation would write to structured log files
    // For now, we'll use console as a placeholder
    console.log(`[FILE] Logging ${events.length} events to file`);
  }

  /**
   * Database logging
   */
  private async logToDatabase(events: SecurityEvent[]): Promise<void> {
    // Implementation would write to database
    // For now, we'll use console as a placeholder
    console.log(`[DB] Logging ${events.length} events to database`);
  }

  /**
   * External logging (SIEM, etc.)
   */
  private async logToExternal(events: SecurityEvent[]): Promise<void> {
    if (!this.config.externalEndpoint) return;

    // Implementation would send to external SIEM
    console.log(`[EXTERNAL] Sending ${events.length} events to ${this.config.externalEndpoint}`);
  }

  /**
   * Get console log level based on severity
   */
  private getLogLevel(severity: SecuritySeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case SecuritySeverity.CRITICAL:
      case SecuritySeverity.HIGH:
        return 'error';
      case SecuritySeverity.MEDIUM:
        return 'warn';
      default:
        return 'log';
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
  }
}

/**
 * Risk Analyzer for security events
 */
class RiskAnalyzer {
  /**
   * Calculate risk score for security event
   */
  async calculateRiskScore(event: SecurityEvent): Promise<number> {
    let score = 0;

    // Base score by event type
    switch (event.type) {
      case SecurityEventType.AUTHENTICATION_FAILURE:
        score += 30;
        break;
      case SecurityEventType.AUTHORIZATION_FAILURE:
        score += 40;
        break;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        score += 20;
        break;
      case SecurityEventType.CSRF_TOKEN_INVALID:
        score += 50;
        break;
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        score += 80;
        break;
      case SecurityEventType.XSS_ATTEMPT:
        score += 70;
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        score += 60;
        break;
    }

    // Severity multiplier
    switch (event.severity) {
      case SecuritySeverity.CRITICAL:
        score *= 1.5;
        break;
      case SecuritySeverity.HIGH:
        score *= 1.2;
        break;
      case SecuritySeverity.MEDIUM:
        score *= 1.0;
        break;
      case SecuritySeverity.LOW:
        score *= 0.8;
        break;
    }

    // IP reputation (simplified)
    if (this.isSuspiciousIP(event.ipAddress)) {
      score += 20;
    }

    // User agent analysis
    if (this.isSuspiciousUserAgent(event.userAgent)) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIP(ip: string): boolean {
    // Simplified check - in production, use threat intelligence feeds
    const suspiciousPatterns = [
      /^10\./, // Private network
      /^192\.168\./, // Private network
      /^127\./, // Localhost
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /php/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

/**
 * Audit Logger Factory
 */
export class AuditLoggerFactory {
  /**
   * Create audit logger with default configuration
   */
  static createDefault(): AuditLogger {
    return new AuditLogger({
      enableConsoleLogging: true,
      enableFileLogging: true,
      enableDatabaseLogging: true,
      enableExternalLogging: false,
      logLevel: SecuritySeverity.LOW,
      retentionDays: 90,
      batchSize: 100,
      flushInterval: 5000,
    });
  }

  /**
   * Create audit logger for production
   */
  static createProduction(config: Partial<AuditLoggerConfig> = {}): AuditLogger {
    return new AuditLogger({
      enableConsoleLogging: false,
      enableFileLogging: true,
      enableDatabaseLogging: true,
      enableExternalLogging: true,
      logLevel: SecuritySeverity.MEDIUM,
      retentionDays: 365,
      batchSize: 50,
      flushInterval: 2000,
      ...config,
    });
  }
}
