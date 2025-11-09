import {
  TrackingInfo,
  DelayDetectionResult,
  DelayDetectionService as IDelayDetectionService,
} from "../types";
import { checkForDelays } from "./delay-detection";
import { logError } from "../utils/logger";

/**
 * Advanced Delay Detection Service
 *
 * Provides sophisticated delay detection capabilities for shipping packages.
 * This service implements business logic to determine if a package is delayed
 * based on tracking information and configurable thresholds.
 *
 * @class DelayDetectionService
 * @implements {IDelayDetectionService}
 * @since 1.0.0
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const delayService = new DelayDetectionService(2); // 2-day threshold
 * const result = await delayService.checkForDelays(trackingInfo);
 *
 * if (result.isDelayed) {
 *   logger.info(`Package delayed by ${result.delayDays} days`);
 * }
 * ```
 *
 * @see {@link TrackingInfo} for input structure
 * @see {@link DelayDetectionResult} for output structure
 */
export class DelayDetectionService implements IDelayDetectionService {
  /** Minimum number of days to consider a package delayed */
  private delayThreshold: number;

  /**
   * Creates a new DelayDetectionService instance
   *
   * @constructor
   * @param {number} [delayThreshold=1] - Minimum days of delay to trigger detection
   *
   * @example
   * ```typescript
   * // Default 1-day threshold
   * const service1 = new DelayDetectionService();
   *
   * // Custom 3-day threshold
   * const service2 = new DelayDetectionService(3);
   * ```
   */
  constructor(delayThreshold: number = 1) {
    this.delayThreshold = delayThreshold;
  }

  /**
   * Checks for shipping delays in package tracking information
   *
   * Analyzes the provided tracking information to determine if the package
   * is experiencing delays beyond the configured threshold. The method applies
   * business logic and enhanced detection algorithms to provide accurate
   * delay assessment.
   *
   * @method checkForDelays
   * @public
   * @async
   * @since 1.0.0
   *
   * @param {TrackingInfo} trackingInfo - The tracking information to analyze
   *
   * @example
   * ```typescript
   * const trackingInfo: TrackingInfo = {
   *   trackingNumber: '1Z999AA1234567890',
   *   carrierCode: 'ups',
   *   status: 'IN_TRANSIT',
   *   estimatedDeliveryDate: '2024-01-15',
   *   originalEstimatedDeliveryDate: '2024-01-12',
   *   events: [...]
   * };
   *
   * const result = await delayService.checkForDelays(trackingInfo);
   *
   * if (result.isDelayed) {
   *   logger.info(`Delay detected: ${result.delayDays} days`);
   *   // Trigger notification logic
   * }
   * ```
   *
   * @returns {Promise<DelayDetectionResult>} Promise resolving to delay detection result
   *
   * @throws {Error} If delay detection fails due to invalid input or processing errors
   *
   * @see {@link DelayDetectionResult} for result structure
   */
  async checkForDelays(
    trackingInfo: TrackingInfo,
  ): Promise<DelayDetectionResult> {
    try {
      // Use the existing checkForDelays function
      const result = checkForDelays(trackingInfo);

      // Apply additional business logic
      if (result.isDelayed && result.delayDays) {
        // Only consider it a delay if it meets the threshold
        if (result.delayDays < this.delayThreshold) {
          return {
            isDelayed: false,
            delayDays: 0,
            estimatedDelivery: result.estimatedDelivery,
            originalDelivery: result.originalDelivery,
          };
        }
      }

      // Add additional delay detection logic
      const enhancedResult = await this.enhanceDelayDetection(
        trackingInfo,
        result,
      );

      return enhancedResult;
    } catch (error) {
      logError(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        { component: "delay-detection-service", action: "detectDelay" },
      );
      return {
        isDelayed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async enhanceDelayDetection(
    trackingInfo: TrackingInfo,
    baseResult: DelayDetectionResult,
  ): Promise<DelayDetectionResult> {
    // If already detected as delayed, return the result
    if (baseResult.isDelayed) {
      return baseResult;
    }

    // Check for patterns in tracking events that might indicate delays
    const eventBasedDelay = this.checkEventBasedDelays(trackingInfo);
    if (eventBasedDelay.isDelayed) {
      return eventBasedDelay;
    }

    // Check for ETA exceeded scenarios
    const etaExceededDelay = this.checkETAExceeded(trackingInfo);
    if (etaExceededDelay.isDelayed) {
      return etaExceededDelay;
    }

    return baseResult;
  }

  private checkEventBasedDelays(
    trackingInfo: TrackingInfo,
  ): DelayDetectionResult {
    if (!trackingInfo.events || trackingInfo.events.length === 0) {
      return { isDelayed: false };
    }

    // Look for delay indicators in events
    const delayKeywords = [
      "delay",
      "delayed",
      "exception",
      "weather",
      "mechanical",
    ];
    const recentEvents = trackingInfo.events.slice(-3); // Check last 3 events

    for (const event of recentEvents) {
      const description = event.description.toLowerCase();
      const status = event.status.toLowerCase();

      if (
        delayKeywords.some(
          (keyword) =>
            description.includes(keyword) || status.includes(keyword),
        )
      ) {
        return {
          isDelayed: true,
          delayReason: "EVENT_DELAY",
          estimatedDelivery: trackingInfo.estimatedDeliveryDate,
          originalDelivery: trackingInfo.originalEstimatedDeliveryDate,
        };
      }
    }

    return { isDelayed: false };
  }

  private checkETAExceeded(trackingInfo: TrackingInfo): DelayDetectionResult {
    if (!trackingInfo.estimatedDeliveryDate) {
      return { isDelayed: false };
    }

    const estimatedDate = new Date(trackingInfo.estimatedDeliveryDate);
    const now = new Date();

    // If estimated delivery date has passed and status is still in transit
    if (
      estimatedDate < now &&
      ["IN_TRANSIT", "ACCEPTED", "PICKED_UP"].includes(trackingInfo.status)
    ) {
      const delayDays = Math.ceil(
        (now.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        isDelayed: true,
        delayDays,
        delayReason: "ETA_EXCEEDED",
        estimatedDelivery: trackingInfo.estimatedDeliveryDate,
        originalDelivery: trackingInfo.originalEstimatedDeliveryDate,
      };
    }

    return { isDelayed: false };
  }

  setDelayThreshold(threshold: number): void {
    this.delayThreshold = threshold;
  }

  getDelayThreshold(): number {
    return this.delayThreshold;
  }
}

/**
 * Check for Warehouse Delays (Rule 1)
 *
 * Detects orders sitting unfulfilled (not shipped) for too long.
 * This catches orders stuck in YOUR warehouse or fulfillment center
 * before they even leave your facility.
 *
 * @param order - Order object with status and created_at fields
 * @param thresholdDays - Number of days before alert (default: 2)
 * @returns DelayDetectionResult with delay status and days
 *
 * @example
 * const result = await checkWarehouseDelay(order, 2);
 * if (result.isDelayed) {
 *   console.log(`Order stuck in warehouse for ${result.delayDays} days`);
 * }
 */
export async function checkWarehouseDelay(
  order: {
    id: number;
    status: string | null;
    created_at: Date;
  },
  thresholdDays: number = 2,
): Promise<DelayDetectionResult> {
  // Don't alert on fulfilled, partial, archived, or cancelled orders
  const nonAlertableStatuses = ['fulfilled', 'partial', 'archived', 'cancelled'];
  if (order.status && nonAlertableStatuses.includes(order.status.toLowerCase())) {
    return {
      isDelayed: false,
      delayDays: 0,
    };
  }

  // Calculate days since order was created
  const now = new Date();
  const createdAt = new Date(order.created_at);
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // For unfulfilled orders (or null status treated as unfulfilled),
  // check if delay exceeds threshold
  if (daysSinceCreation >= thresholdDays) {
    return {
      isDelayed: true,
      delayDays: daysSinceCreation,
      delayReason: 'WAREHOUSE_DELAY',
    };
  }

  return {
    isDelayed: false,
    delayDays: daysSinceCreation,
  };
}

/**
 * Check for Stuck-in-Transit Delays (Rule 3)
 *
 * Detects orders that have been "in transit" for too long without delivery.
 * This catches packages stuck in carrier networks or lost in transit.
 *
 * @param order - Order object with tracking_status and last_tracking_update fields
 * @param thresholdDays - Number of days in transit before alert (default: 7)
 * @returns DelayDetectionResult with delay status and days
 *
 * @example
 * const result = await checkTransitDelay(order, 7);
 * if (result.isDelayed) {
 *   console.log(`Order stuck in transit for ${result.delayDays} days`);
 * }
 */
export async function checkTransitDelay(
  order: {
    id: number;
    tracking_status: string | null;
    last_tracking_update: Date | null;
  },
  thresholdDays: number = 7,
): Promise<DelayDetectionResult> {
  // Can't determine delay without tracking status or last update
  if (!order.tracking_status || !order.last_tracking_update) {
    return {
      isDelayed: false,
      delayDays: 0,
    };
  }

  // Don't alert on delivered or out-for-delivery orders
  const nonAlertableStatuses = ['DELIVERED', 'OUT_FOR_DELIVERY'];
  if (nonAlertableStatuses.includes(order.tracking_status.toUpperCase())) {
    return {
      isDelayed: false,
      delayDays: 0,
    };
  }

  // Don't alert on pre-transit (not yet shipped)
  if (order.tracking_status.toUpperCase() === 'PRE_TRANSIT') {
    return {
      isDelayed: false,
      delayDays: 0,
    };
  }

  // Calculate days since last tracking update
  const now = new Date();
  const lastUpdate = new Date(order.last_tracking_update);
  const daysSinceUpdate = Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // For in-transit orders (including PICKED_UP, IN_TRANSIT, ARRIVED_AT_FACILITY,
  // EXCEPTION, DELAYED), check if stuck for too long
  if (daysSinceUpdate >= thresholdDays) {
    return {
      isDelayed: true,
      delayDays: daysSinceUpdate,
      delayReason: 'STUCK_IN_TRANSIT',
    };
  }

  return {
    isDelayed: false,
    delayDays: daysSinceUpdate,
  };
}
