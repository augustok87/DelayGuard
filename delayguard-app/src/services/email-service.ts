import sgMail from '@sendgrid/mail';
import { OrderInfo, DelayDetails } from '../types';

export class EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    sgMail.setApiKey(apiKey);
  }

  async sendDelayEmail(email: string, orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void> {
    const msg = {
      to: email,
      from: 'noreply@delayguard.app',
      templateId: 'd-delay-notification-template',
      dynamicTemplateData: {
        customerName: orderInfo.customerName,
        orderNumber: orderInfo.orderNumber,
        newDeliveryDate: delayDetails.estimatedDelivery,
        trackingNumber: delayDetails.trackingNumber,
        trackingUrl: delayDetails.trackingUrl,
        delayDays: delayDetails.delayDays,
        delayReason: delayDetails.delayReason
      }
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}
