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
