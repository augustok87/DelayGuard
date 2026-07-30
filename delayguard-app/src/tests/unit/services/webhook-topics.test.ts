/**
 * The topics we register must be real `WebhookSubscriptionTopic` enum
 * values — R2 live-install fix (B9).
 *
 * On the first real dev-store install, Shopify rejected one of the three
 * topics outright:
 *
 *   FULFILLMENTS_UPDATED -> "Variable $topic of type
 *   WebhookSubscriptionTopic! was provided invalid value"
 *
 * There is no FULFILLMENTS_UPDATED in Shopify's enum. The webhook for
 * `fulfillments/update` is FULFILLMENTS_UPDATE — no trailing D — while
 * order topics do take the past tense (`orders/updated` -> ORDERS_UPDATED).
 * The inconsistency is Shopify's, and we guessed wrong.
 *
 * The existing webhook-registration-service tests could never catch this:
 * they assert our own constant against a hardcoded copy of itself, so they
 * passed happily with an invalid enum. This test checks the topics against
 * the enum values published by Shopify instead.
 *
 * Source: shopify.dev/docs/api/admin-graphql/latest/enums/
 *         WebhookSubscriptionTopic (fetched 2026-07-30), corroborated by
 *         the live rejection above and by ORDERS_UPDATED / ORDERS_PAID
 *         being accepted in the same request batch.
 */
import { WEBHOOK_TOPICS } from "../../../services/webhook-registration-service";

/**
 * Verified members of Shopify's WebhookSubscriptionTopic enum. Only the
 * ones relevant to DelayGuard — extend this (from the docs, not from
 * memory) when adding a topic.
 */
const VERIFIED_TOPIC_ENUM_VALUES = new Set([
  "ORDERS_UPDATED", // orders/updated
  "ORDERS_PAID", // orders/paid
  "FULFILLMENTS_CREATE", // fulfillments/create
  "FULFILLMENTS_UPDATE", // fulfillments/update
]);

describe("webhook topic enums", () => {
  it("registers only topics that exist in Shopify's enum", () => {
    const invalid = WEBHOOK_TOPICS.map((entry) => entry.topic).filter(
      (topic) => !VERIFIED_TOPIC_ENUM_VALUES.has(topic),
    );

    expect(invalid).toEqual([]);
  });

  it("uses FULFILLMENTS_UPDATE, not the past tense Shopify rejected", () => {
    const topics = WEBHOOK_TOPICS.map((entry) => entry.topic);

    expect(topics).toContain("FULFILLMENTS_UPDATE");
    expect(topics).not.toContain("FULFILLMENTS_UPDATED");
  });

  it("still registers all three delay-detection topics", () => {
    expect(WEBHOOK_TOPICS.map((entry) => entry.topic).sort()).toEqual([
      "FULFILLMENTS_UPDATE",
      "ORDERS_PAID",
      "ORDERS_UPDATED",
    ]);
  });

  it("points every topic at a handler path under /webhooks", () => {
    for (const { topic, path: handlerPath } of WEBHOOK_TOPICS) {
      expect(handlerPath.startsWith("/webhooks/")).toBe(true);
      expect(topic).toMatch(/^[A-Z_]+$/);
    }
  });
});
