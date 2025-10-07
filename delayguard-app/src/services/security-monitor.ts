import { EventEmitter } from 'events';
import { SecurityEvent, SecurityEventType, SecuritySeverity } from './audit-logger';

/**
 * Threat Level Enumeration
 */
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security Alert Interface
 */
export interface SecurityAlert {
  id: string;
  timestamp: Date;
  threatLevel: ThreatLevel;
  title: string;
  description: string;
  source: string;
  affectedSystems: string[];
  indicators: string[];
  recommendedActions: string[];
  correlationId?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Threat Detection Rule
 */
export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: SecuritySeverity;
  conditions: ThreatCondition[];
  actions: ThreatAction[];
  cooldownMs: number;
  lastTriggered?: Date;
}

/**
 * Threat Condition
 */
export interface ThreatCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  timeWindowMs?: number;
}

/**
 * Threat Action
 */
export interface ThreatAction {
  type: 'alert' | 'block_ip' | 'rate_limit' | 'notify' | 'escalate';
  config: Record<string, any>;
}

/**
 * Security Metrics
 */
export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  threatLevels: Record<ThreatLevel, number>;
  topAttackSources: Array<{ ip: string; count: number }>;
  attackTrends: Array<{ timestamp: Date; count: number }>;
  responseTime: number;
  falsePositiveRate: number;
}

/**
 * World-Class Security Monitor
 * 
 * A comprehensive real-time threat detection and response system that provides
 * enterprise-grade security monitoring for the DelayGuard application. This
 * system implements advanced threat detection algorithms, real-time event
 * processing, and automated response mechanisms.
 * 
 * @class SecurityMonitor
 * @extends EventEmitter
 * @since 1.0.0
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * const securityMonitor = new SecurityMonitor();
 * securityMonitor.startMonitoring();
 * 
 * // Listen for security alerts
 * securityMonitor.on('threatDetected', (alert) => {
 *   console.log('Security threat detected:', alert);
 * });
 * ```
 * 
 * @see {@link SecurityEvent} for event structure
 * @see {@link ThreatDetectionRule} for rule configuration
 * @see {@link SecurityAlert} for alert structure
 */
export class SecurityMonitor extends EventEmitter {
  /** Map of active threat detection rules */
  private rules: Map<string, ThreatDetectionRule> = new Map();
  
  /** Map of active security alerts */
  private alerts: Map<string, SecurityAlert> = new Map();
  
  /** Current security metrics and statistics */
  private metrics: SecurityMetrics;
  
  /** Historical security events for pattern analysis */
  private eventHistory: SecurityEvent[] = [];
  
  /** Set of blocked IP addresses */
  private blockedIPs: Set<string> = new Set();
  
  /** Rate limit overrides for specific IPs */
  private rateLimitOverrides: Map<string, number> = new Map();
  
  /** Whether monitoring is currently active */
  private isMonitoring: boolean = false;

  /**
   * Creates a new SecurityMonitor instance
   * 
   * Initializes the security monitoring system with default threat detection
   * rules and metrics collection. The monitor starts in a stopped state and
   * must be explicitly started using {@link SecurityMonitor#startMonitoring}.
   * 
   * @constructor
   * @example
   * ```typescript
   * const monitor = new SecurityMonitor();
   * ```
   */
  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.setupDefaultRules();
  }

  /**
   * Starts the security monitoring system
   * 
   * Activates real-time threat detection and begins processing security events.
   * Once started, the monitor will evaluate all incoming security events against
   * configured threat detection rules and trigger appropriate responses.
   * 
   * @method startMonitoring
   * @public
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const monitor = new SecurityMonitor();
   * monitor.startMonitoring();
   * ```
   * 
   * @fires SecurityMonitor#monitoringStarted
   * @returns {void}
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    this.emit('monitoringStarted');
    console.log('🔍 Security monitoring started');
  }

  /**
   * Stops the security monitoring system
   * 
   * Deactivates threat detection and stops processing new security events.
   * Existing alerts remain active until manually resolved.
   * 
   * @method stopMonitoring
   * @public
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * monitor.stopMonitoring();
   * ```
   * 
   * @fires SecurityMonitor#monitoringStopped
   * @returns {void}
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.emit('monitoringStopped');
    console.log('⏹️ Security monitoring stopped');
  }

  /**
   * Processes a security event for threat detection
   * 
   * Analyzes the provided security event against all configured threat detection
   * rules. If a threat is detected, appropriate alerts are generated and response
   * actions are triggered.
   * 
   * @method processSecurityEvent
   * @public
   * @async
   * @since 1.0.0
   * 
   * @param {SecurityEvent} event - The security event to process
   * 
   * @example
   * ```typescript
   * const event: SecurityEvent = {
   *   type: SecurityEventType.AUTHENTICATION_FAILURE,
   *   ip: '192.168.1.100',
   *   userAgent: 'Mozilla/5.0...',
   *   timestamp: new Date(),
   *   riskScore: 75
   * };
   * 
   * await monitor.processSecurityEvent(event);
   * ```
   * 
   * @fires SecurityMonitor#threatDetected When a threat is identified
   * @fires SecurityMonitor#eventProcessed When an event is processed
   * 
   * @returns {Promise<void>} Resolves when event processing is complete
   * 
   * @throws {Error} If event processing fails
   */
  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      // Add to event history
      this.eventHistory.push(event);
      this.updateMetrics(event);

      // Check against all rules
      for (const rule of this.rules.values()) {
        if (this.shouldEvaluateRule(rule, event)) {
          const isTriggered = await this.evaluateRule(rule, event);
          if (isTriggered) {
            await this.triggerRule(rule, event);
          }
        }
      }

      // Cleanup old events
      this.cleanupEventHistory();
      
      this.emit('eventProcessed', event);
    } catch (error) {
      console.error('Error processing security event:', error);
      throw error;
    }
  }

  /**
   * Adds a custom threat detection rule
   * 
   * Registers a new threat detection rule that will be evaluated against all
   * incoming security events. Rules define conditions that, when met, trigger
   * security alerts and response actions.
   * 
   * @method addRule
   * @public
   * @since 1.0.0
   * 
   * @param {ThreatDetectionRule} rule - The threat detection rule to add
   * 
   * @example
   * ```typescript
   * const rule: ThreatDetectionRule = {
   *   id: 'custom_rule_1',
   *   name: 'Custom Threat Detection',
   *   description: 'Detects custom threat patterns',
   *   enabled: true,
   *   severity: SecuritySeverity.HIGH,
   *   conditions: [
   *     { field: 'type', operator: 'equals', value: SecurityEventType.SUSPICIOUS_ACTIVITY }
   *   ],
   *   actions: [
   *     { type: 'alert', config: { title: 'Custom threat detected' } }
   *   ]
   * };
   * 
   * monitor.addRule(rule);
   * ```
   * 
   * @fires SecurityMonitor#ruleAdded When a rule is successfully added
   * @returns {void}
   */
  addRule(rule: ThreatDetectionRule): void {
    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove threat detection rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.emit('ruleRemoved', ruleId);
  }

  /**
   * Get current security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.isResolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Resolve security alert
   */
  resolveAlert(alertId: string, resolvedBy: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, reason: string, durationMs: number = 24 * 60 * 60 * 1000): void {
    this.blockedIPs.add(ip);
    this.emit('ipBlocked', { ip, reason, durationMs });
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.unblockIP(ip);
    }, durationMs);
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.emit('ipUnblocked', { ip });
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Override rate limit for IP
   */
  overrideRateLimit(ip: string, multiplier: number): void {
    this.rateLimitOverrides.set(ip, multiplier);
    this.emit('rateLimitOverridden', { ip, multiplier });
  }

  /**
   * Get rate limit override for IP
   */
  getRateLimitOverride(ip: string): number {
    return this.rateLimitOverrides.get(ip) || 1;
  }

  /**
   * Evaluate threat detection rule
   */
  private async evaluateRule(rule: ThreatDetectionRule, event: SecurityEvent): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: ThreatCondition, event: SecurityEvent): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'matches':
        return new RegExp(condition.value).test(String(fieldValue));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from event
   */
  private getFieldValue(event: SecurityEvent, field: string): any {
    const fieldMap: Record<string, any> = {
      'type': event.type,
      'severity': event.severity,
      'ipAddress': event.ipAddress,
      'userAgent': event.userAgent,
      'endpoint': event.endpoint,
      'method': event.method,
      'statusCode': event.statusCode,
      'riskScore': event.riskScore,
      'shopDomain': event.shopDomain
    };
    
    return fieldMap[field] || event.details[field];
  }

  /**
   * Check if rule should be evaluated
   */
  private shouldEvaluateRule(rule: ThreatDetectionRule, event: SecurityEvent): boolean {
    if (!rule.enabled) return false;
    
    // Check cooldown
    if (rule.lastTriggered && rule.cooldownMs > 0) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < rule.cooldownMs) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Trigger rule actions
   */
  private async triggerRule(rule: ThreatDetectionRule, event: SecurityEvent): Promise<void> {
    rule.lastTriggered = new Date();
    
    for (const action of rule.actions) {
      await this.executeAction(action, event);
    }
    
    this.emit('ruleTriggered', { rule, event });
  }

  /**
   * Execute threat action
   */
  private async executeAction(action: ThreatAction, event: SecurityEvent): Promise<void> {
    switch (action.type) {
      case 'alert':
        await this.createAlert(action.config, event);
        break;
      case 'block_ip':
        this.blockIP(event.ipAddress, action.config.reason || 'Automated block', action.config.durationMs);
        break;
      case 'rate_limit':
        this.overrideRateLimit(event.ipAddress, action.config.multiplier || 0.1);
        break;
      case 'notify':
        await this.sendNotification(action.config, event);
        break;
      case 'escalate':
        await this.escalateThreat(action.config, event);
        break;
    }
  }

  /**
   * Create security alert
   */
  private async createAlert(config: Record<string, any>, event: SecurityEvent): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      threatLevel: this.calculateThreatLevel(event),
      title: config.title || `Security Alert: ${event.type}`,
      description: config.description || event.message,
      source: event.ipAddress,
      affectedSystems: [event.endpoint],
      indicators: this.extractIndicators(event),
      recommendedActions: config.actions || ['Review logs', 'Investigate source'],
      correlationId: event.correlationId,
      isResolved: false
    };

    this.alerts.set(alert.id, alert);
    this.emit('alertCreated', alert);
  }

  /**
   * Calculate threat level from event
   */
  private calculateThreatLevel(event: SecurityEvent): ThreatLevel {
    if (event.riskScore >= 90) return ThreatLevel.CRITICAL;
    if (event.riskScore >= 70) return ThreatLevel.HIGH;
    if (event.riskScore >= 40) return ThreatLevel.MEDIUM;
    return ThreatLevel.LOW;
  }

  /**
   * Extract security indicators from event
   */
  private extractIndicators(event: SecurityEvent): string[] {
    const indicators: string[] = [];
    
    if (event.riskScore > 80) indicators.push('high-risk-score');
    if (event.type.includes('INJECTION')) indicators.push('injection-attempt');
    if (event.type.includes('XSS')) indicators.push('xss-attempt');
    if (event.type.includes('AUTHENTICATION_FAILURE')) indicators.push('auth-failure');
    if (event.severity === SecuritySeverity.CRITICAL) indicators.push('critical-severity');
    
    return indicators;
  }

  /**
   * Send notification
   */
  private async sendNotification(config: Record<string, any>, event: SecurityEvent): Promise<void> {
    // Implementation would send to Slack, email, etc.
    console.log(`📧 Security notification: ${config.message || event.message}`);
  }

  /**
   * Escalate threat
   */
  private async escalateThreat(config: Record<string, any>, event: SecurityEvent): Promise<void> {
    // Implementation would escalate to security team
    console.log(`🚨 Threat escalated: ${event.type} from ${event.ipAddress}`);
  }

  /**
   * Update security metrics
   */
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;
    this.metrics.eventsBySeverity[event.severity] = (this.metrics.eventsBySeverity[event.severity] || 0) + 1;
    
    const threatLevel = this.calculateThreatLevel(event);
    this.metrics.threatLevels[threatLevel] = (this.metrics.threatLevels[threatLevel] || 0) + 1;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      totalEvents: 0,
      eventsByType: {} as Record<SecurityEventType, number>,
      eventsBySeverity: {} as Record<SecuritySeverity, number>,
      threatLevels: {} as Record<ThreatLevel, number>,
      topAttackSources: [],
      attackTrends: [],
      responseTime: 0,
      falsePositiveRate: 0
    };
  }

  /**
   * Setup default security rules
   */
  private setupDefaultRules(): void {
    // Brute force detection
    this.addRule({
      id: 'brute_force_detection',
      name: 'Brute Force Attack Detection',
      description: 'Detects multiple failed authentication attempts',
      enabled: true,
      severity: SecuritySeverity.HIGH,
      conditions: [
        { field: 'type', operator: 'equals', value: SecurityEventType.AUTHENTICATION_FAILURE },
        { field: 'riskScore', operator: 'greater_than', value: 60 }
      ],
      actions: [
        { type: 'alert', config: { title: 'Brute Force Attack Detected' } },
        { type: 'block_ip', config: { reason: 'Brute force attack', durationMs: 3600000 } }
      ],
      cooldownMs: 300000 // 5 minutes
    });

    // SQL injection detection
    this.addRule({
      id: 'sql_injection_detection',
      name: 'SQL Injection Attack Detection',
      description: 'Detects SQL injection attempts',
      enabled: true,
      severity: SecuritySeverity.CRITICAL,
      conditions: [
        { field: 'type', operator: 'equals', value: SecurityEventType.SQL_INJECTION_ATTEMPT }
      ],
      actions: [
        { type: 'alert', config: { title: 'SQL Injection Attempt Detected' } },
        { type: 'block_ip', config: { reason: 'SQL injection attempt', durationMs: 7200000 } },
        { type: 'escalate', config: { level: 'critical' } }
      ],
      cooldownMs: 60000 // 1 minute
    });

    // XSS detection
    this.addRule({
      id: 'xss_detection',
      name: 'XSS Attack Detection',
      description: 'Detects XSS attempts',
      enabled: true,
      severity: SecuritySeverity.HIGH,
      conditions: [
        { field: 'type', operator: 'equals', value: SecurityEventType.XSS_ATTEMPT }
      ],
      actions: [
        { type: 'alert', config: { title: 'XSS Attempt Detected' } },
        { type: 'block_ip', config: { reason: 'XSS attempt', durationMs: 3600000 } }
      ],
      cooldownMs: 300000 // 5 minutes
    });

    // Rate limit abuse
    this.addRule({
      id: 'rate_limit_abuse',
      name: 'Rate Limit Abuse Detection',
      description: 'Detects excessive rate limit violations',
      enabled: true,
      severity: SecuritySeverity.MEDIUM,
      conditions: [
        { field: 'type', operator: 'equals', value: SecurityEventType.RATE_LIMIT_EXCEEDED },
        { field: 'riskScore', operator: 'greater_than', value: 40 }
      ],
      actions: [
        { type: 'alert', config: { title: 'Rate Limit Abuse Detected' } },
        { type: 'rate_limit', config: { multiplier: 0.1 } }
      ],
      cooldownMs: 600000 // 10 minutes
    });
  }

  /**
   * Cleanup old events from history
   */
  private cleanupEventHistory(): void {
    const maxHistorySize = 10000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (this.eventHistory.length > maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-maxHistorySize);
    }
    
    const cutoffTime = Date.now() - maxAge;
    this.eventHistory = this.eventHistory.filter(event => 
      event.timestamp.getTime() > cutoffTime
    );
  }
}

/**
 * Security Monitor Factory
 */
export class SecurityMonitorFactory {
  /**
   * Create default security monitor
   */
  static createDefault(): SecurityMonitor {
    return new SecurityMonitor();
  }

  /**
   * Create production security monitor with enhanced rules
   */
  static createProduction(): SecurityMonitor {
    const monitor = new SecurityMonitor();
    
    // Add additional production rules
    monitor.addRule({
      id: 'suspicious_activity',
      name: 'Suspicious Activity Detection',
      description: 'Detects suspicious patterns in user behavior',
      enabled: true,
      severity: SecuritySeverity.MEDIUM,
      conditions: [
        { field: 'type', operator: 'equals', value: SecurityEventType.SUSPICIOUS_ACTIVITY }
      ],
      actions: [
        { type: 'alert', config: { title: 'Suspicious Activity Detected' } },
        { type: 'notify', config: { message: 'Review user activity' } }
      ],
      cooldownMs: 900000 // 15 minutes
    });

    return monitor;
  }
}
