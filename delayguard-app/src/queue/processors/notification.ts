import { Job } from 'bullmq';
import { NotificationService } from '../../services/notification-service';
import { EmailService } from '../../services/email-service';
import { SMSService } from '../../services/sms-service';
import { query } from '../../database/connection';
import { AppConfig } from '../../types';

interface NotificationJobData {
  orderId: number;
  delayDetails: {
    estimatedDelivery: string;
    trackingNumber: string;
    trackingUrl: string;
    delayDays: number;
    delayReason: string;
  };
  shopDomain: string;
}

export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, delayDetails, shopDomain } = job.data;

  try {
    console.log(`📧 Processing notification for order ${orderId}`);

    // Get order and shop details
    const orderResult = await query(
      `SELECT o.*, s.email_enabled, s.sms_enabled, s.notification_template
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1`,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderResult.rows[0];

    // Check if notifications are already sent
    const alertResult = await query(
      `SELECT email_sent, sms_sent FROM delay_alerts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    );

    if (alertResult.rows.length === 0) {
      throw new Error(`No delay alert found for order ${orderId}`);
    }

    const alert = alertResult.rows[0];

    // Initialize services
    const emailService = new EmailService(process.env.SENDGRID_API_KEY!);
    const smsService = new SMSService(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      process.env.TWILIO_PHONE_NUMBER!,
    );
    const notificationService = new NotificationService(emailService, smsService);

    // Prepare order info
    const orderInfo = {
      id: order.shopify_order_id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shopDomain: order.shop_domain,
      createdAt: order.created_at,
    };

    // Send notifications based on settings and what hasn't been sent
    const promises: Promise<void>[] = [];

    if (order.email_enabled && order.customer_email && !alert.email_sent) {
      promises.push(
        notificationService.sendDelayNotification(orderInfo, delayDetails)
          .then(async() => {
            // Mark email as sent
            await query(
              `UPDATE delay_alerts SET email_sent = TRUE WHERE order_id = $1`,
              [orderId],
            );
            console.log(`✅ Email sent for order ${orderId}`);
          })
          .catch(error => {
            console.error(`❌ Failed to send email for order ${orderId}:`, error);
            throw error;
          }),
      );
    }

    if (order.sms_enabled && order.customer_phone && !alert.sms_sent) {
      promises.push(
        notificationService.sendDelayNotification(orderInfo, delayDetails)
          .then(async() => {
            // Mark SMS as sent
            await query(
              `UPDATE delay_alerts SET sms_sent = TRUE WHERE order_id = $1`,
              [orderId],
            );
            console.log(`✅ SMS sent for order ${orderId}`);
          })
          .catch(error => {
            console.error(`❌ Failed to send SMS for order ${orderId}:`, error);
            throw error;
          }),
      );
    }

    if (promises.length === 0) {
      console.log(`ℹ️ No notifications to send for order ${orderId}`);
      return;
    }

    // Wait for all notifications to complete
    await Promise.all(promises);

    console.log(`✅ All notifications processed for order ${orderId}`);

  } catch (error) {
    console.error(`❌ Error processing notification for order ${orderId}:`, error);
    throw error;
  }
}
