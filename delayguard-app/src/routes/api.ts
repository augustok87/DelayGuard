/* eslint-disable @typescript-eslint/no-explicit-any */
// API routes with dynamic request handling
import Router from "koa-router";
import { logger } from '../utils/logger';
import { verifyRequest } from "@shopify/koa-shopify-auth";
// import { query } from '../database/connection'; // Available for future use
// import { getQueueStats } from '../queue/setup'; // Available for future use
import { analyticsRoutes } from "./analytics";
import { OptimizedApiService } from "../services/optimized-api";
import { config } from "../server";

const router = new Router();
const optimizedApi = new OptimizedApiService(config);

// Apply authentication to all API routes
router.use(verifyRequest());

// Include analytics routes
router.use(analyticsRoutes.routes());

// Get app settings (optimized)
router.get("/settings", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const result = await optimizedApi.getSettings(shop);

  if (result.success) {
    ctx.body = result.data;
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
    if (result.cached) {
      ctx.set("X-Cache", "HIT");
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

// Update app settings (optimized)
router.put("/settings", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const settings = ctx.request.body as any;

  // Validate input
  if (settings.delayThresholdDays < 0 || settings.delayThresholdDays > 30) {
    ctx.status = 400;
    ctx.body = { error: "Delay threshold must be between 0 and 30 days" };
    return;
  }

  if (
    typeof settings.emailEnabled !== "boolean" ||
    typeof settings.smsEnabled !== "boolean"
  ) {
    ctx.status = 400;
    ctx.body = { error: "Email and SMS settings must be boolean values" };
    return;
  }

  const result = await optimizedApi.updateSettings(shop, settings);

  if (result.success) {
    ctx.body = { success: true };
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

// Get delay alerts (optimized)
router.get("/alerts", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const page = Number(ctx.query.page) || 1;
  const limit = Number(ctx.query.limit) || 20;

  const result = await optimizedApi.getAlerts(shop, page, limit);

  if (result.success) {
    ctx.body = result.data;
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
    if (result.cached) {
      ctx.set("X-Cache", "HIT");
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

// Get queue statistics (optimized)
router.get("/stats", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const result = await optimizedApi.getStats(shop);

  if (result.success) {
    ctx.body = result.data;
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
    if (result.cached) {
      ctx.set("X-Cache", "HIT");
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

// Test delay detection
router.post("/test-delay", async(ctx) => {
  try {
    const { trackingNumber, carrierCode } = ctx.request.body as any;

    if (!trackingNumber || !carrierCode) {
      ctx.status = 400;
      ctx.body = { error: "Tracking number and carrier code are required" };
      return;
    }

    // Import services dynamically to avoid circular dependencies
    const { CarrierService } = await import("../services/carrier-service");
    const { DelayDetectionService } = await import(
      "../services/delay-detection-service"
    );

    const carrierService = new CarrierService();
    const delayDetectionService = new DelayDetectionService();

    const trackingInfo = await carrierService.getTrackingInfo(
      trackingNumber,
      carrierCode,
    );
    const delayResult =
      await delayDetectionService.checkForDelays(trackingInfo);

    ctx.body = {
      trackingInfo,
      delayResult,
    };
  } catch (error) {
    logger.error($1, error as Error);
    ctx.status = 500;
    ctx.body = { error: "Failed to test delay detection" };
  }
});

// Get recent orders (optimized)
router.get("/orders", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const page = Number(ctx.query.page) || 1;
  const limit = Number(ctx.query.limit) || 20;

  const result = await optimizedApi.getOrders(shop, page, limit);

  if (result.success) {
    ctx.body = result.data;
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
    if (result.cached) {
      ctx.set("X-Cache", "HIT");
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

// Clear cache
router.delete("/cache", async(ctx) => {
  const shop = ctx.state.shopify.session.shop;
  const result = await optimizedApi.clearCache(shop);

  if (result.success) {
    ctx.body = result.data;
    if (result.responseTime) {
      ctx.set("X-Response-Time", `${result.responseTime}ms`);
    }
  } else {
    ctx.status = 500;
    ctx.body = { error: result.error };
  }
});

export { router as apiRoutes };
