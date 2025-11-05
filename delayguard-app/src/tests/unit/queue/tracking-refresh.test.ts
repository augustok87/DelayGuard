/**
 * TDD Red Phase: Tracking Refresh Cron Job Tests
 *
 * Business Logic:
 * - Runs hourly to refresh tracking data for all in-transit orders
 * - Fetches latest tracking events and ETAs from ShipEngine
 * - Updates database with new tracking events and ETAs
 * - Handles errors gracefully without blocking other orders
 * - Logs progress and statistics
 */

import { processTrackingRefresh } from '../../../queue/processors/tracking-refresh';
import { CarrierService } from '../../../services/carrier-service';
import { query } from '../../../database/connection';

// Mock dependencies
jest.mock('../../../services/carrier-service');
jest.mock('../../../database/connection');
jest.mock('../../../utils/logger');

describe('Tracking Refresh Cron Job', () => {
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const mockCarrierService = CarrierService as jest.MockedClass<typeof CarrierService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processTrackingRefresh', () => {
    const mockInTransitOrders = [
      {
        id: 1,
        tracking_number: '1Z999AA10123456784',
        carrier_code: 'ups',
        shop_domain: 'test-shop.myshopify.com',
      },
      {
        id: 2,
        tracking_number: '9400111899562941819915',
        carrier_code: 'usps',
        shop_domain: 'test-shop.myshopify.com',
      },
      {
        id: 3,
        tracking_number: '794611108678',
        carrier_code: 'fedex',
        shop_domain: 'test-shop.myshopify.com',
      },
    ];

    const mockTrackingInfo = {
      trackingNumber: '1Z999AA10123456784',
      carrierCode: 'ups',
      status: 'IN_TRANSIT',
      estimatedDeliveryDate: '2025-11-10',
      originalEstimatedDeliveryDate: '2025-11-08',
      events: [
        {
          timestamp: '2025-11-05T10:30:00Z',
          status: 'IN_TRANSIT',
          description: 'Package arrived at facility',
          location: 'Chicago, IL',
        },
        {
          timestamp: '2025-11-04T14:20:00Z',
          status: 'IN_TRANSIT',
          description: 'Package in transit',
          location: 'Indianapolis, IN',
        },
      ],
    };

    it('should fetch all in-transit orders from database', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      await processTrackingRefresh();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(Array),
      );
    });

    it('should call ShipEngine for each in-transit order', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      await processTrackingRefresh();

      expect(mockGetTrackingInfo).toHaveBeenCalledTimes(3);
      expect(mockGetTrackingInfo).toHaveBeenCalledWith('1Z999AA10123456784', 'ups');
      expect(mockGetTrackingInfo).toHaveBeenCalledWith('9400111899562941819915', 'usps');
      expect(mockGetTrackingInfo).toHaveBeenCalledWith('794611108678', 'fedex');
    });

    it('should store new tracking events in database', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      await processTrackingRefresh();

      // Should insert tracking events for each order
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tracking_events'),
        expect.arrayContaining([
          expect.any(Number), // order_id
          expect.any(String), // timestamp
          expect.any(String), // status
          expect.any(String), // description
        ]),
      );
    });

    it('should update ETAs and tracking status in orders table', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      await processTrackingRefresh();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining([
          mockTrackingInfo.originalEstimatedDeliveryDate,
          mockTrackingInfo.estimatedDeliveryDate,
          mockTrackingInfo.status,
          expect.any(Number), // order_id
        ]),
      );
    });

    it('should skip orders with null tracking numbers', async() => {
      const ordersWithNull = [
        ...mockInTransitOrders,
        {
          id: 4,
          tracking_number: null,
          carrier_code: 'ups',
          shop_domain: 'test-shop.myshopify.com',
        },
      ];

      mockQuery.mockResolvedValueOnce(ordersWithNull);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      await processTrackingRefresh();

      // Should only call ShipEngine for orders with tracking numbers (3, not 4)
      expect(mockGetTrackingInfo).toHaveBeenCalledTimes(3);
    });

    it('should skip orders with null carrier codes', async() => {
      const ordersWithNull = [
        ...mockInTransitOrders,
        {
          id: 5,
          tracking_number: '1Z999AA10123456785',
          carrier_code: null,
          shop_domain: 'test-shop.myshopify.com',
        },
      ];

      mockQuery.mockResolvedValueOnce(ordersWithNull);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      await processTrackingRefresh();

      // Should only call ShipEngine for orders with carrier codes (3, not 4)
      expect(mockGetTrackingInfo).toHaveBeenCalledTimes(3);
    });

    it('should continue processing other orders if one ShipEngine call fails', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn()
        .mockResolvedValueOnce(mockTrackingInfo) // Order 1 succeeds
        .mockRejectedValueOnce(new Error('ShipEngine API error')) // Order 2 fails
        .mockResolvedValueOnce(mockTrackingInfo); // Order 3 succeeds

      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      await processTrackingRefresh();

      // Should attempt all 3 orders despite one failure
      expect(mockGetTrackingInfo).toHaveBeenCalledTimes(3);
    });

    it('should handle ShipEngine 404 error (tracking number not found)', async() => {
      mockQuery.mockResolvedValueOnce([mockInTransitOrders[0]]);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const error = new Error('Tracking number not found') as Error & { statusCode?: number };
      error.statusCode = 404;

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockRejectedValue(error);

      // Should not throw - just log and continue
      await expect(processTrackingRefresh()).resolves.not.toThrow();
    });

    it('should handle ShipEngine 429 error (rate limit)', async() => {
      mockQuery.mockResolvedValueOnce([mockInTransitOrders[0]]);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const error = new Error('Rate limit exceeded') as Error & { statusCode?: number };
      error.statusCode = 429;

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockRejectedValue(error);

      // Should not throw - just log and continue
      await expect(processTrackingRefresh()).resolves.not.toThrow();
    });

    it('should handle database transaction failures gracefully', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockRejectedValue(new Error('Database connection error'));

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      // Should not throw - just log and continue
      await expect(processTrackingRefresh()).resolves.not.toThrow();
    });

    it('should use ON CONFLICT for idempotent event inserts', async() => {
      mockQuery.mockResolvedValueOnce([mockInTransitOrders[0]]);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      await processTrackingRefresh();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (order_id, timestamp)'),
        expect.any(Array),
      );
    });

    it('should handle tracking info with no events', async() => {
      const trackingWithNoEvents = {
        ...mockTrackingInfo,
        events: [],
      };

      mockQuery.mockResolvedValueOnce([mockInTransitOrders[0]]);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(trackingWithNoEvents);

      // Should not throw - just skip event insertion
      await expect(processTrackingRefresh()).resolves.not.toThrow();
    });

    it('should handle tracking info with null ETAs', async() => {
      const trackingWithNullETAs = {
        ...mockTrackingInfo,
        estimatedDeliveryDate: null,
        originalEstimatedDeliveryDate: null,
      };

      mockQuery.mockResolvedValueOnce([mockInTransitOrders[0]]);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(trackingWithNullETAs);

      // Should store null ETAs without error
      await expect(processTrackingRefresh()).resolves.not.toThrow();
    });

    it('should log statistics on completion', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      const result = await processTrackingRefresh();

      expect(result).toHaveProperty('ordersProcessed', 3);
      expect(result).toHaveProperty('eventsStored');
      expect(result).toHaveProperty('errors');
    });

    it('should return correct statistics on partial success', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn()
        .mockResolvedValueOnce(mockTrackingInfo) // Success
        .mockRejectedValueOnce(new Error('API error')) // Failure
        .mockResolvedValueOnce(mockTrackingInfo); // Success

      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      const result = await processTrackingRefresh();

      expect(result.ordersProcessed).toBe(3);
      expect(result.errors).toBe(1);
    });

    it('should query only orders with tracking_status IN_TRANSIT or DELAYED', async() => {
      mockQuery.mockResolvedValueOnce(mockInTransitOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      mockCarrierService.prototype.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      await processTrackingRefresh();

      // Should filter by tracking_status
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([expect.stringContaining('IN_TRANSIT')]),
      );
    });

    it('should batch process orders to avoid overwhelming ShipEngine', async() => {
      // Create 50 orders
      const manyOrders = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        tracking_number: `tracking-${i + 1}`,
        carrier_code: 'ups',
        shop_domain: 'test-shop.myshopify.com',
      }));

      mockQuery.mockResolvedValueOnce(manyOrders);
      mockQuery.mockResolvedValue([]); // For subsequent queries

      const mockGetTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockCarrierService.prototype.getTrackingInfo = mockGetTrackingInfo;

      await processTrackingRefresh();

      // Should process all orders
      expect(mockGetTrackingInfo).toHaveBeenCalledTimes(50);
    });

    it('should handle empty result (no in-transit orders)', async() => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await processTrackingRefresh();

      expect(result.ordersProcessed).toBe(0);
      expect(result.eventsStored).toBe(0);
      expect(result.errors).toBe(0);
    });
  });
});
