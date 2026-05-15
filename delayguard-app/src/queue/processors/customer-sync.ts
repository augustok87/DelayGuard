/**
 * BullMQ customer-sync processor — Phase 2.1.a.
 *
 * Triggered by addCustomerSyncJob (queue/setup.ts), enqueued from
 * routes/webhooks.ts after orderUpsertService.upsertOrderFromWebhook
 * returns successfully. Thin wrapper: hands the (shopDomain,
 * shopifyOrderId) tuple to CustomerSyncService and lets its exceptions
 * propagate so BullMQ's attempts:3 retry chain runs.
 *
 * Why a separate processor (rather than calling the service inline from
 * the webhook handler): keeps the Shopify Customer GraphQL call off the
 * webhook ACK path. The webhook returns 200 once the order is persisted;
 * the customer-sync runs asynchronously. If Shopify's customer endpoint
 * is briefly 5xx, the webhook still ACKs and the retry happens on the
 * BullMQ side instead of forcing Shopify to retry the whole webhook.
 */
import { Job } from "bullmq";
import { logger } from "../../utils/logger";
import { CustomerSyncService } from "../../services/customer-sync-service";

interface CustomerSyncJobData {
  shopDomain: string;
  shopifyOrderId: string;
}

export async function processCustomerSync(
  job: Job<CustomerSyncJobData>,
): Promise<void> {
  const { shopDomain, shopifyOrderId } = job.data;

  logger.info("Processing customer sync", { shopDomain, shopifyOrderId });

  const service = new CustomerSyncService();
  await service.syncCustomerForOrder(shopDomain, shopifyOrderId);
}
