# Operational Runbooks

This directory contains operational runbooks for DelayGuard production operations.

## Runbook Index

| Runbook | Purpose | Last Updated |
|---------|---------|--------------|
| [Incident Response](./incident-response.md) | How to handle production incidents | 2025-01-15 |
| [Deployment Procedures](./deployment.md) | Safe deployment practices | 2025-01-15 |
| [Database Operations](./database.md) | Database maintenance and recovery | 2025-01-15 |
| [Security Procedures](./security.md) | Security incident response | 2025-01-15 |
| [Performance Troubleshooting](./performance.md) | Performance issue resolution | 2025-01-15 |
| [Disaster Recovery](./disaster-recovery.md) | Complete system recovery procedures | 2025-01-15 |

## Emergency Contacts

### On-Call Rotation
- **Primary**: [Contact Info]
- **Secondary**: [Contact Info]
- **Escalation**: [Contact Info]

### External Services
- **Vercel Support**: support@vercel.com
- **PostgreSQL Support**: [Database Provider Support]
- **Redis Support**: [Redis Provider Support]
- **Shopify Partner Support**: partners@shopify.com

## Quick Reference

### Critical URLs
- **Production**: https://delayguard-api.vercel.app
- **Staging**: https://delayguard-staging.vercel.app
- **Monitoring**: [Grafana Dashboard]
- **Logs**: [ELK Stack Kibana]
- **Metrics**: [Prometheus]

### Key Commands
```bash
# Check system health
curl -f https://delayguard-api.vercel.app/health

# Check database
npm run db:status

# Check Redis
npm run redis:status

# View logs
npm run logs:production
```

## Runbook Maintenance

Runbooks should be:
- **Updated** after each incident
- **Tested** during disaster recovery drills
- **Reviewed** monthly for accuracy
- **Versioned** with git for change tracking
