import { NotificationService } from '../../../src/services/notification-service';
import { EmailService } from '../../../src/services/email-service';
import { SMSService } from '../../../src/services/sms-service';
import { OrderInfo, DelayDetails } from '../../../src/types';

// Mock the dependencies
jest.mock('../../../src/services/email-service');
jest.mock('../../../src/services/sms-service');

const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
const mockSMSService = SMSService as jest.MockedClass<typeof SMSService>;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockEmailServiceInstance: jest.Mocked<EmailService>;
  let mockSMSServiceInstance: jest.Mocked<SMSService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockEmailServiceInstance = {
      sendDelayNotification: jest.fn(),
    } as any;

    mockSMSServiceInstance = {
      sendDelayNotification: jest.fn(),
    } as any;

    // Mock the constructors
    mockEmailService.mockImplementation(() => mockEmailServiceInstance);
    mockSMSService.mockImplementation(() => mockSMSServiceInstance);

    notificationService = new NotificationService(
      mockEmailServiceInstance,
      mockSMSServiceInstance
    );
  });

  describe('sendDelayNotification', () => {
    const mockOrderInfo: OrderInfo = {
      orderId: 'order-123',
      customerEmail: 'customer@example.com',
      customerPhone: '+1234567890',
      customerName: 'John Doe',
      orderNumber: 'ORD-001',
      totalAmount: 99.99,
      currency: 'USD',
      orderDate: new Date('2024-01-15'),
      expectedDelivery: new Date('2024-01-18'),
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      items: [
        {
          id: 'item-1',
          name: 'Test Product',
          quantity: 1,
          price: 99.99,
        },
      ],
    };

    const mockDelayDetails: DelayDetails = {
      delayDays: 3,
      reason: 'Weather delay',
      carrier: 'UPS',
      trackingNumber: '1Z999AA1234567890',
      estimatedDelivery: new Date('2024-01-21'),
      lastUpdate: new Date('2024-01-16'),
    };

    it('should send email notification successfully', async () => {
      mockEmailServiceInstance.sendDelayNotification.mockResolvedValue(undefined);

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockEmailServiceInstance.sendDelayNotification).toHaveBeenCalledWith(
        mockOrderInfo,
        mockDelayDetails
      );
    });

    it('should send SMS notification successfully', async () => {
      mockSMSServiceInstance.sendDelayNotification.mockResolvedValue(undefined);

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockSMSServiceInstance.sendDelayNotification).toHaveBeenCalledWith(
        mockOrderInfo,
        mockDelayDetails
      );
    });

    it('should handle email service errors gracefully', async () => {
      const error = new Error('Email service unavailable');
      mockEmailServiceInstance.sendDelayNotification.mockRejectedValue(error);

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails)
      ).rejects.toThrow('Email service unavailable');
    });

    it('should handle SMS service errors gracefully', async () => {
      const error = new Error('SMS service unavailable');
      mockSMSServiceInstance.sendDelayNotification.mockRejectedValue(error);

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails)
      ).rejects.toThrow('SMS service unavailable');
    });

    it('should handle both services failing', async () => {
      const emailError = new Error('Email service unavailable');
      const smsError = new Error('SMS service unavailable');
      
      mockEmailServiceInstance.sendDelayNotification.mockRejectedValue(emailError);
      mockSMSServiceInstance.sendDelayNotification.mockRejectedValue(smsError);

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails)
      ).rejects.toThrow();
    });
  });

  describe('Constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should store email and SMS services', () => {
      // Access private properties for testing
      const privateEmailService = (notificationService as any).emailService;
      const privateSMSService = (notificationService as any).smsService;

      expect(privateEmailService).toBe(mockEmailServiceInstance);
      expect(privateSMSService).toBe(mockSMSServiceInstance);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid order info', async () => {
      const invalidOrderInfo = {} as OrderInfo;
      const mockDelayDetails: DelayDetails = {
        delayDays: 1,
        reason: 'Test delay',
        carrier: 'UPS',
        trackingNumber: '1234567890',
        estimatedDelivery: new Date(),
        lastUpdate: new Date(),
      };

      await expect(
        notificationService.sendDelayNotification(invalidOrderInfo, mockDelayDetails)
      ).rejects.toThrow();
    });

    it('should handle invalid delay details', async () => {
      const mockOrderInfo: OrderInfo = {
        orderId: 'order-123',
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        orderNumber: 'ORD-001',
        totalAmount: 99.99,
        currency: 'USD',
        orderDate: new Date(),
        expectedDelivery: new Date(),
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        items: [],
      };

      const invalidDelayDetails = {} as DelayDetails;

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, invalidDelayDetails)
      ).rejects.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should call both services when both are available', async () => {
      mockEmailServiceInstance.sendDelayNotification.mockResolvedValue(undefined);
      mockSMSServiceInstance.sendDelayNotification.mockResolvedValue(undefined);

      const mockOrderInfo: OrderInfo = {
        orderId: 'order-123',
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        orderNumber: 'ORD-001',
        totalAmount: 99.99,
        currency: 'USD',
        orderDate: new Date(),
        expectedDelivery: new Date(),
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        items: [],
      };

      const mockDelayDetails: DelayDetails = {
        delayDays: 1,
        reason: 'Test delay',
        carrier: 'UPS',
        trackingNumber: '1234567890',
        estimatedDelivery: new Date(),
        lastUpdate: new Date(),
      };

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockEmailServiceInstance.sendDelayNotification).toHaveBeenCalledTimes(1);
      expect(mockSMSServiceInstance.sendDelayNotification).toHaveBeenCalledTimes(1);
    });
  });
});