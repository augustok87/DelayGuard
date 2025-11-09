/**
 * Stuck-in-Transit Delay Detection Tests
 *
 * Tests for Rule 3: Stuck in Transit
 * Detects orders that have been "in transit" for too long without delivery.
 *
 * Following TDD approach - tests written FIRST.
 */

import { checkTransitDelay } from '../../src/services/delay-detection-service';

describe('Stuck-in-Transit Delay Detection (Rule 3)', () => {
  describe('In-Transit Order Detection', () => {
    it('should detect delay when order in transit for 7+ days', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(8);
      expect(result.delayReason).toBe('STUCK_IN_TRANSIT');
    });

    it('should NOT detect delay when order in transit for less than threshold', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(5);
    });

    it('should NOT detect delay when order is delivered', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'DELIVERED',
        last_tracking_update: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(0);
    });

    it('should NOT detect delay when order is out for delivery', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'OUT_FOR_DELIVERY',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false); // Out for delivery = almost there, don't alert
    });
  });

  describe('Tracking Status Handling', () => {
    it('should detect delay for PICKED_UP status (in transit)', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'PICKED_UP',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
    });

    it('should detect delay for ARRIVED_AT_FACILITY status', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'ARRIVED_AT_FACILITY',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
    });

    it('should NOT detect delay for PRE_TRANSIT status', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'PRE_TRANSIT',
        last_tracking_update: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false); // Not yet in transit
    });

    it('should NOT detect delay for null tracking status', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: null,
        last_tracking_update: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false); // No tracking = can't determine transit delay
    });
  });

  describe('Threshold Configuration', () => {
    it('should respect custom threshold of 3 days', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      };

      const result = await checkTransitDelay(mockOrder, 3);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(4);
    });

    it('should respect custom threshold of 10 days', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
      };

      const result = await checkTransitDelay(mockOrder, 10);

      expect(result.isDelayed).toBe(false); // 9 days < 10 day threshold
    });

    it('should detect delay when exactly at threshold', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders just shipped (0 days in transit)', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(), // Now
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(0);
    });

    it('should handle very old stuck orders (30+ days)', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(40);
      expect(result.delayReason).toBe('STUCK_IN_TRANSIT');
    });

    it('should handle EXCEPTION status as in transit', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'EXCEPTION',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true); // Exception + stuck = alert
    });

    it('should handle DELAYED status as in transit', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'DELAYED',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true); // Delayed + stuck = alert
    });
  });

  describe('Last Tracking Update Calculation', () => {
    it('should calculate days since last update correctly', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 7.9 * 24 * 60 * 60 * 1000), // 7.9 days ago
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(7); // Should floor to 7
    });

    it('should handle missing last_tracking_update field', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: null,
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result.isDelayed).toBe(false); // Can't determine delay without update timestamp
    });
  });

  describe('Return Value Structure', () => {
    it('should return all required fields when delay detected', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result).toHaveProperty('isDelayed');
      expect(result).toHaveProperty('delayDays');
      expect(result).toHaveProperty('delayReason');
      expect(typeof result.isDelayed).toBe('boolean');
      expect(typeof result.delayDays).toBe('number');
      expect(typeof result.delayReason).toBe('string');
    });

    it('should return isDelayed: false with delayDays when no delay', async () => {
      const mockOrder = {
        id: 1,
        tracking_status: 'IN_TRANSIT',
        last_tracking_update: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };

      const result = await checkTransitDelay(mockOrder, 7);

      expect(result).toEqual({
        isDelayed: false,
        delayDays: 5,
      });
    });
  });
});
