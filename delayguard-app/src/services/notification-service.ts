import { OrderInfo, DelayDetails } from "../types";
import { EmailService } from "./email-service";
import { SMSService } from "./sms-service";

/**
 * Multi-Channel Notification Service
 *
 * Provides comprehensive notification capabilities for shipping delays across
 * multiple communication channels including email and SMS. This service
 * implements intelligent routing, template management, and delivery tracking.
 *
 * @class NotificationService
 * @since 1.0.0
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const emailService = new EmailService();
 * const smsService = new SMSService();
 * const notificationService = new NotificationService(emailService, smsService);
 *
 * await notificationService.sendDelayNotification(orderInfo, delayDetails);
 * ```
 *
 * @see {@link OrderInfo} for order information structure
 * @see {@link DelayDetails} for delay details structure
 */
export class NotificationService {
  /**
   * Creates a new NotificationService instance
   *
   * @constructor
   * @param {EmailService} emailService - Email notification service
   * @param {SMSService} smsService - SMS notification service
   *
   * @example
   * ```typescript
   * const notificationService = new NotificationService(
   *   new EmailService(),
   *   new SMSService()
   * );
   * ```
   */
  constructor(
    private emailService: EmailService,
    private smsService: SMSService,
  ) {}

  /**
   * Sends delay notification through available channels
   *
   * Intelligently routes delay notifications through email and/or SMS based on
   * available customer contact information. The method ensures at least one
   * notification channel is available before attempting to send.
   *
   * @method sendDelayNotification
   * @public
   * @async
   * @since 1.0.0
   *
   * @param {OrderInfo} orderInfo - Order information including customer details
   * @param {DelayDetails} delayDetails - Delay information and details
   *
   * @example
   * ```typescript
   * const orderInfo: OrderInfo = {
   *   orderNumber: '1001',
   *   customerName: 'John Doe',
   *   customerEmail: 'john@example.com',
   *   customerPhone: '+1234567890',
   *   trackingNumber: '1Z999AA1234567890'
   * };
   *
   * const delayDetails: DelayDetails = {
   *   delayDays: 3,
   *   originalDeliveryDate: '2024-01-12',
   *   estimatedDeliveryDate: '2024-01-15',
   *   reason: 'Weather delay'
   * };
   *
   * await notificationService.sendDelayNotification(orderInfo, delayDetails);
   * ```
   *
   * @returns {Promise<void>} Resolves when all notifications are sent
   *
   * @throws {Error} If no contact information is provided
   * @throws {Error} If notification sending fails
   *
   * @see {@link EmailService#sendDelayEmail} for email notification details
   * @see {@link SMSService#sendDelaySMS} for SMS notification details
   */
  async sendDelayNotification(
    orderInfo: OrderInfo,
    delayDetails: DelayDetails,
  ): Promise<void> {
    if (!orderInfo.customerEmail && !orderInfo.customerPhone) {
      throw new Error("No contact information provided");
    }

    // Validate delay details
    if (!delayDetails || typeof delayDetails !== "object") {
      throw new Error("Invalid delay details provided");
    }

    if (
      !delayDetails.estimatedDelivery ||
      !delayDetails.delayDays ||
      delayDetails.delayDays < 0
    ) {
      throw new Error(
        "Invalid delay details: missing required fields or invalid values",
      );
    }

    const promises: Promise<void>[] = [];

    if (orderInfo.customerEmail) {
      promises.push(
        this.emailService.sendDelayEmail(
          orderInfo.customerEmail,
          orderInfo,
          delayDetails,
        ),
      );
    }

    if (orderInfo.customerPhone) {
      promises.push(
        this.smsService.sendDelaySMS(
          orderInfo.customerPhone,
          orderInfo,
          delayDetails,
        ),
      );
    }

    await Promise.all(promises);
  }
}
