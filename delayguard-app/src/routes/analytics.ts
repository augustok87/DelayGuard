import Router from "koa-router";
import { logger } from '../utils/logger';
import { AnalyticsService } from "../services/AnalyticsService";
// import { config } from '../server'; // Available for future use

const router = new Router();
const analyticsService = new AnalyticsService();

// Get analytics metrics
router.get("/analytics", async(ctx) => {
  try {
    const shopId = ctx.state.shopify?.session?.shop || ctx.query.shop;
    const timeRange =
      (ctx.query.timeRange as "7d" | "30d" | "90d" | "1y") || "30d";

    if (!shopId) {
      ctx.status = 400;
      ctx.body = { error: "Shop ID is required" };
      return;
    }

    const metrics = await analyticsService.getAnalyticsMetrics(
      shopId,
      timeRange,
    );

    ctx.body = {
      success: true,
      data: metrics,
      timeRange,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = {
      error: "Failed to fetch analytics data",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    };
  }
});

// Get real-time metrics
router.get("/analytics/realtime", async(ctx) => {
  try {
    const shopId = ctx.state.shopify?.session?.shop || ctx.query.shop;

    if (!shopId) {
      ctx.status = 400;
      ctx.body = { error: "Shop ID is required" };
      return;
    }

    const metrics = await analyticsService.getRealTimeMetrics(shopId);

    ctx.body = {
      success: true,
      data: metrics,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = {
      error: "Failed to fetch real-time metrics",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    };
  }
});

// Get analytics summary
router.get("/analytics/summary", async(ctx) => {
  try {
    const shopId = ctx.state.shopify?.session?.shop || ctx.query.shop;

    if (!shopId) {
      ctx.status = 400;
      ctx.body = { error: "Shop ID is required" };
      return;
    }

    const [metrics, realtime] = await Promise.all([
      analyticsService.getAnalyticsMetrics(shopId, "30d"),
      analyticsService.getRealTimeMetrics(shopId),
    ]);

    const summary = {
      overview: {
        totalOrders: metrics.totalOrders,
        totalAlerts: metrics.totalAlerts,
        activeAlerts: realtime.activeAlerts,
        averageDelayDays: metrics.averageDelayDays,
      },
      performance: {
        responseTime: realtime.responseTime,
        successRate: metrics.performanceMetrics.successRate,
        errorRate: realtime.errorRate,
        memoryUsage: realtime.memoryUsage,
      },
      revenue: {
        totalValue: metrics.revenueImpact.totalValue,
        averageOrderValue: metrics.revenueImpact.averageOrderValue,
        potentialLoss: metrics.revenueImpact.potentialLoss,
      },
      notifications: {
        emailSuccessRate: metrics.notificationSuccessRate.email,
        smsSuccessRate: metrics.notificationSuccessRate.sms,
      },
    };

    ctx.body = {
      success: true,
      data: summary,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = {
      error: "Failed to fetch analytics summary",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    };
  }
});

// Clear analytics cache
router.delete("/analytics/cache", async(ctx) => {
  try {
    const shopId = ctx.state.shopify?.session?.shop || ctx.query.shop;

    if (!shopId) {
      ctx.status = 400;
      ctx.body = { error: "Shop ID is required" };
      return;
    }

    await analyticsService.clearCache(shopId);

    ctx.body = {
      success: true,
      message: "Analytics cache cleared successfully",
    };
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = {
      error: "Failed to clear analytics cache",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    };
  }
});

// Get analytics export data
router.get("/analytics/export", async(ctx) => {
  try {
    const shopId = ctx.state.shopify?.session?.shop || ctx.query.shop;
    const format = (ctx.query.format as "json" | "csv") || "json";
    const timeRange =
      (ctx.query.timeRange as "7d" | "30d" | "90d" | "1y") || "30d";

    if (!shopId) {
      ctx.status = 400;
      ctx.body = { error: "Shop ID is required" };
      return;
    }

    const metrics = await analyticsService.getAnalyticsMetrics(
      shopId,
      timeRange,
    );

    if (format === "csv") {
      // Convert to CSV format
      const csvData = convertToCSV(metrics);
      ctx.set("Content-Type", "text/csv");
      ctx.set(
        "Content-Disposition",
        `attachment; filename="delayguard-analytics-${timeRange}.csv"`,
      );
      ctx.body = csvData;
    } else {
      ctx.body = {
        success: true,
        data: metrics,
        timeRange,
        exportedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = {
      error: "Failed to export analytics data",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    };
  }
});

function convertToCSV(metrics: {
  totalOrders: number;
  totalAlerts: number;
  averageDelayDays: number;
  notificationSuccessRate: { email: number; sms: number };
  revenueImpact: {
    totalValue: number;
    averageOrderValue: number;
    potentialLoss: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
}): string {
  const headers = ["Metric", "Value", "Category"];

  const rows = [
    ["Total Orders", metrics.totalOrders, "Overview"],
    ["Total Alerts", metrics.totalAlerts, "Overview"],
    ["Average Delay Days", metrics.averageDelayDays, "Overview"],
    [
      "Email Success Rate",
      `${metrics.notificationSuccessRate.email}%`,
      "Notifications",
    ],
    [
      "SMS Success Rate",
      `${metrics.notificationSuccessRate.sms}%`,
      "Notifications",
    ],
    ["Total Revenue", metrics.revenueImpact.totalValue, "Revenue"],
    ["Average Order Value", metrics.revenueImpact.averageOrderValue, "Revenue"],
    ["Potential Loss", metrics.revenueImpact.potentialLoss, "Revenue"],
    [
      "Response Time",
      `${metrics.performanceMetrics.averageResponseTime}ms`,
      "Performance",
    ],
    [
      "Success Rate",
      `${metrics.performanceMetrics.successRate}%`,
      "Performance",
    ],
    ["Error Rate", `${metrics.performanceMetrics.errorRate}%`, "Performance"],
  ];

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
}

export { router as analyticsRoutes };
