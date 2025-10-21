/**
 * GDPR Service
 * Handles Shopify GDPR webhook requirements:
 * - customers/data_request: Provide customer data
 * - customers/redact: Anonymize customer data
 * - shop/redact: Delete all shop data
 * 
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import type {
  GDPRDataRequestWebhook,
  GDPRCustomerRedactWebhook,
  GDPRShopRedactWebhook,
  GDPRCustomerData,
} from '../types';

export class GDPRService {
  /**
   * Handle customer data request (customers/data_request webhook)
   * Must respond within 30 days with all customer data
   * 
   * @param webhook - GDPR data request webhook payload
   * @returns Complete customer data for export
   */
  async handleDataRequest(
    webhook: GDPRDataRequestWebhook
  ): Promise<GDPRCustomerData> {
    try {
      logger.info('Processing GDPR data request', {
        shop_id: webhook.shop_id,
        customer_id: webhook.customer.id,
        orders_requested: webhook.orders_requested.length,
      });

      const customerId = webhook.customer.id.toString();

      // Fetch all customer orders
      const orders = await this.fetchCustomerOrders(
        webhook.shop_id,
        customerId
      );

      // Fetch all customer alerts
      const alerts = await this.fetchCustomerAlerts(
        webhook.shop_id,
        customerId
      );

      // Fetch all fulfillments
      const fulfillments = await this.fetchCustomerFulfillments(
        webhook.shop_id,
        customerId
      );

      const customerData: GDPRCustomerData = {
        customer_id: customerId,
        email: webhook.customer.email,
        phone: webhook.customer.phone,
        orders: orders.map((order) => ({
          order_id: order.order_id,
          order_number: order.order_number,
          created_at: order.created_at,
          total_amount: order.total_amount,
        })),
        alerts: alerts.map((alert) => ({
          alert_id: alert.alert_id,
          created_at: alert.created_at,
          delay_days: alert.delay_days,
          status: alert.status,
        })),
        fulfillments: fulfillments.map((fulfillment) => ({
          tracking_number: fulfillment.tracking_number,
          carrier: fulfillment.carrier,
          created_at: fulfillment.created_at,
        })),
      };

      logger.info('GDPR data request processed successfully', {
        shop_id: webhook.shop_id,
        customer_id: customerId,
        orders_count: orders.length,
        alerts_count: alerts.length,
        fulfillments_count: fulfillments.length,
      });

      return customerData;
    } catch (error) {
      logger.error('Error processing GDPR data request', error as Error);
      throw error;
    }
  }

  /**
   * Handle customer redaction (customers/redact webhook)
   * Must anonymize or delete customer PII within 30 days
   * 
   * @param webhook - GDPR customer redact webhook payload
   */
  async handleCustomerRedact(
    webhook: GDPRCustomerRedactWebhook
  ): Promise<void> {
    try {
      logger.info('Processing GDPR customer redaction', {
        shop_id: webhook.shop_id,
        customer_id: webhook.customer.id,
        orders_to_redact: webhook.orders_to_redact.length,
      });

      const customerId = webhook.customer.id.toString();
      const anonymizedEmail = `redacted-customer-${webhook.customer.id}@privacy.invalid`;
      const anonymizedName = `redacted-customer-${webhook.customer.id}`;

      // Anonymize customer data in orders
      const ordersResult = await query<{ count: number }>(
        `UPDATE orders 
         SET customer_email = $1,
             customer_name = $2,
             customer_phone = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $4)
           AND customer_email = $5`,
        [
          anonymizedEmail,
          anonymizedName,
          null, // Remove phone number
          webhook.shop_id,
          webhook.customer.email,
        ]
      );

      // Anonymize customer data in alerts
      const alertsResult = await query<{ count: number }>(
        `UPDATE delay_alerts 
         SET customer_email = $1,
             customer_name = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id IN (
           SELECT id FROM orders 
           WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $3)
             AND customer_email = $4
         )`,
        [anonymizedEmail, anonymizedName, webhook.shop_id, anonymizedEmail]
      );

      // No PII in fulfillments table (only tracking numbers)
      const fulfillmentsResult = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM fulfillments
         WHERE order_id IN (
           SELECT id FROM orders
           WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $1)
             AND customer_email = $2
         )`,
        [webhook.shop_id, anonymizedEmail]
      );

      logger.info('GDPR customer redaction completed successfully', {
        shop_id: webhook.shop_id,
        customer_id: webhook.customer.id,
        orders_redacted: ordersResult[0]?.count || 0,
        alerts_redacted: alertsResult[0]?.count || 0,
        fulfillments_checked: fulfillmentsResult[0]?.count || 0,
      });
    } catch (error) {
      logger.error('Error processing GDPR customer redaction', error as Error);
      throw error;
    }
  }

  /**
   * Handle shop redaction (shop/redact webhook)
   * Delete all shop data within 48 hours of app uninstall
   * 
   * @param webhook - GDPR shop redact webhook payload
   */
  async handleShopRedact(webhook: GDPRShopRedactWebhook): Promise<void> {
    try {
      logger.info('Processing GDPR shop redaction', {
        shop_id: webhook.shop_id,
        shop_domain: webhook.shop_domain,
      });

      // Get shop UUID from shop_id
      const shopResult = await query<{ id: string }>(
        'SELECT id FROM shops WHERE shop_domain = $1',
        [webhook.shop_domain]
      );

      if (shopResult.length === 0) {
        logger.info('Shop not found for GDPR redaction, may already be deleted', {
          shop_domain: webhook.shop_domain,
        });
        return;
      }

      const shopUuid = shopResult[0].id;

      // Delete in order of referential integrity
      // 1. Delete delay alerts
      const alertsResult = await query<{ count: number }>(
        `DELETE FROM delay_alerts 
         WHERE order_id IN (SELECT id FROM orders WHERE shop_id = $1)`,
        [shopUuid]
      );

      // 2. Delete fulfillments
      const fulfillmentsResult = await query<{ count: number }>(
        `DELETE FROM fulfillments 
         WHERE order_id IN (SELECT id FROM orders WHERE shop_id = $1)`,
        [shopUuid]
      );

      // 3. Delete orders
      const ordersResult = await query<{ count: number }>(
        'DELETE FROM orders WHERE shop_id = $1',
        [shopUuid]
      );

      // 4. Delete app settings
      const settingsResult = await query<{ count: number }>(
        'DELETE FROM app_settings WHERE shop_id = $1',
        [shopUuid]
      );

      // 5. Delete shop
      const shopsResult = await query<{ count: number }>(
        'DELETE FROM shops WHERE id = $1',
        [shopUuid]
      );

      logger.info('GDPR shop redaction completed successfully', {
        shop_id: webhook.shop_id,
        shop_domain: webhook.shop_domain,
        alerts_deleted: alertsResult[0]?.count || 0,
        fulfillments_deleted: fulfillmentsResult[0]?.count || 0,
        orders_deleted: ordersResult[0]?.count || 0,
        settings_deleted: settingsResult[0]?.count || 0,
        shops_deleted: shopsResult[0]?.count || 0,
      });
    } catch (error) {
      logger.error('Error processing GDPR shop redaction', error as Error);
      throw error;
    }
  }

  /**
   * Fetch all orders for a customer
   * @private
   */
  private async fetchCustomerOrders(
    shopId: number,
    customerId: string
  ): Promise<
    Array<{
      order_id: string;
      order_number: string;
      created_at: string;
      total_amount?: number;
    }>
  > {
    return await query(
      `SELECT 
        shopify_order_id as order_id,
        order_number,
        created_at,
        0 as total_amount
       FROM orders
       WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $1)
         AND shopify_order_id = $2`,
      [shopId, customerId]
    );
  }

  /**
   * Fetch all alerts for a customer
   * @private
   */
  private async fetchCustomerAlerts(
    shopId: number,
    customerId: string
  ): Promise<
    Array<{
      alert_id: string;
      created_at: string;
      delay_days: number;
      status: string;
    }>
  > {
    return await query(
      `SELECT 
        id as alert_id,
        created_at,
        delay_days,
        status
       FROM delay_alerts
       WHERE order_id IN (
         SELECT id FROM orders
         WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $1)
           AND shopify_order_id = $2
       )`,
      [shopId, customerId]
    );
  }

  /**
   * Fetch all fulfillments for a customer
   * @private
   */
  private async fetchCustomerFulfillments(
    shopId: number,
    customerId: string
  ): Promise<
    Array<{
      tracking_number: string;
      carrier: string;
      created_at: string;
    }>
  > {
    return await query(
      `SELECT 
        tracking_number,
        carrier_code as carrier,
        created_at
       FROM fulfillments
       WHERE order_id IN (
         SELECT id FROM orders
         WHERE shop_id = (SELECT id FROM shops WHERE shop_id = $1)
           AND shopify_order_id = $2
       )`,
      [shopId, customerId]
    );
  }
}

// Export singleton instance
export const gdprService = new GDPRService();

