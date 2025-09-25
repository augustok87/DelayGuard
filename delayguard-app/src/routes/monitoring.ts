import Router from 'koa-router';
import { MonitoringService } from '../services/monitoring-service';
import { config } from '../server';

const router = new Router();
const monitoringService = new MonitoringService(config);

// Health check endpoint
router.get('/health', async (ctx) => {
  try {
    const checks = await monitoringService.performHealthChecks();
    const overallStatus = checks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded';
    
    ctx.status = overallStatus === 'healthy' ? 200 : 503;
    ctx.body = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: checks.map(check => ({
        name: check.name,
        status: check.status,
        responseTime: check.responseTime,
        lastChecked: check.lastChecked
      }))
    };
  } catch (error) {
    ctx.status = 503;
    ctx.body = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// System metrics endpoint
router.get('/metrics', async (ctx) => {
  try {
    const metrics = await monitoringService.collectSystemMetrics();
    
    ctx.body = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to collect metrics'
    };
  }
});

// System status endpoint
router.get('/status', async (ctx) => {
  try {
    const status = await monitoringService.getSystemStatus();
    
    ctx.status = status.status === 'healthy' ? 200 : 503;
    ctx.body = {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system status'
    };
  }
});

// Alerts endpoint
router.get('/alerts', async (ctx) => {
  try {
    const alerts = await monitoringService.checkAlerts();
    
    ctx.body = {
      success: true,
      data: alerts,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check alerts'
    };
  }
});

// Metrics history endpoint
router.get('/metrics/history', async (ctx) => {
  try {
    const hours = parseInt(ctx.query.hours as string) || 24;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    // This would typically fetch from a time-series database
    // For now, return mock data
    const history = Array.from({ length: limit }, (_, i) => ({
      timestamp: new Date(Date.now() - i * (hours * 60 * 60 * 1000) / limit),
      cpu: { usage: Math.random() * 100 },
      memory: { percentage: Math.random() * 100 },
      database: { queryTime: Math.random() * 1000 },
      application: { 
        requests: { successRate: 95 + Math.random() * 5 },
        responseTime: { average: 30 + Math.random() * 50 }
      }
    })).reverse();
    
    ctx.body = {
      success: true,
      data: history,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics history'
    };
  }
});

// Performance summary endpoint
router.get('/performance', async (ctx) => {
  try {
    const status = await monitoringService.getSystemStatus();
    
    if (!status.metrics) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'No metrics available' };
      return;
    }

    const summary = {
      overall: {
        status: status.status,
        uptime: status.metrics.application.uptime,
        healthScore: calculateHealthScore(status)
      },
      performance: {
        responseTime: status.metrics.application.responseTime.average,
        successRate: status.metrics.application.requests.successRate,
        errorRate: 100 - status.metrics.application.requests.successRate
      },
      resources: {
        memoryUsage: status.metrics.memory.percentage,
        cpuUsage: status.metrics.cpu.usage,
        databaseConnections: status.metrics.database.connections.active
      },
      alerts: {
        active: status.alerts.length,
        critical: status.alerts.filter(a => a.severity === 'critical').length,
        high: status.alerts.filter(a => a.severity === 'high').length
      }
    };
    
    ctx.body = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get performance summary'
    };
  }
});

// System diagnostics endpoint
router.get('/diagnostics', async (ctx) => {
  try {
    const checks = await monitoringService.performHealthChecks();
    const status = await monitoringService.getSystemStatus();
    
    const diagnostics = {
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      services: checks.map(check => ({
        name: check.name,
        status: check.status,
        responseTime: check.responseTime,
        details: check.details,
        error: check.error
      })),
      alerts: status.alerts.map(alert => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        resolved: alert.resolved
      })),
      recommendations: generateRecommendations(checks, status)
    };
    
    ctx.body = {
      success: true,
      data: diagnostics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get diagnostics'
    };
  }
});

// Helper methods
function calculateHealthScore(status: any): number {
  let score = 100;
  
  // Deduct points for unhealthy checks
  const unhealthyChecks = status.checks.filter((c: any) => c.status === 'unhealthy');
  score -= unhealthyChecks.length * 25;
  
  // Deduct points for degraded checks
  const degradedChecks = status.checks.filter((c: any) => c.status === 'degraded');
  score -= degradedChecks.length * 10;
  
  // Deduct points for alerts
  score -= status.alerts.length * 5;
  
  // Deduct points for high resource usage
  if (status.metrics) {
    if (status.metrics.memory.percentage > 90) score -= 20;
    else if (status.metrics.memory.percentage > 80) score -= 10;
    
    if (status.metrics.application.responseTime.average > 1000) score -= 15;
    else if (status.metrics.application.responseTime.average > 500) score -= 5;
    
    if (status.metrics.application.requests.successRate < 95) score -= 20;
    else if (status.metrics.application.requests.successRate < 99) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

function generateRecommendations(checks: any[], status: any): string[] {
  const recommendations: string[] = [];
  
  // Check for unhealthy services
  const unhealthyChecks = checks.filter(c => c.status === 'unhealthy');
  if (unhealthyChecks.length > 0) {
    recommendations.push(`Critical: ${unhealthyChecks.map(c => c.name).join(', ')} are unhealthy and need immediate attention`);
  }
  
  // Check for degraded services
  const degradedChecks = checks.filter(c => c.status === 'degraded');
  if (degradedChecks.length > 0) {
    recommendations.push(`Warning: ${degradedChecks.map(c => c.name).join(', ')} are degraded and should be monitored closely`);
  }
  
  // Check for high memory usage
  if (status.metrics && status.metrics.memory.percentage > 80) {
    recommendations.push(`High memory usage detected (${status.metrics.memory.percentage}%). Consider scaling or optimizing memory usage`);
  }
  
  // Check for slow response times
  if (status.metrics && status.metrics.application.responseTime.average > 500) {
    recommendations.push(`Slow response times detected (${status.metrics.application.responseTime.average}ms). Consider performance optimization`);
  }
  
  // Check for low success rate
  if (status.metrics && status.metrics.application.requests.successRate < 99) {
    recommendations.push(`Low success rate detected (${status.metrics.application.requests.successRate}%). Investigate error causes`);
  }
  
  // Check for active alerts
  if (status.alerts.length > 0) {
    const criticalAlerts = status.alerts.filter((a: any) => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`Critical alerts active: ${criticalAlerts.map((a: any) => a.message).join(', ')}`);
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is running optimally');
  }
  
  return recommendations;
}

export { router as monitoringRoutes };
