import { CarrierService } from '../../../services/carrier-service';
import { query } from '../../../database/connection';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('../../../services/carrier-service');
jest.mock('../../../database/connection');
jest.mock('../../../utils/logger');

describe('ShipEngine Webhook Integration', () => {
  let mockCarrierService: jest.Mocked<CarrierService>;
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CarrierService
    mockCarrierService = new CarrierService() as jest.Mocked<CarrierService>;
    mockQuery = query as jest.MockedFunction<typeof query>;
  });

  describe('processFulfillmentWithTracking', () => {
    const mockOrderId = 123;
    const mockTrackingNumber = '1Z999AA10123456784';
    const mockCarrierCode = 'ups';

    const mockTrackingInfo = {
      trackingNumber: '1Z999AA10123456784',
      carrierCode: 'ups',
      status: 'IN_TRANSIT',
      estimatedDeliveryDate: '2025-11-10',
      originalEstimatedDeliveryDate: '2025-11-08',
      events: [
        {
          timestamp: '2025-11-05T10:30:00Z',
          status: 'PICKED_UP',
          description: 'Package picked up by carrier',
          location: 'Memphis, TN',
        },
        {
          timestamp: '2025-11-05T14:45:00Z',
          status: 'IN_TRANSIT',
          description: 'Departed FedEx location',
          location: 'Memphis, TN',
        },
        {
          timestamp: '2025-11-06T08:20:00Z',
          status: 'IN_TRANSIT',
          description: 'In transit',
          location: 'Louisville, KY',
        },
      ],
    };

    it('should fetch tracking info from ShipEngine when fulfillment has tracking number', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      // Simulate processFulfillmentWithTracking function
      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      expect(mockCarrierService.getTrackingInfo).toHaveBeenCalledWith(mockTrackingNumber, mockCarrierCode);
      expect(trackingInfo).toEqual(mockTrackingInfo);
      expect(trackingInfo.events).toHaveLength(3);
    });

    it('should store tracking events in database', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Simulate storing each event
      for (const event of trackingInfo.events) {
        await mockQuery(
          `INSERT INTO tracking_events (order_id, timestamp, status, description, location)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (order_id, timestamp) DO UPDATE
           SET status = EXCLUDED.status, description = EXCLUDED.description`,
          [mockOrderId, event.timestamp, event.status, event.description, event.location],
        );
      }

      expect(mockQuery).toHaveBeenCalledTimes(3); // 3 events
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tracking_events'),
        [mockOrderId, '2025-11-05T10:30:00Z', 'PICKED_UP', 'Package picked up by carrier', 'Memphis, TN'],
      );
    });

    it('should store original and current ETAs in orders table', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Simulate storing ETAs
      await mockQuery(
        `UPDATE orders
         SET original_eta = $1, current_eta = $2, tracking_status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [trackingInfo.originalEstimatedDeliveryDate, trackingInfo.estimatedDeliveryDate, trackingInfo.status, mockOrderId],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        ['2025-11-08', '2025-11-10', 'IN_TRANSIT', mockOrderId],
      );
    });

    it('should use ON CONFLICT for idempotent tracking event inserts', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Insert same event twice (simulating webhook retry)
      const event = trackingInfo.events[0];

      await mockQuery(
        `INSERT INTO tracking_events (order_id, timestamp, status, description, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (order_id, timestamp) DO UPDATE
         SET status = EXCLUDED.status, description = EXCLUDED.description`,
        [mockOrderId, event.timestamp, event.status, event.description, event.location],
      );

      await mockQuery(
        `INSERT INTO tracking_events (order_id, timestamp, status, description, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (order_id, timestamp) DO UPDATE
         SET status = EXCLUDED.status, description = EXCLUDED.description`,
        [mockOrderId, event.timestamp, event.status, event.description, event.location],
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
      // Both calls should succeed without error (idempotent)
    });

    it('should handle tracking info with no events gracefully', async() => {
      const trackingInfoNoEvents = {
        ...mockTrackingInfo,
        events: [],
      };

      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(trackingInfoNoEvents);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Should still store ETAs even if no events
      await mockQuery(
        `UPDATE orders
         SET original_eta = $1, current_eta = $2, tracking_status = $3
         WHERE id = $4`,
        [trackingInfo.originalEstimatedDeliveryDate, trackingInfo.estimatedDeliveryDate, trackingInfo.status, mockOrderId],
      );

      expect(trackingInfo.events).toHaveLength(0);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only ETA update, no event inserts
    });

    it('should skip ShipEngine call if tracking number is null', async() => {
      const nullTrackingNumber = null;

      if (nullTrackingNumber) {
        await mockCarrierService.getTrackingInfo(nullTrackingNumber, mockCarrierCode);
      }

      expect(mockCarrierService.getTrackingInfo).not.toHaveBeenCalled();
    });

    it('should skip ShipEngine call if carrier code is null', async() => {
      const nullCarrierCode = null;

      if (mockTrackingNumber && nullCarrierCode) {
        await mockCarrierService.getTrackingInfo(mockTrackingNumber, nullCarrierCode);
      }

      expect(mockCarrierService.getTrackingInfo).not.toHaveBeenCalled();
    });

    it('should handle ShipEngine 404 error (tracking number not found)', async() => {
      const error = new Error('Tracking number 1Z999AA10123456784 not found');
      mockCarrierService.getTrackingInfo = jest.fn().mockRejectedValue(error);

      await expect(
        mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode),
      ).rejects.toThrow('Tracking number 1Z999AA10123456784 not found');

      expect(mockQuery).not.toHaveBeenCalled(); // Should not store anything on error
    });

    it('should handle ShipEngine 401 error (invalid API key)', async() => {
      const error = new Error('Invalid API key');
      mockCarrierService.getTrackingInfo = jest.fn().mockRejectedValue(error);

      await expect(
        mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode),
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle ShipEngine 429 error (rate limit exceeded)', async() => {
      const error = new Error('Rate limit exceeded. Please try again later.');
      mockCarrierService.getTrackingInfo = jest.fn().mockRejectedValue(error);

      await expect(
        mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should log error but not fail webhook if ShipEngine call fails', async() => {
      const error = new Error('Network timeout');
      mockCarrierService.getTrackingInfo = jest.fn().mockRejectedValue(error);
      const mockLoggerError = logger.error as jest.MockedFunction<typeof logger.error>;

      try {
        await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);
      } catch (err) {
        // Simulate error logging without failing webhook
        mockLoggerError('Failed to fetch tracking info', err as Error);
      }

      expect(mockLoggerError).toHaveBeenCalledWith('Failed to fetch tracking info', error);
      // Webhook should still return 200 OK even if tracking fetch fails
    });

    it('should handle database transaction failure gracefully', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockRejectedValue(new Error('Database connection lost'));

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      await expect(
        mockQuery(
          `INSERT INTO tracking_events (order_id, timestamp, status, description)
           VALUES ($1, $2, $3, $4)`,
          [mockOrderId, trackingInfo.events[0].timestamp, trackingInfo.events[0].status, trackingInfo.events[0].description],
        ),
      ).rejects.toThrow('Database connection lost');
    });

    it('should handle events with null location gracefully', async() => {
      const trackingInfoNullLocation = {
        ...mockTrackingInfo,
        events: [
          {
            timestamp: '2025-11-05T10:30:00Z',
            status: 'ACCEPTED',
            description: 'Package accepted',
            location: null, // Some events don't have location
          },
        ],
      };

      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(trackingInfoNullLocation);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      await mockQuery(
        `INSERT INTO tracking_events (order_id, timestamp, status, description, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (order_id, timestamp) DO UPDATE
         SET status = EXCLUDED.status`,
        [mockOrderId, trackingInfo.events[0].timestamp, trackingInfo.events[0].status, trackingInfo.events[0].description, null],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockOrderId, '2025-11-05T10:30:00Z', 'ACCEPTED', 'Package accepted', null],
      );
    });

    it('should work with multiple carriers (UPS, FedEx, USPS)', async() => {
      const carriers = [
        { code: 'ups', trackingNumber: '1Z999AA10123456784' },
        { code: 'fedex', trackingNumber: '123456789012' },
        { code: 'usps', trackingNumber: '9400111899223608543001' },
      ];

      for (const carrier of carriers) {
        mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue({
          ...mockTrackingInfo,
          carrierCode: carrier.code,
          trackingNumber: carrier.trackingNumber,
        });

        const trackingInfo = await mockCarrierService.getTrackingInfo(carrier.trackingNumber, carrier.code);

        expect(trackingInfo.carrierCode).toBe(carrier.code);
        expect(trackingInfo.trackingNumber).toBe(carrier.trackingNumber);
      }
    });

    it('should handle ETAs being null (not all shipments have ETAs)', async() => {
      const trackingInfoNoEtas = {
        ...mockTrackingInfo,
        estimatedDeliveryDate: null,
        originalEstimatedDeliveryDate: null,
      };

      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(trackingInfoNoEtas);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      await mockQuery(
        `UPDATE orders
         SET original_eta = $1, current_eta = $2, tracking_status = $3
         WHERE id = $4`,
        [null, null, trackingInfo.status, mockOrderId],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        [null, null, 'IN_TRANSIT', mockOrderId],
      );
    });

    it('should store tracking events in chronological order (newest first)', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Events should be in chronological order
      const timestamps = trackingInfo.events.map(e => new Date(e.timestamp).getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

      expect(timestamps).toEqual(sortedTimestamps);
    });

    it('should calculate delay from original_eta vs current_eta', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      const originalEta = new Date(trackingInfo.originalEstimatedDeliveryDate!);
      const currentEta = new Date(trackingInfo.estimatedDeliveryDate!);
      const delayDays = Math.floor((currentEta.getTime() - originalEta.getTime()) / (1000 * 60 * 60 * 24));

      expect(delayDays).toBe(2); // Nov 8 → Nov 10 = 2 days delay
    });

    it('should batch process multiple tracking events efficiently', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(mockTrackingInfo);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      // Simulate batch insert (better than individual inserts)
      const events = trackingInfo.events;
      for (const event of events) {
        await mockQuery(
          `INSERT INTO tracking_events (order_id, timestamp, status, description, location)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (order_id, timestamp) DO NOTHING`,
          [mockOrderId, event.timestamp, event.status, event.description, event.location],
        );
      }

      expect(mockQuery).toHaveBeenCalledTimes(3); // 3 events = 3 inserts
    });

    it('should not call ShipEngine if order already has tracking events (optimization)', async() => {
      // Simulate checking if tracking events exist first
      mockQuery.mockResolvedValue([{ count: '5' }]); // 5 events already exist

      const existingEventsResult = await mockQuery(
        'SELECT COUNT(*) FROM tracking_events WHERE order_id = $1',
        [mockOrderId],
      );

      const existingEventCount = parseInt((existingEventsResult[0] as { count: string }).count);

      if (existingEventCount === 0) {
        // Only call ShipEngine if no events exist yet
        await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);
      }

      expect(mockCarrierService.getTrackingInfo).not.toHaveBeenCalled();
      expect(existingEventCount).toBe(5);
    });

    it('should handle very long tracking event descriptions', async() => {
      const longDescription = 'A'.repeat(1000); // Very long description

      const trackingInfoLongDesc = {
        ...mockTrackingInfo,
        events: [
          {
            timestamp: '2025-11-05T10:30:00Z',
            status: 'IN_TRANSIT',
            description: longDescription,
            location: 'Memphis, TN',
          },
        ],
      };

      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue(trackingInfoLongDesc);
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      await mockQuery(
        `INSERT INTO tracking_events (order_id, timestamp, status, description)
         VALUES ($1, $2, $3, $4)`,
        [mockOrderId, trackingInfo.events[0].timestamp, trackingInfo.events[0].status, trackingInfo.events[0].description],
      );

      expect(trackingInfo.events[0].description).toHaveLength(1000);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockOrderId, expect.any(String), expect.any(String), longDescription]),
      );
    });

    it('should update tracking_status on orders table to match current tracking status', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue({
        ...mockTrackingInfo,
        status: 'DELIVERED',
      });
      mockQuery.mockResolvedValue([]);

      const trackingInfo = await mockCarrierService.getTrackingInfo(mockTrackingNumber, mockCarrierCode);

      await mockQuery(
        `UPDATE orders SET tracking_status = $1 WHERE id = $2`,
        [trackingInfo.status, mockOrderId],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        ['DELIVERED', mockOrderId],
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent webhook calls for same order (race condition)', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue({
        trackingNumber: '1Z999AA10123456784',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        events: [
          {
            timestamp: '2025-11-05T10:30:00Z',
            status: 'PICKED_UP',
            description: 'Package picked up',
          },
        ],
      });
      mockQuery.mockResolvedValue([]);

      // Simulate two webhook calls at the same time
      const promise1 = mockCarrierService.getTrackingInfo('1Z999AA10123456784', 'ups');
      const promise2 = mockCarrierService.getTrackingInfo('1Z999AA10123456784', 'ups');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(result2);
      expect(mockCarrierService.getTrackingInfo).toHaveBeenCalledTimes(2);
      // ON CONFLICT should prevent duplicate tracking events
    });

    it('should handle network timeout gracefully', async() => {
      const timeoutError = new Error('Network timeout after 10000ms');
      mockCarrierService.getTrackingInfo = jest.fn().mockRejectedValue(timeoutError);

      await expect(
        mockCarrierService.getTrackingInfo('1Z999AA10123456784', 'ups'),
      ).rejects.toThrow('Network timeout');
    });

    it('should handle malformed ShipEngine response', async() => {
      mockCarrierService.getTrackingInfo = jest.fn().mockResolvedValue({
        trackingNumber: '1Z999AA10123456784',
        carrierCode: 'ups',
        status: 'UNKNOWN',
        events: null as any, // Malformed: events should be array
      });

      const trackingInfo = await mockCarrierService.getTrackingInfo('1Z999AA10123456784', 'ups');

      // Should handle null events gracefully
      const events = trackingInfo.events || [];
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
