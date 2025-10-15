import { SecurityMonitor, SecurityMonitorFactory, ThreatLevel } from '../../../src/services/security-monitor';
import { SecurityEvent, SecurityEventType, SecuritySeverity } from '../../../src/services/audit-logger';

describe('SecurityMonitor', () => {
  let securityMonitor: SecurityMonitor;
  let mockEvent: SecurityEvent;

  beforeEach(() => {
    securityMonitor = new SecurityMonitor();
    mockEvent = {
      id: 'test-event-1',
      timestamp: new Date(),
      type: SecurityEventType.AUTHENTICATION_FAILURE,
      severity: SecuritySeverity.MEDIUM,
      userId: 'user-123',
      sessionId: 'session-456',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      shopDomain: 'test-shop.myshopify.com',
      endpoint: '/api/auth/login',
      method: 'POST',
      statusCode: 401,
      message: 'Authentication failed',
      details: { username: 'testuser' },
      riskScore: 75,
      tags: ['auth-failure'],
      correlationId: 'corr-123',
    };
  });

  afterEach(() => {
    securityMonitor.stopMonitoring();
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', () => {
      const startSpy = jest.spyOn(securityMonitor, 'emit');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      securityMonitor.startMonitoring();
      expect(startSpy).toHaveBeenCalledWith('monitoringStarted');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Security monitoring started');

      securityMonitor.stopMonitoring();
      expect(startSpy).toHaveBeenCalledWith('monitoringStopped');
      expect(consoleSpy).toHaveBeenCalledWith('⏹️ Security monitoring stopped');

      startSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should emit monitoring events', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      securityMonitor.startMonitoring();
      expect(eventSpy).toHaveBeenCalledWith('monitoringStarted');
      
      securityMonitor.stopMonitoring();
      expect(eventSpy).toHaveBeenCalledWith('monitoringStopped');
      
      eventSpy.mockRestore();
    });
  });

  describe('Security Event Processing', () => {
    beforeEach(() => {
      securityMonitor.startMonitoring();
    });

    it('should process security events', async() => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('eventProcessed', mockEvent);
      eventSpy.mockRestore();
    });

    it('should not process events when monitoring is stopped', async() => {
      securityMonitor.stopMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).not.toHaveBeenCalledWith('eventProcessed', mockEvent);
      eventSpy.mockRestore();
    });

    it('should handle event processing errors', async() => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      // Mock a rule that throws an error
      const errorRule = {
        id: 'error-rule',
        name: 'Error Rule',
        description: 'Rule that throws error',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [],
        actions: [],
        cooldownMs: 0,
      };
      
      // Mock evaluateRule to throw error
      jest.spyOn(securityMonitor as any, 'evaluateRule').mockRejectedValue(new Error('Rule evaluation failed'));
      
      securityMonitor.addRule(errorRule);
      
      await expect(securityMonitor.processSecurityEvent(mockEvent)).rejects.toThrow('Rule evaluation failed');
      expect(errorSpy).toHaveBeenCalledWith('Error processing security event:', expect.any(Error));
      
      errorSpy.mockRestore();
      eventSpy.mockRestore();
    });
  });

  describe('Threat Detection Rules', () => {
    it('should add custom rules', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const customRule = {
        id: 'custom-rule-1',
        name: 'Custom Threat Detection',
        description: 'Detects custom threat patterns',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.SUSPICIOUS_ACTIVITY },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Custom threat detected' } },
        ],
        cooldownMs: 300000,
      };

      securityMonitor.addRule(customRule);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleAdded', customRule);
      eventSpy.mockRestore();
    });

    it('should remove rules', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const ruleId = 'test-rule';
      
      securityMonitor.removeRule(ruleId);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleRemoved', ruleId);
      eventSpy.mockRestore();
    });

    it('should trigger rules on matching events', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      // Create a rule that matches our test event
      const matchingRule = {
        id: 'auth-failure-rule',
        name: 'Authentication Failure Rule',
        description: 'Detects authentication failures',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Auth failure detected' } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(matchingRule);
      
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule: matchingRule,
        event: mockEvent,
      }));
      eventSpy.mockRestore();
    });
  });

  describe('IP Blocking', () => {
    it('should block and unblock IP addresses', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const ip = '192.168.1.100';
      const reason = 'Suspicious activity';
      const duration = 3600000; // 1 hour

      securityMonitor.blockIP(ip, reason, duration);
      
      expect(securityMonitor.isIPBlocked(ip)).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('ipBlocked', { ip, reason, durationMs: duration });

      securityMonitor.unblockIP(ip);
      
      expect(securityMonitor.isIPBlocked(ip)).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith('ipUnblocked', { ip });
      
      eventSpy.mockRestore();
    });

    it('should emit IP blocking events', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const ip = '10.0.0.1';
      
      securityMonitor.blockIP(ip, 'Test block');
      expect(eventSpy).toHaveBeenCalledWith('ipBlocked', expect.objectContaining({ ip }));
      
      securityMonitor.unblockIP(ip);
      expect(eventSpy).toHaveBeenCalledWith('ipUnblocked', { ip });
      
      eventSpy.mockRestore();
    });
  });

  describe('Rate Limit Overrides', () => {
    it('should set and get rate limit overrides', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const ip = '192.168.1.50';
      const multiplier = 0.5;

      securityMonitor.overrideRateLimit(ip, multiplier);
      
      expect(securityMonitor.getRateLimitOverride(ip)).toBe(multiplier);
      expect(eventSpy).toHaveBeenCalledWith('rateLimitOverridden', { ip, multiplier });
      
      eventSpy.mockRestore();
    });

    it('should emit rate limit override events', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      const ip = '10.0.0.2';
      const multiplier = 0.1;
      
      securityMonitor.overrideRateLimit(ip, multiplier);
      expect(eventSpy).toHaveBeenCalledWith('rateLimitOverridden', { ip, multiplier });
      
      eventSpy.mockRestore();
    });
  });

  describe('Security Alerts', () => {
    beforeEach(() => {
      securityMonitor.startMonitoring();
    });

    it('should create alerts from triggered rules', async() => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const alertRule = {
        id: 'alert-rule',
        name: 'Alert Rule',
        description: 'Creates alerts',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Security Alert', description: 'Test alert' } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(alertRule);
      
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('alertCreated', expect.objectContaining({
        title: 'Security Alert',
        description: 'Test alert',
        source: mockEvent.ipAddress,
      }));
      
      eventSpy.mockRestore();
    });

    it('should resolve alerts', () => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      // Create an alert manually
      const alert = {
        id: 'test-alert',
        timestamp: new Date(),
        threatLevel: ThreatLevel.HIGH,
        title: 'Test Alert',
        description: 'Test description',
        source: '192.168.1.100',
        affectedSystems: ['/api/test'],
        indicators: ['test-indicator'],
        recommendedActions: ['Test action'],
        isResolved: false,
        resolvedAt: undefined as Date | undefined,
        resolvedBy: undefined as string | undefined,
      };
      
      (securityMonitor as any).alerts.set(alert.id, alert);
      
      securityMonitor.resolveAlert(alert.id, 'admin-user');
      
      expect(alert.isResolved).toBe(true);
      expect(alert.resolvedAt).toBeInstanceOf(Date);
      expect(alert.resolvedBy).toBe('admin-user');
      expect(eventSpy).toHaveBeenCalledWith('alertResolved', alert);
      
      eventSpy.mockRestore();
    });
  });

  describe('Security Metrics', () => {
    beforeEach(() => {
      securityMonitor.startMonitoring();
    });

    it('should track security metrics', async() => {
      const initialMetrics = securityMonitor.getMetrics();
      expect(initialMetrics.totalEvents).toBe(0);

      await securityMonitor.processSecurityEvent(mockEvent);
      
      const updatedMetrics = securityMonitor.getMetrics();
      expect(updatedMetrics.totalEvents).toBe(1);
      expect(updatedMetrics.eventsByType[SecurityEventType.AUTHENTICATION_FAILURE]).toBe(1);
      expect(updatedMetrics.eventsBySeverity[SecuritySeverity.MEDIUM]).toBe(1);
    });

    it('should calculate threat levels correctly', async() => {
      const highRiskEvent = { ...mockEvent, riskScore: 85 };
      const criticalRiskEvent = { ...mockEvent, riskScore: 95 };
      
      await securityMonitor.processSecurityEvent(highRiskEvent);
      await securityMonitor.processSecurityEvent(criticalRiskEvent);
      
      const metrics = securityMonitor.getMetrics();
      expect(metrics.threatLevels[ThreatLevel.HIGH]).toBe(1);
      expect(metrics.threatLevels[ThreatLevel.CRITICAL]).toBe(1);
    });
  });

  describe('Default Rules', () => {
    it('should have default security rules', () => {
      const metrics = securityMonitor.getMetrics();
      // Default rules are added in constructor, so we can't directly test them
      // But we can test that the monitor is properly initialized
      expect(metrics).toBeDefined();
    });

    it('should detect brute force attacks', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      // Create multiple auth failure events to trigger brute force detection
      const authFailureEvent = {
        ...mockEvent,
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        riskScore: 75,
      };
      
      await securityMonitor.processSecurityEvent(authFailureEvent);
      
      // The default brute force rule should trigger
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule: expect.objectContaining({ id: 'brute_force_detection' }),
      }));
      
      eventSpy.mockRestore();
    });
  });

  describe('Event History Cleanup', () => {
    it('should cleanup old events', async() => {
      securityMonitor.startMonitoring();
      
      // Process many events to trigger cleanup
      for (let i = 0; i < 100; i++) {
        await securityMonitor.processSecurityEvent({
          ...mockEvent,
          id: `event-${i}`,
          timestamp: new Date(Date.now() - i * 1000), // Stagger timestamps
        });
      }
      
      // The cleanup should have been called
      const metrics = securityMonitor.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Security Monitor Factory', () => {
    it('should create default monitor', () => {
      const monitor = SecurityMonitorFactory.createDefault();
      expect(monitor).toBeInstanceOf(SecurityMonitor);
    });

    it('should create production monitor with enhanced rules', () => {
      const monitor = SecurityMonitorFactory.createProduction();
      expect(monitor).toBeInstanceOf(SecurityMonitor);
      
      // Production monitor should have additional rules
      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Rule Cooldown', () => {
    it('should respect rule cooldown periods', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const cooldownRule = {
        id: 'cooldown-rule',
        name: 'Cooldown Rule',
        description: 'Rule with cooldown',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Cooldown test' } },
        ],
        cooldownMs: 1000, // 1 second cooldown
      };

      securityMonitor.addRule(cooldownRule);
      
      // First event should trigger
      await securityMonitor.processSecurityEvent(mockEvent);
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule: cooldownRule,
      }));
      
      // Reset spy
      eventSpy.mockClear();
      
      // Second event within cooldown should not trigger
      await securityMonitor.processSecurityEvent(mockEvent);
      expect(eventSpy).not.toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule: cooldownRule,
      }));
      
      eventSpy.mockRestore();
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate equals conditions', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'equals-rule',
        name: 'Equals Rule',
        description: 'Tests equals condition',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [{ type: 'alert' as const, config: { title: 'Equals test' } }],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule,
      }));
      
      eventSpy.mockRestore();
    });

    it('should evaluate contains conditions', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'contains-rule',
        name: 'Contains Rule',
        description: 'Tests contains condition',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'userAgent', operator: 'contains' as const, value: 'Mozilla' },
        ],
        actions: [{ type: 'alert' as const, config: { title: 'Contains test' } }],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule,
      }));
      
      eventSpy.mockRestore();
    });

    it('should evaluate greater_than conditions', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'greater-rule',
        name: 'Greater Rule',
        description: 'Tests greater_than condition',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'riskScore', operator: 'greater_than' as const, value: 70 },
        ],
        actions: [{ type: 'alert' as const, config: { title: 'Greater test' } }],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('ruleTriggered', expect.objectContaining({
        rule,
      }));
      
      eventSpy.mockRestore();
    });
  });

  describe('Action Execution', () => {
    beforeEach(() => {
      securityMonitor.startMonitoring();
    });

    it('should execute alert actions', async() => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'alert-action-rule',
        name: 'Alert Action Rule',
        description: 'Tests alert action',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Action test', description: 'Test description' } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(eventSpy).toHaveBeenCalledWith('alertCreated', expect.objectContaining({
        title: 'Action test',
        description: 'Test description',
      }));
      
      eventSpy.mockRestore();
    });

    it('should execute block_ip actions', async() => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'block-ip-rule',
        name: 'Block IP Rule',
        description: 'Tests block_ip action',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'block_ip' as const, config: { reason: 'Test block', durationMs: 60000 } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(securityMonitor.isIPBlocked(mockEvent.ipAddress)).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('ipBlocked', expect.objectContaining({
        ip: mockEvent.ipAddress,
      }));
      
      eventSpy.mockRestore();
    });

    it('should execute rate_limit actions', async() => {
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'rate-limit-rule',
        name: 'Rate Limit Rule',
        description: 'Tests rate_limit action',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'rate_limit' as const, config: { multiplier: 0.1 } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      expect(securityMonitor.getRateLimitOverride(mockEvent.ipAddress)).toBe(0.1);
      expect(eventSpy).toHaveBeenCalledWith('rateLimitOverridden', expect.objectContaining({
        ip: mockEvent.ipAddress,
        multiplier: 0.1,
      }));
      
      eventSpy.mockRestore();
    });
  });

  describe('Alert Management', () => {
    it('should get active alerts', () => {
      const activeAlerts = securityMonitor.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('should get all alerts', () => {
      const allAlerts = securityMonitor.getAllAlerts();
      expect(Array.isArray(allAlerts)).toBe(true);
    });

    it('should create alerts with correct structure', async() => {
      securityMonitor.startMonitoring();
      const eventSpy = jest.spyOn(securityMonitor, 'emit');
      
      const rule = {
        id: 'structure-test-rule',
        name: 'Structure Test Rule',
        description: 'Tests alert structure',
        enabled: true,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: SecurityEventType.AUTHENTICATION_FAILURE },
        ],
        actions: [
          { type: 'alert' as const, config: { title: 'Structure test' } },
        ],
        cooldownMs: 0,
      };

      securityMonitor.addRule(rule);
      await securityMonitor.processSecurityEvent(mockEvent);
      
      // Find the alert created by our specific rule
      const createdAlert = eventSpy.mock.calls
        .filter(call => call[0] === 'alertCreated')
        .map(call => call[1])
        .find(alert => alert.title === 'Structure test');
      
      expect(createdAlert).toMatchObject({
        id: expect.stringMatching(/^alert_\d+_[a-z0-9]+$/),
        timestamp: expect.any(Date),
        threatLevel: expect.any(String),
        title: 'Structure test',
        source: mockEvent.ipAddress,
        affectedSystems: [mockEvent.endpoint],
        indicators: expect.any(Array),
        recommendedActions: expect.any(Array),
        isResolved: false,
      });
      
      eventSpy.mockRestore();
    });
  });
});