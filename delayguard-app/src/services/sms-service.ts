const twilio = require("twilio");
import { OrderInfo, DelayDetails } from "../types";

interface TwilioClient {
  messages: {
    create: (params: { body: string; from: string; to: string }) => Promise<unknown>;
  };
}

export class SMSService {
  private client: TwilioClient;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.client = twilio(accountSid, authToken) as TwilioClient;
    this.phoneNumber = phoneNumber;
  }

  async sendDelaySMS(
    phone: string,
    orderInfo: OrderInfo,
    delayDetails: DelayDetails,
  ): Promise<void> {
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
