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
      sendDelayEmail: jest.fn(),
    } as any;

    mockSMSServiceInstance = {
      sendDelaySMS: jest.fn(),
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
      id: 'order-123',
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      customerEmail: 'customer@example.com',
      customerPhone: '+1234567890',
      shopDomain: 'test-shop.myshopify.com',
      createdAt: new Date('2024-01-15'),
    };

    const mockDelayDetails: DelayDetails = {
      estimatedDelivery: '2024-01-21',
      trackingNumber: '1Z999AA1234567890',
      trackingUrl: 'https://www.ups.com/track?trackingNumber=1Z999AA1234567890',
      delayDays: 3,
      delayReason: 'Weather delay',
    };

    it('should send email notification successfully', async () => {
      mockEmailServiceInstance.sendDelayEmail.mockResolvedValue(undefined);

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockEmailServiceInstance.sendDelayEmail).toHaveBeenCalledWith(
        mockOrderInfo.customerEmail,
        mockOrderInfo,
        mockDelayDetails
      );
    });

    it('should send SMS notification successfully', async () => {
      mockSMSServiceInstance.sendDelaySMS.mockResolvedValue(undefined);

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockSMSServiceInstance.sendDelaySMS).toHaveBeenCalledWith(
        mockOrderInfo.customerPhone,
        mockOrderInfo,
        mockDelayDetails
      );
    });

    it('should handle email service errors gracefully', async () => {
      const error = new Error('Email service unavailable');
      mockEmailServiceInstance.sendDelayEmail.mockRejectedValue(error);

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails)
      ).rejects.toThrow('Email service unavailable');
    });

    it('should handle SMS service errors gracefully', async () => {
      const error = new Error('SMS service unavailable');
      mockSMSServiceInstance.sendDelaySMS.mockRejectedValue(error);

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails)
      ).rejects.toThrow('SMS service unavailable');
    });

    it('should handle both services failing', async () => {
      const emailError = new Error('Email service unavailable');
      const smsError = new Error('SMS service unavailable');
      
      mockEmailServiceInstance.sendDelayEmail.mockRejectedValue(emailError);
      mockSMSServiceInstance.sendDelaySMS.mockRejectedValue(smsError);

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
        estimatedDelivery: '2024-01-21',
        trackingNumber: '1234567890',
        trackingUrl: 'https://www.ups.com/track?trackingNumber=1234567890',
        delayDays: 1,
        delayReason: 'Test delay',
      };

      await expect(
        notificationService.sendDelayNotification(invalidOrderInfo, mockDelayDetails)
      ).rejects.toThrow();
    });

    it('should handle invalid delay details', async () => {
      const mockOrderInfo: OrderInfo = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date(),
      };

      const invalidDelayDetails = {} as DelayDetails;

      await expect(
        notificationService.sendDelayNotification(mockOrderInfo, invalidDelayDetails)
      ).rejects.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should call both services when both are available', async () => {
      mockEmailServiceInstance.sendDelayEmail.mockResolvedValue(undefined);
      mockSMSServiceInstance.sendDelaySMS.mockResolvedValue(undefined);

      const mockOrderInfo: OrderInfo = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date(),
      };

      const mockDelayDetails: DelayDetails = {
        estimatedDelivery: '2024-01-21',
        trackingNumber: '1234567890',
        trackingUrl: 'https://www.ups.com/track?trackingNumber=1234567890',
        delayDays: 1,
        delayReason: 'Test delay',
      };

      await notificationService.sendDelayNotification(mockOrderInfo, mockDelayDetails);

      expect(mockEmailServiceInstance.sendDelayEmail).toHaveBeenCalledTimes(1);
      expect(mockSMSServiceInstance.sendDelaySMS).toHaveBeenCalledTimes(1);
    });
  });
});