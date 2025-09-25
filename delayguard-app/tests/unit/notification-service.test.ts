import { NotificationService } from '../../src/services/notification-service';
import { EmailService } from '../../src/services/email-service';
import { SMSService } from '../../src/services/sms-service';

// Mock external services
jest.mock('../../src/services/email-service');
jest.mock('../../src/services/sms-service');

describe('Notification Service', () => {
  let notificationService: NotificationService;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockSMSService: jest.Mocked<SMSService>;

  beforeEach(() => {
    mockEmailService = new EmailService('test-api-key') as jest.Mocked<EmailService>;
    mockSMSService = new SMSService('test-sid', 'test-token', '+1234567890') as jest.Mocked<SMSService>;
    notificationService = new NotificationService(mockEmailService, mockSMSService);
  });

  describe('sendDelayNotification', () => {
    it('should send email notification when email is provided', async () => {
      const orderInfo = {
        id: 'order-123',
        orderNumber: '1001',
        customerName: 'John Doe',
        customerEmail: 'test@example.com',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date()
      };
      const delayDetails = {
        estimatedDelivery: '2024-02-15',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com',
        delayDays: 5,
        delayReason: 'DATE_DELAY'
      };

      await notificationService.sendDelayNotification(orderInfo, delayDetails);

      expect(mockEmailService.sendDelayEmail).toHaveBeenCalledWith(
        'test@example.com',
        orderInfo,
        delayDetails
      );
    });

    it('should send SMS notification when phone is provided', async () => {
      const orderInfo = {
        id: 'order-123',
        orderNumber: '1001',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date()
      };
      const delayDetails = {
        estimatedDelivery: '2024-02-15',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com',
        delayDays: 5,
        delayReason: 'DATE_DELAY'
      };

      await notificationService.sendDelayNotification(orderInfo, delayDetails);

      expect(mockSMSService.sendDelaySMS).toHaveBeenCalledWith(
        '+1234567890',
        orderInfo,
        delayDetails
      );
    });

    it('should send both email and SMS when both are provided', async () => {
      const orderInfo = {
        id: 'order-123',
        orderNumber: '1001',
        customerName: 'John Doe',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date()
      };
      const delayDetails = {
        estimatedDelivery: '2024-02-15',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com',
        delayDays: 5,
        delayReason: 'DATE_DELAY'
      };

      await notificationService.sendDelayNotification(orderInfo, delayDetails);

      expect(mockEmailService.sendDelayEmail).toHaveBeenCalled();
      expect(mockSMSService.sendDelaySMS).toHaveBeenCalled();
    });

    it('should handle missing contact information gracefully', async () => {
      const orderInfo = {
        id: 'order-123',
        orderNumber: '1001',
        customerName: 'John Doe',
        shopDomain: 'test-shop.myshopify.com',
        createdAt: new Date()
      };
      const delayDetails = {
        estimatedDelivery: '2024-02-15',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com',
        delayDays: 5,
        delayReason: 'DATE_DELAY'
      };

      await expect(
        notificationService.sendDelayNotification(orderInfo, delayDetails)
      ).rejects.toThrow('No contact information provided');
    });
  });
});
