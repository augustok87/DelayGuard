import { TrackingInfo, DelayDetectionResult, DelayDetectionService as IDelayDetectionService } from '../types';
import { checkForDelays } from './delay-detection';

export class DelayDetectionService implements IDelayDetectionService {
  private delayThreshold: number;

  constructor(delayThreshold: number = 1) {
    this.delayThreshold = delayThreshold;
  }

  async checkForDelays(trackingInfo: TrackingInfo): Promise<DelayDetectionResult> {
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
            originalDelivery: result.originalDelivery
          };
        }
      }

      // Add additional delay detection logic
      const enhancedResult = await this.enhanceDelayDetection(trackingInfo, result);
      
      return enhancedResult;

    } catch (error) {
      console.error('Error in delay detection:', error);
      return {
        isDelayed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async enhanceDelayDetection(
    trackingInfo: TrackingInfo, 
    baseResult: DelayDetectionResult
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

  private checkEventBasedDelays(trackingInfo: TrackingInfo): DelayDetectionResult {
    if (!trackingInfo.events || trackingInfo.events.length === 0) {
      return { isDelayed: false };
    }

    // Look for delay indicators in events
    const delayKeywords = ['delay', 'delayed', 'exception', 'weather', 'mechanical'];
    const recentEvents = trackingInfo.events.slice(-3); // Check last 3 events

    for (const event of recentEvents) {
      const description = event.description.toLowerCase();
      const status = event.status.toLowerCase();
      
      if (delayKeywords.some(keyword => 
        description.includes(keyword) || status.includes(keyword)
      )) {
        return {
          isDelayed: true,
          delayReason: 'EVENT_DELAY',
          estimatedDelivery: trackingInfo.estimatedDeliveryDate,
          originalDelivery: trackingInfo.originalEstimatedDeliveryDate
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
    if (estimatedDate < now && 
        ['IN_TRANSIT', 'ACCEPTED', 'PICKED_UP'].includes(trackingInfo.status)) {
      
      const delayDays = Math.ceil((now.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        isDelayed: true,
        delayDays,
        delayReason: 'ETA_EXCEEDED',
        estimatedDelivery: trackingInfo.estimatedDeliveryDate,
        originalDelivery: trackingInfo.originalEstimatedDeliveryDate
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
