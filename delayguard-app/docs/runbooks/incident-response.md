# Incident Response Runbook

**Version**: 1.0.0  
**Last Updated**: January 15, 2025  
**Owner**: DevOps Team

---

## 🚨 **Incident Response Process**

### **Severity Levels**

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P1 - Critical** | Complete system outage, data loss | 15 minutes | Immediate |
| **P2 - High** | Major feature unavailable, performance degradation | 1 hour | 2 hours |
| **P3 - Medium** | Minor feature issues, non-critical bugs | 4 hours | 24 hours |
| **P4 - Low** | Cosmetic issues, documentation | 24 hours | 72 hours |

---

## 📞 **Emergency Contacts**

### **On-Call Rotation**
- **Primary On-Call**: [Name] - [Phone] - [Slack: @username]
- **Secondary On-Call**: [Name] - [Phone] - [Slack: @username]
- **Engineering Manager**: [Name] - [Phone] - [Slack: @username]
- **CTO**: [Name] - [Phone] - [Slack: @username]

### **External Escalation**
- **Vercel Support**: support@vercel.com (Critical: +1-XXX-XXX-XXXX)
- **Database Provider**: [Support Contact]
- **Redis Provider**: [Support Contact]
- **Shopify Partner Support**: partners@shopify.com

---

## 🚀 **Incident Response Workflow**

### **Step 1: Detection & Initial Response (0-15 minutes)**

#### **Automated Detection**
- Monitor alerts from Grafana/Prometheus
- Check PagerDuty notifications
- Review Slack #alerts channel

#### **Manual Detection**
- User reports via support channels
- Internal team reports
- External monitoring services

#### **Immediate Actions**
```bash
# 1. Acknowledge the incident
# Post in #incidents Slack channel with:
# - Incident title
# - Severity level
# - Initial assessment
# - Incident commander assigned

# 2. Check system status
curl -f https://delayguard-api.vercel.app/health
curl -f https://delayguard-api.vercel.app/api/health

# 3. Check external services
curl -f https://api.shopify.com/health
curl -f https://api.shipengine.com/health
```

### **Step 2: Assessment & Communication (15-30 minutes)**

#### **Incident Commander Responsibilities**
- [ ] Create incident channel: `#incident-YYYY-MM-DD-title`
- [ ] Invite relevant team members
- [ ] Post initial status update
- [ ] Assign roles (communications, technical lead, etc.)

#### **Status Page Updates**
```markdown
# Status Update Template

**Incident**: [Brief description]
**Status**: Investigating
**Impact**: [Affected services/users]
**Started**: [Timestamp]
**ETA**: [Estimated resolution time]

## What we're doing
- [Action 1]
- [Action 2]

## Next update
[Time] or when we have more information
```

### **Step 3: Investigation & Resolution (30 minutes - 4 hours)**

#### **Investigation Checklist**
- [ ] Check application logs
- [ ] Review system metrics
- [ ] Verify external service status
- [ ] Check recent deployments
- [ ] Review database status
- [ ] Check Redis status
- [ ] Verify environment variables

#### **Common Investigation Commands**
```bash
# Check application logs
npm run logs:production --tail=100

# Check database connections
npm run db:connections

# Check Redis status
npm run redis:info

# Check recent deployments
vercel logs --limit=100

# Check external API status
curl -H "Authorization: Bearer $SHIPENGINE_API_KEY" \
  https://api.shipengine.com/v1/status
```

#### **Resolution Strategies**

##### **Database Issues**
```bash
# Check database status
npm run db:status

# Check connection pool
npm run db:pool-status

# Restart database connections
npm run db:restart-connections

# Check for locks
npm run db:check-locks
```

##### **Redis Issues**
```bash
# Check Redis status
npm run redis:ping

# Check memory usage
npm run redis:memory

# Clear cache if needed
npm run redis:flush-all

# Restart Redis connections
npm run redis:restart
```

##### **API Issues**
```bash
# Check API health
curl -f https://delayguard-api.vercel.app/health

# Check specific endpoints
curl -f https://delayguard-api.vercel.app/api/settings
curl -f https://delayguard-api.vercel.app/api/alerts

# Check external API calls
curl -f https://api.shopify.com/health
curl -f https://api.shipengine.com/health
```

##### **Performance Issues**
```bash
# Check response times
npm run metrics:response-time

# Check database performance
npm run db:slow-queries

# Check Redis performance
npm run redis:slow-commands

# Check queue status
npm run queue:status
```

### **Step 4: Resolution & Verification (Variable)**

#### **Resolution Steps**
1. **Implement Fix**
   - Deploy hotfix if needed
   - Update configuration
   - Restart services

2. **Verify Resolution**
   - Test affected functionality
   - Monitor metrics for 15 minutes
   - Confirm with users if possible

3. **Communication**
   - Update status page
   - Post resolution in incident channel
   - Notify stakeholders

### **Step 5: Post-Incident (24-48 hours)**

#### **Post-Incident Review**
- [ ] Schedule post-mortem meeting
- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] Document lessons learned
- [ ] Create action items
- [ ] Update runbooks if needed

#### **Post-Mortem Template**
```markdown
# Post-Mortem: [Incident Title]

## Summary
[Brief description of what happened]

## Timeline
- [Time] - [Event]
- [Time] - [Event]
- [Time] - [Event]

## Root Cause
[What actually caused the incident]

## Impact
- [Service/User impact]
- [Duration of outage]
- [Business impact]

## What Went Well
- [Positive aspects of response]

## What Could Be Improved
- [Areas for improvement]

## Action Items
- [ ] [Action 1] - [Owner] - [Due Date]
- [ ] [Action 2] - [Owner] - [Due Date]

## Prevention
[Steps to prevent similar incidents]
```

---

## 🔧 **Common Incident Scenarios**

### **Scenario 1: Complete API Outage**

#### **Symptoms**
- All API endpoints returning 500 errors
- Health check failing
- Users cannot access application

#### **Investigation Steps**
```bash
# 1. Check Vercel status
curl -f https://delayguard-api.vercel.app/health

# 2. Check application logs
npm run logs:production --tail=50

# 3. Check database
npm run db:status

# 4. Check Redis
npm run redis:ping
```

#### **Resolution Steps**
1. Check for recent deployments
2. Verify environment variables
3. Check external service dependencies
4. Restart services if needed
5. Deploy rollback if necessary

### **Scenario 2: Database Connection Issues**

#### **Symptoms**
- Database timeout errors
- Slow query performance
- Connection pool exhaustion

#### **Investigation Steps**
```bash
# 1. Check database status
npm run db:status

# 2. Check connection pool
npm run db:pool-status

# 3. Check slow queries
npm run db:slow-queries

# 4. Check database locks
npm run db:check-locks
```

#### **Resolution Steps**
1. Restart database connections
2. Kill long-running queries
3. Optimize slow queries
4. Scale database if needed

### **Scenario 3: Redis Cache Issues**

#### **Symptoms**
- Cache misses increasing
- Redis timeout errors
- Slow cache operations

#### **Investigation Steps**
```bash
# 1. Check Redis status
npm run redis:ping

# 2. Check memory usage
npm run redis:memory

# 3. Check slow commands
npm run redis:slow-commands

# 4. Check connection count
npm run redis:connections
```

#### **Resolution Steps**
1. Restart Redis connections
2. Clear problematic cache keys
3. Optimize cache operations
4. Scale Redis if needed

### **Scenario 4: External API Failures**

#### **Symptoms**
- Shopify API errors
- ShipEngine API errors
- SendGrid/Twilio failures

#### **Investigation Steps**
```bash
# 1. Check external API status
curl -f https://api.shopify.com/health
curl -f https://api.shipengine.com/health

# 2. Check API rate limits
npm run api:rate-limits

# 3. Check API credentials
npm run api:verify-credentials
```

#### **Resolution Steps**
1. Verify API credentials
2. Check rate limit status
3. Implement circuit breaker
4. Use fallback mechanisms

---

## 📊 **Monitoring & Alerting**

### **Critical Alerts (PagerDuty)**
- **System Down**: API unavailable for >5 minutes
- **High Error Rate**: Error rate >5% for >10 minutes
- **Database Issues**: Connection failures or slow queries
- **Security Incidents**: Potential breaches or attacks

### **Warning Alerts (Slack)**
- **Performance Degradation**: Response time >2x baseline
- **Resource Usage**: High CPU/memory usage
- **Queue Backlog**: Processing queue growing too large
- **External API Issues**: Third-party service failures

### **Monitoring Commands**
```bash
# Check system health
npm run health:check

# Check metrics
npm run metrics:overview

# Check alerts
npm run alerts:status

# Check performance
npm run performance:check
```

---

## 📞 **Communication Templates**

### **Initial Incident Notification**
```markdown
🚨 **INCIDENT ALERT** 🚨

**Incident**: [Brief description]
**Severity**: P[1-4]
**Status**: Investigating
**Impact**: [Affected services/users]
**Started**: [Timestamp]
**Commander**: [Name]

Investigating now. Updates every 15 minutes.
```

### **Status Update**
```markdown
**UPDATE** - [Timestamp]

**Status**: [Investigating/Identified/Monitoring/Resolved]
**Impact**: [Current impact]
**ETA**: [Estimated resolution time]

**What we're doing**:
- [Action 1]
- [Action 2]

**Next update**: [Time]
```

### **Resolution Notification**
```markdown
✅ **INCIDENT RESOLVED** ✅

**Incident**: [Brief description]
**Resolved**: [Timestamp]
**Duration**: [Total duration]
**Root Cause**: [Brief explanation]

**Post-mortem**: [Link to post-mortem]

All systems operational.
```

---

## 📚 **Resources**

### **Internal Resources**
- [System Architecture Documentation](../architecture.md)
- [Deployment Procedures](./deployment.md)
- [Database Operations](./database.md)
- [Security Procedures](./security.md)

### **External Resources**
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Shopify API Documentation](https://shopify.dev/api)

### **Tools & Dashboards**
- **Monitoring**: [Grafana Dashboard]
- **Logs**: [ELK Stack Kibana]
- **Metrics**: [Prometheus]
- **Alerts**: [PagerDuty]
- **Status Page**: [Status Page URL]

---

**Remember**: Stay calm, communicate clearly, and focus on resolution. The incident response process is designed to help you handle any situation effectively.
