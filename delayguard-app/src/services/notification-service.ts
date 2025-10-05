import { OrderInfo, DelayDetails } from '../types';
import { EmailService } from './email-service';
import { SMSService } from './sms-service';

export class NotificationService {
  constructor(
    private emailService: EmailService,
    private smsService: SMSService
  ) {}

  async sendDelayNotification(orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void> {
    if (!orderInfo.customerEmail && !orderInfo.customerPhone) {
      throw new Error('No contact information provided');
    }

    const promises: Promise<void>[] = [];

    if (orderInfo.customerEmail) {
      promises.push(
        this.emailService.sendDelayEmail(orderInfo.customerEmail, orderInfo, delayDetails)
      );
    }

    if (orderInfo.customerPhone) {
      promises.push(
        this.smsService.sendDelaySMS(orderInfo.customerPhone, orderInfo, delayDetails)
      );
    }

    await Promise.all(promises);
  }
}
