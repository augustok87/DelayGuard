import { DelayDetectionService } from '@/services/delay-detection-service';
import { TrackingInfo } from '@/types';

describe('DelayDetectionService', () => {
  let delayDetectionService: DelayDetectionService;

  beforeEach(() => {
    delayDetectionService = new DelayDetectionService(1); // 1 day threshold
  });

  describe('checkForDelays', () => {
    it('should detect delay when estimated delivery is past original', async() => {
      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(5);
      expect(result.delayReason).toBe('DATE_DELAY');
    });

    it('should detect delay when estimated delivery is past original', async() => {
      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-11',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(1);
      expect(result.delayReason).toBe('DATE_DELAY');
    });

    it('should detect delay from status codes', async() => {
      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'DELAYED',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(true);
      expect(result.delayReason).toBe('DELAYED_STATUS');
    });

    it('should detect delay from event descriptions', async() => {
      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: [
          {
            timestamp: '2024-02-01T10:00:00Z',
            status: 'IN_TRANSIT',
            description: 'Package delayed due to weather',
            location: 'Atlanta, GA',
          },
        ],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(true);
      expect(result.delayReason).toBe('DATE_DELAY'); // DATE_DELAY is detected first
    });

    it('should detect ETA exceeded delay', async() => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days ago

      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: pastDate.toISOString().split('T')[0],
        originalEstimatedDeliveryDate: pastDate.toISOString().split('T')[0],
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(true);
      expect(result.delayReason).toBe('ETA_EXCEEDED');
      expect(result.delayDays).toBeGreaterThan(0);
    });

    it('should handle missing delivery dates gracefully', async() => {
      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(false);
      expect(result.error).toBe('Missing delivery date information');
    });
  });

  describe('delay threshold management', () => {
    it('should set and get delay threshold', () => {
      delayDetectionService.setDelayThreshold(3);
      expect(delayDetectionService.getDelayThreshold()).toBe(3);
    });

    it('should respect delay threshold when checking delays', async() => {
      delayDetectionService.setDelayThreshold(3);

      const trackingInfo: TrackingInfo = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-12',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: [],
      };

      const result = await delayDetectionService.checkForDelays(trackingInfo);

      expect(result.isDelayed).toBe(false); // 2 days delay < 3 day threshold
    });
  });
});
