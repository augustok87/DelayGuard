/**
 * Pre-submission adversarial review — what the GDPR redaction webhooks leave behind.
 *
 * Shopify tests `shop/redact` and `customers/redact` during app review, and the
 * app requests `read_customers`, which puts it under the Protected Customer Data
 * requirements. Both handlers delete a hand-written list of tables, so a table
 * added later is covered only if someone remembered to extend the list. Two were
 * not:
 *
 *   - `data_access_log` keys on a plain `shop_domain` string with no foreign key,
 *     so nothing cascades it. `handleShopRedact` never names it and its rows —
 *     shop domain plus the Shopify staff `user_id` that touched each endpoint —
 *     outlive the shop they describe.
 *   - `customer_intelligence` cascades from `shops`, so shop/redact does reach it,
 *     but `handleCustomerRedact` never names it. A customer erasure request
 *     therefore leaves that customer's `shopify_customer_id`, lifetime spend,
 *     order count and marketing-consent flag in place.
 *
 * These assertions run the production `runMigrations()` against pg-mem rather
 * than `__mocks__/pg.js`, which answers every statement with `rowCount: 1`
 * without reading the WHERE clause — under that stub a DELETE that removed
 * nothing is indistinguishable from one that removed the row.
 *
 * Each gap is pinned by a pair: one test that the erasure happens, and one that
 * it stops at the shop or customer named by the webhook. Without the second, a
 * fix that deleted the whole table would pass.
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { gdprService } from '../../services/gdpr-service';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const SHOP = 'delayguard-dev.myshopify.com';
const OTHER_SHOP = 'someone-else.myshopify.com';
const ERASED_CUSTOMER_ID = 5501;
const KEPT_CUSTOMER_ID = 5502;
const ERASED_CUSTOMER_EMAIL = 'ada@example.com';

interface CountRow {
  count: string;
}

function countWhere(table: string, predicate: string): number {
  return Number(
    selectRows<CountRow>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${predicate}`)[0]
      .count,
  );
}

/**
 * Two shops and two customers. One of each is the subject of the webhook and one
 * is the bystander that must survive it.
 */
function seedTwoShopsTwoCustomers(): void {
  for (const table of [
    'data_access_log',
    'customer_intelligence',
    'delay_alerts',
    'fulfillments',
    'orders',
    'app_settings',
    'shops',
  ]) {
    execSql(`DELETE FROM ${table}`);
  }

  execSql(`INSERT INTO shops (id, shop_domain, access_token, scope)
           VALUES (1, '${SHOP}', 'tok', ARRAY['read_orders']),
                  (2, '${OTHER_SHOP}', 'tok2', ARRAY['read_orders'])`);

  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number,
                               customer_name, customer_email, status, created_at)
           VALUES (1, 1, '9900112233', '#DG1001', 'Ada Lovelace',
                   '${ERASED_CUSTOMER_EMAIL}', 'unfulfilled', '2026-09-20T10:00:00Z')`);

  execSql(`INSERT INTO data_access_log (shop_domain, user_id, path, method, status_code)
           VALUES ('${SHOP}', '77001', '/api/orders', 'GET', 200),
                  ('${SHOP}', '77001', '/api/alerts', 'GET', 200),
                  ('${OTHER_SHOP}', '88002', '/api/orders', 'GET', 200)`);

  execSql(`INSERT INTO customer_intelligence
             (shop_id, shopify_customer_id, orders_count, total_spent, segment, accepts_marketing)
           VALUES (1, '${ERASED_CUSTOMER_ID}', 12, 2400.00, 'vip', TRUE),
                  (1, '${KEPT_CUSTOMER_ID}', 3, 150.00, 'repeat', FALSE),
                  (2, '${ERASED_CUSTOMER_ID}', 1, 20.00, 'new', FALSE)`);
}

describe('GDPR redaction — tables the handlers forget', () => {
  beforeAll(applyProductionSchema);
  beforeEach(seedTwoShopsTwoCustomers);

  describe('shop/redact', () => {
    it('erases the access log for the shop that was redacted', async() => {
      expect(countWhere('data_access_log', `shop_domain = '${SHOP}'`)).toBe(2);

      await gdprService.handleShopRedact({ shop_id: 1, shop_domain: SHOP });

      expect(countWhere('data_access_log', `shop_domain = '${SHOP}'`)).toBe(0);
    });

    it('leaves another shop\'s access log untouched', async() => {
      await gdprService.handleShopRedact({ shop_id: 1, shop_domain: SHOP });

      expect(countWhere('data_access_log', `shop_domain = '${OTHER_SHOP}'`)).toBe(1);
    });

    it('still deletes the shop\'s orders', async() => {
      await gdprService.handleShopRedact({ shop_id: 1, shop_domain: SHOP });

      expect(countWhere('orders', 'shop_id = 1')).toBe(0);
    });
  });

  describe('customers/redact', () => {
    const webhook = {
      shop_id: 1,
      shop_domain: SHOP,
      customer: { id: ERASED_CUSTOMER_ID, email: ERASED_CUSTOMER_EMAIL },
      orders_to_redact: [],
    };

    it('erases the redacted customer\'s intelligence row', async() => {
      await gdprService.handleCustomerRedact(webhook);

      expect(
        countWhere(
          'customer_intelligence',
          `shop_id = 1 AND shopify_customer_id = '${ERASED_CUSTOMER_ID}'`,
        ),
      ).toBe(0);
    });

    it('leaves another customer of the same shop untouched', async() => {
      await gdprService.handleCustomerRedact(webhook);

      expect(
        countWhere(
          'customer_intelligence',
          `shop_id = 1 AND shopify_customer_id = '${KEPT_CUSTOMER_ID}'`,
        ),
      ).toBe(1);
    });

    it('leaves the same customer id at a different shop untouched', async() => {
      await gdprService.handleCustomerRedact(webhook);

      expect(
        countWhere(
          'customer_intelligence',
          `shop_id = 2 AND shopify_customer_id = '${ERASED_CUSTOMER_ID}'`,
        ),
      ).toBe(1);
    });

    it('still anonymizes the customer\'s orders', async() => {
      await gdprService.handleCustomerRedact(webhook);

      expect(
        countWhere('orders', `customer_email = '${ERASED_CUSTOMER_EMAIL}'`),
      ).toBe(0);
    });
  });
});
