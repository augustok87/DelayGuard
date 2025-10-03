import { checkForDelays, DelayDetectionResult } from '../../../src/components/../src/services/delay-detection';

describe('Delay Detection Service', () => {
  describe('checkForDelays', () => {
    it('should detect delay when estimated delivery is past original', () => {
      const trackingData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: []
      };
      
      const result = checkForDelays(trackingData);
      
      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(5);
    });

    it('should not detect delay when delivery is on time', () => {
      const trackingData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2024-02-10',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: []
      };
      
      const result = checkForDelays(trackingData);
      
      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(0);
    });

    it('should detect delay from status codes', () => {
      const trackingData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'DELAYED',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: []
      };
      
      const result = checkForDelays(trackingData);
      
      expect(result.isDelayed).toBe(true);
      expect(result.delayReason).toBe('DELAYED_STATUS');
    });

    it('should handle exception status', () => {
      const trackingData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'EXCEPTION',
        estimatedDeliveryDate: '2024-02-15',
        originalEstimatedDeliveryDate: '2024-02-10',
        events: []
      };
      
      const result = checkForDelays(trackingData);
      
      expect(result.isDelayed).toBe(true);
      expect(result.delayReason).toBe('EXCEPTION_STATUS');
    });

    it('should handle missing delivery dates gracefully', () => {
      const trackingData = {
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: undefined,
        originalEstimatedDeliveryDate: '2024-02-10',
        events: []
      };
      
      const result = checkForDelays(trackingData);
      
      expect(result.isDelayed).toBe(false);
      expect(result.error).toBe('Missing delivery date information');
    });
  });
});
