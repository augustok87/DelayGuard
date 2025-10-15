const twilio = require('twilio');
import { OrderInfo, DelayDetails } from '../types';

export class SMSService {
  private client: any;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.phoneNumber = phoneNumber;
  }

  async sendDelaySMS(phone: string, orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void> {
    const message = `Hi ${orderInfo.customerName}, your order #${orderInfo.orderNumber} is delayed. New delivery: ${delayDetails.estimatedDelivery}. Track: ${delayDetails.trackingUrl}`;

    try {
      await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phone,
      });
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error}`);
    }
  }
}
