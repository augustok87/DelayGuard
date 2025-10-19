import { TrackingInfo, DelayDetectionResult } from "../types";

export { DelayDetectionResult };

export function checkForDelays(
  trackingInfo: TrackingInfo,
): DelayDetectionResult {
  // Check for delay status codes first
  if (trackingInfo.status === "DELAYED") {
    return {
      isDelayed: true,
      delayReason: "DELAYED_STATUS",
      estimatedDelivery: trackingInfo.estimatedDeliveryDate,
      originalDelivery: trackingInfo.originalEstimatedDeliveryDate,
    };
  }

  if (trackingInfo.status === "EXCEPTION") {
    return {
      isDelayed: true,
      delayReason: "EXCEPTION_STATUS",
      estimatedDelivery: trackingInfo.estimatedDeliveryDate,
      originalDelivery: trackingInfo.originalEstimatedDeliveryDate,
    };
  }

  // Check for date-based delays
  if (
    trackingInfo.estimatedDeliveryDate &&
    trackingInfo.originalEstimatedDeliveryDate
  ) {
    const estimatedDate = new Date(trackingInfo.estimatedDeliveryDate);
    const originalDate = new Date(trackingInfo.originalEstimatedDeliveryDate);

    if (estimatedDate > originalDate) {
      const delayDays = Math.ceil(
        (estimatedDate.getTime() - originalDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        isDelayed: true,
        delayDays,
        delayReason: "DATE_DELAY",
        estimatedDelivery: trackingInfo.estimatedDeliveryDate,
        originalDelivery: trackingInfo.originalEstimatedDeliveryDate,
      };
    }
  }

  // Handle missing delivery date information
  if (
    !trackingInfo.estimatedDeliveryDate ||
    !trackingInfo.originalEstimatedDeliveryDate
  ) {
    return {
      isDelayed: false,
      error: "Missing delivery date information",
    };
  }

  return {
    isDelayed: false,
    delayDays: 0,
  };
}
