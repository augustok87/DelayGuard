/**
 * Warehouse Delay Detection Tests
 *
 * Tests for Rule 1: Warehouse Delays
 * Detects orders sitting unfulfilled (not shipped) for too long.
 *
 * Following TDD approach - tests written FIRST.
 */

import { checkWarehouseDelay } from '../../src/services/delay-detection-service';

describe('Warehouse Delay Detection (Rule 1)', () => {
  describe('Unfulfilled Order Detection', () => {
    it('should detect delay when order is unfulfilled for 2+ days', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(3);
      expect(result.delayReason).toBe('WAREHOUSE_DELAY');
    });

    it('should NOT detect delay when order is unfulfilled for less than threshold', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(1);
    });

    it('should NOT detect delay when order is fulfilled', async () => {
      const mockOrder = {
        id: 1,
        status: 'fulfilled',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(0);
    });

    it('should NOT detect delay when order is partially fulfilled', async () => {
      const mockOrder = {
        id: 1,
        status: 'partial',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false);
    });
  });

  describe('Threshold Configuration', () => {
    it('should respect custom threshold of 1 day', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 1);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(1);
    });

    it('should respect custom threshold of 5 days', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 5);

      expect(result.isDelayed).toBe(false); // 4 days < 5 day threshold
      expect(result.delayDays).toBe(4);
    });

    it('should detect delay when exactly at threshold', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders created today (0 days old)', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(), // Now
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false);
      expect(result.delayDays).toBe(0);
    });

    it('should handle very old unfulfilled orders (30+ days)', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(35);
      expect(result.delayReason).toBe('WAREHOUSE_DELAY');
    });

    it('should handle null/undefined status as unfulfilled', async () => {
      const mockOrder = {
        id: 1,
        status: null,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(true); // Treat null as unfulfilled
    });

    it('should handle archived order status', async () => {
      const mockOrder = {
        id: 1,
        status: 'archived',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false); // Archived orders don't need alerts
    });

    it('should handle cancelled order status', async () => {
      const mockOrder = {
        id: 1,
        status: 'cancelled',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(false); // Cancelled orders don't need alerts
    });
  });

  describe('Delay Days Calculation', () => {
    it('should calculate delay days correctly (fractional days rounded down)', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 2.9 * 24 * 60 * 60 * 1000), // 2.9 days ago
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(2); // Should floor to 2
    });

    it('should calculate delay days correctly across month boundaries', async () => {
      // Create date exactly 5 days ago (accounting for month boundaries)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: fiveDaysAgo,
      };

      const result = await checkWarehouseDelay(mockOrder, 3);

      expect(result.isDelayed).toBe(true);
      expect(result.delayDays).toBe(5);
    });
  });

  describe('Return Value Structure', () => {
    it('should return all required fields when delay detected', async () => {
      const mockOrder = {
        id: 1,
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

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
        status: 'unfulfilled',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      };

      const result = await checkWarehouseDelay(mockOrder, 2);

      expect(result).toEqual({
        isDelayed: false,
        delayDays: 1,
      });
    });
  });
});
