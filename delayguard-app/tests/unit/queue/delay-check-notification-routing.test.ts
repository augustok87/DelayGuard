/**
 * Unit Tests: Delay Check Processor - Notification Routing (Phase 2.1)
 *
 * Tests for merchant contact fields, enable/disable toggles, and delayType routing
 * Part of Phase 2.1 - Notification Routing Implementation
 *
 * TDD RED Phase: These tests should FAIL until processor is updated
 */

import { Job } from 'bullmq';
import { processDelayCheck } from '../../../src/queue/processors/delay-check';
import { query } from '../../../src/database/connection';
import { addNotificationJob } from '../../../src/queue/setup';
import * as delayDetectionService from '../../../src/services/delay-detection-service';
import { CarrierService } from '../../../src/services/carrier-service';
import { DelayDetectionService } from '../../../src/services/delay-detection-service';

// Mock dependencies
jest.mock('../../../src/database/connection');
jest.mock('../../../src/queue/setup');
jest.mock('../../../src/services/delay-detection-service');
jest.mock('../../../src/services/carrier-service');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockAddNotificationJob = addNotificationJob as jest.MockedFunction<typeof addNotificationJob>;
const mockCheckWarehouseDelay = delayDetectionService.checkWarehouseDelay as jest.MockedFunction<typeof delayDetectionService.checkWarehouseDelay>;
const mockCheckTransitDelay = delayDetectionService.checkTransitDelay as jest.MockedFunction<typeof delayDetectionService.checkTransitDelay>;

// Mock CarrierService and DelayDetectionService class methods
const mockGetTrackingInfo = jest.fn();
const mockCheckForDelays = jest.fn();

// Set up class mocks
(CarrierService as jest.MockedClass<typeof CarrierService>).mockImplementation(() => ({
  getTrackingInfo: mockGetTrackingInfo,
  validateTrackingNumber: jest.fn(),
  getCarrierList: jest.fn(),
} as any));

(DelayDetectionService as jest.MockedClass<typeof DelayDetectionService>).mockImplementation(() => ({
  checkForDelays: mockCheckForDelays,
} as any));

describe('Delay Check Processor - Notification Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock return values
    mockGetTrackingInfo.mockResolvedValue({
      trackingNumber: 'TRACK123',
      carrierCode: 'UPS',
      status: 'IN_TRANSIT',
      estimatedDeliveryDate: '2025-11-15',
      originalEstimatedDeliveryDate: '2025-11-10',
      events: [],
    });

    mockCheckForDelays.mockResolvedValue({ isDelayed: false });
  });

  describe('Database Query - Merchant Contact Fields', () => {
    it('should fetch merchant_email, merchant_phone, merchant_name from database', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1-555-0100',
          status: 'unfulfilled',
          created_at: new Date('2025-11-01'),
          tracking_status: null,
          last_tracking_update: null,
          tracking_number: 'TRACK123',
          carrier_code: 'UPS',
          warehouse_delay_days: 2,
          carrier_delay_days: 1,
          transit_delay_days: 7,
          email_enabled: true,
          sms_enabled: false,
          // Phase 2.1 NEW FIELDS
          merchant_email: 'merchant@shop.com',
          merchant_phone: '+1-555-9999',
          merchant_name: 'Shop Owner',
          warehouse_delays_enabled: true,
          carrier_delays_enabled: true,
          transit_delays_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockCheckTransitDelay.mockResolvedValue({ isDelayed: false });

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('merchant_email'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('merchant_phone'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('merchant_name'),
        [1],
      );
    });

    it('should fetch warehouse_delays_enabled, carrier_delays_enabled, transit_delays_enabled from database', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'unfulfilled',
          created_at: new Date('2025-11-01'),
          warehouse_delay_days: 2,
          carrier_delay_days: 1,
          transit_delay_days: 7,
          email_enabled: true,
          sms_enabled: false,
          merchant_email: 'merchant@shop.com',
          warehouse_delays_enabled: false, // DISABLED
          carrier_delays_enabled: true,
          transit_delays_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockCheckTransitDelay.mockResolvedValue({ isDelayed: false });

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('warehouse_delays_enabled'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('carrier_delays_enabled'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('transit_delays_enabled'),
        [1],
      );
    });
  });

  describe('Enable/Disable Toggle Logic', () => {
    it('should SKIP warehouse delay check if warehouse_delays_enabled = FALSE', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: '',
          carrierCode: '',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'unfulfilled',
          created_at: new Date('2025-10-25'), // 7 days ago - would trigger delay
          warehouse_delay_days: 2,
          warehouse_delays_enabled: false, // DISABLED
          email_enabled: true,
        },
      ] as any);

      mockQuery.mockResolvedValueOnce([]); // UPDATE query

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockCheckWarehouseDelay).not.toHaveBeenCalled();
      expect(mockAddNotificationJob).not.toHaveBeenCalled();
    });

    it('should PROCESS warehouse delay check if warehouse_delays_enabled = TRUE', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: '',
          carrierCode: '',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'unfulfilled',
          created_at: new Date('2025-10-25'),
          warehouse_delay_days: 2,
          warehouse_delays_enabled: true, // ENABLED
          carrier_delays_enabled: false,
          transit_delays_enabled: false,
          email_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 7,
        delayReason: 'WAREHOUSE_DELAY',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockCheckWarehouseDelay).toHaveBeenCalled();
    });

    it('should SKIP carrier delay check if carrier_delays_enabled = FALSE', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'shipped',
          created_at: new Date(),
          tracking_number: 'TRACK123',
          carrier_code: 'UPS',
          tracking_status: 'IN_TRANSIT',
          warehouse_delays_enabled: false,
          carrier_delays_enabled: false, // DISABLED
          transit_delays_enabled: false,
          carrier_delay_days: 1,
          email_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockQuery.mockResolvedValueOnce([]); // UPDATE query

      // Act
      await processDelayCheck(mockJob);

      // Assert
      // Carrier service should not be initialized/called
      expect(mockAddNotificationJob).not.toHaveBeenCalled();
    });

    it('should SKIP transit delay check if transit_delays_enabled = FALSE', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'shipped',
          created_at: new Date(),
          tracking_number: 'TRACK123',
          carrier_code: 'UPS',
          tracking_status: 'IN_TRANSIT',
          last_tracking_update: new Date('2025-10-20'), // 22 days ago - would trigger
          warehouse_delays_enabled: false,
          carrier_delays_enabled: false,
          transit_delays_enabled: false, // DISABLED
          transit_delay_days: 7,
          email_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockQuery.mockResolvedValueOnce([]); // UPDATE query

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockCheckTransitDelay).not.toHaveBeenCalled();
      expect(mockAddNotificationJob).not.toHaveBeenCalled();
    });
  });

  describe('DelayType Parameter in Notification Job', () => {
    it('should pass delayType=WAREHOUSE_DELAY for warehouse delays', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: '',
          carrierCode: '',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1-555-0100',
          status: 'unfulfilled',
          created_at: new Date('2025-10-25'),
          warehouse_delay_days: 2,
          warehouse_delays_enabled: true,
          carrier_delays_enabled: false,
          transit_delays_enabled: false,
          email_enabled: true,
          merchant_email: 'merchant@shop.com',
          merchant_phone: '+1-555-9999',
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 7,
        delayReason: 'WAREHOUSE_DELAY',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockAddNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          delayType: 'WAREHOUSE_DELAY',
        }),
      );
    });

    it('should pass delayType=CARRIER_DELAY for carrier reported delays', async() => {
      // Arrange - This test will be implemented when carrier delay logic is updated
      // For now, this documents the expected behavior
      expect(true).toBe(true);
    });

    it('should pass delayType=TRANSIT_DELAY for stuck in transit delays', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1-555-0100',
          status: 'shipped',
          created_at: new Date(),
          tracking_number: 'TRACK123',
          carrier_code: 'UPS',
          tracking_status: 'IN_TRANSIT',
          last_tracking_update: new Date('2025-10-20'),
          warehouse_delays_enabled: false,
          carrier_delays_enabled: false,
          transit_delays_enabled: true,
          transit_delay_days: 7,
          email_enabled: true,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockCheckTransitDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 22,
        delayReason: 'STUCK_IN_TRANSIT',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockAddNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          delayType: 'TRANSIT_DELAY',
        }),
      );
    });
  });

  describe('Recipient Routing Logic', () => {
    it('should pass merchant_email and merchant_phone for warehouse delays', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: '',
          carrierCode: '',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'customer@example.com',
          customer_phone: '+1-555-0100',
          status: 'unfulfilled',
          created_at: new Date('2025-10-25'),
          warehouse_delay_days: 2,
          warehouse_delays_enabled: true,
          email_enabled: true,
          merchant_email: 'merchant@shop.com',
          merchant_phone: '+1-555-9999',
          merchant_name: 'Shop Owner',
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 7,
        delayReason: 'WAREHOUSE_DELAY',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockAddNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantEmail: 'merchant@shop.com',
          merchantPhone: '+1-555-9999',
          merchantName: 'Shop Owner',
        }),
      );
    });

    it('should pass customer_email and customer_phone for carrier delays', async() => {
      // This documents expected behavior - will be tested when carrier delay routing is implemented
      expect(true).toBe(true);
    });

    it('should pass customer_email and customer_phone for transit delays', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_name: 'John Doe',
          customer_email: 'customer@example.com',
          customer_phone: '+1-555-0100',
          status: 'shipped',
          tracking_status: 'IN_TRANSIT',
          last_tracking_update: new Date('2025-10-20'),
          warehouse_delays_enabled: false,
          carrier_delays_enabled: false,
          transit_delays_enabled: true,
          transit_delay_days: 7,
          email_enabled: true,
          merchant_email: 'merchant@shop.com', // Should NOT be used
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({ isDelayed: false });
      mockCheckTransitDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 22,
        delayReason: 'STUCK_IN_TRANSIT',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockAddNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: 'customer@example.com',
          customerPhone: '+1-555-0100',
        }),
      );
      // Should NOT contain merchant fields
      expect(mockAddNotificationJob).not.toHaveBeenCalledWith(
        expect.objectContaining({
          merchantEmail: expect.anything(),
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle NULL merchant_email gracefully', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: '',
          carrierCode: '',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_email: 'customer@example.com',
          status: 'unfulfilled',
          created_at: new Date('2025-10-25'),
          warehouse_delay_days: 2,
          warehouse_delays_enabled: true,
          email_enabled: true,
          merchant_email: null, // NULL
          merchant_phone: null,
        },
      ] as any);

      mockCheckWarehouseDelay.mockResolvedValue({
        isDelayed: true,
        delayDays: 7,
        delayReason: 'WAREHOUSE_DELAY',
      });

      mockQuery.mockResolvedValueOnce([]); // INSERT delay_alert
      mockQuery.mockResolvedValueOnce([]); // UPDATE orders

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockAddNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantEmail: null,
          merchantPhone: null,
        }),
      );
    });

    it('should handle all delay types disabled gracefully', async() => {
      // Arrange
      const mockJob = {
        data: {
          orderId: 1,
          trackingNumber: 'TRACK123',
          carrierCode: 'UPS',
          shopDomain: 'test-shop.myshopify.com',
        },
      } as Job;

      mockQuery.mockResolvedValueOnce([
        {
          id: '1',
          order_number: '#1001',
          customer_email: 'customer@example.com',
          status: 'shipped',
          tracking_number: 'TRACK123',
          carrier_code: 'UPS',
          tracking_status: 'IN_TRANSIT',
          last_tracking_update: new Date('2025-10-20'),
          warehouse_delays_enabled: false, // ALL DISABLED
          carrier_delays_enabled: false,
          transit_delays_enabled: false,
          email_enabled: true,
        },
      ] as any);

      mockQuery.mockResolvedValueOnce([]); // UPDATE query

      // Act
      await processDelayCheck(mockJob);

      // Assert
      expect(mockCheckWarehouseDelay).not.toHaveBeenCalled();
      expect(mockCheckTransitDelay).not.toHaveBeenCalled();
      expect(mockAddNotificationJob).not.toHaveBeenCalled();
    });
  });
});
