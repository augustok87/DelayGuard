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
  // app/uninstalled. Read from the enum page (re-fetched 2026-09-22), not
  // from memory, as this list requires: "APP_UNINSTALLED — The webhook topic
  // for `app/uninstalled` events. Occurs whenever a shop has uninstalled the
  // app."
  "APP_UNINSTALLED",
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

  it("still registers the three delay-detection topics, plus uninstall", () => {
    expect(WEBHOOK_TOPICS.map((entry) => entry.topic).sort()).toEqual([
      "APP_UNINSTALLED",
      "FULFILLMENTS_UPDATE",
      "ORDERS_PAID",
      "ORDERS_UPDATED",
    ]);
  });

  it("registers app/uninstalled, without which the sweeps email dead shops", () => {
    // Nothing else tells the app a merchant left: shops.uninstalled_at stays
    // NULL, both cron sweeps keep selecting that shop's orders, and its
    // customers keep receiving delay emails until shop/redact lands 48h later.
    expect(WEBHOOK_TOPICS).toContainEqual({
      topic: "APP_UNINSTALLED",
      path: "/webhooks/app/uninstalled",
    });
  });

  it("points every topic at a handler path under /webhooks", () => {
    for (const { topic, path: handlerPath } of WEBHOOK_TOPICS) {
      expect(handlerPath.startsWith("/webhooks/")).toBe(true);
      expect(topic).toMatch(/^[A-Z_]+$/);
    }
  });
});
