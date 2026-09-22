/**
 * app/uninstalled — the shop must stop being swept the moment it uninstalls.
 *
 * Before this test there was no uninstall handling at all: no route, no topic
 * registration, no column. A merchant who removed DelayGuard left a live
 * `shops` row behind, and both cron sweeps kept selecting that shop's orders
 * and emailing its customers until `shop/redact` arrived 48 hours later.
 *
 * `pg` is a real SQL engine here (pg-mem carrying the production schema built
 * by `runMigrations()` itself), because every assertion below is about what a
 * statement DID — which row the UPDATE touched, and whether the others were
 * left alone. `__mocks__/pg.js` answers every UPDATE with `rowCount: 1` and
 * never reads a WHERE clause, so it can see none of it (tests.md, R17).
 *
 * The matching half — that the two cron sweeps stop selecting a marked shop —
 * lives in tests/unit/queue/sweeps-skip-uninstalled-shops.test.ts, because
 * pg-mem cannot execute either sweep query (two measured gaps: correlated
 * `LEFT JOIN LATERAL`, and TIMESTAMP vs `NOW() - INTERVAL`).
 *
 * The webhook is driven end-to-end through supertest so the HMAC gate, the
 * route and the SQL are exercised as one seam rather than three mocks
 * agreeing with each other (tests.md, R12).
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import crypto from 'crypto';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import request from 'supertest';

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  // connection.ts runs for real here and uses the function-style exports.
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { webhookRoutes } from '../../routes/webhooks';
import { ShopAuthService } from '../../services/shop-auth-service';

const WEBHOOK_SECRET = 'test-secret';
const LEAVING_SHOP = 'leaving-shop.myshopify.com';
const STAYING_SHOP = 'staying-shop.myshopify.com';

interface ShopRow {
  id: number;
  shop_domain: string;
  access_token: string;
  uninstalled_at: Date | null;
}

function shops(): ShopRow[] {
  return selectRows<ShopRow>(
    'SELECT id, shop_domain, access_token, uninstalled_at FROM shops ORDER BY id',
  );
}

function shopRow(domain: string): ShopRow {
  const row = shops().find((s) => s.shop_domain === domain);
  if (!row) throw new Error(`No shops row for ${domain}`);
  return row;
}

function sign(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body, 'utf8').digest('base64');
}

function buildApp(): Koa {
  const app = new Koa();
  app.use(async(ctx, next) => {
    if (ctx.request.body) {
      ctx.request.rawBody = JSON.stringify(ctx.request.body);
    }
    await next();
  });
  app.use(bodyParser());
  const root = new Router();
  root.use('/webhooks', webhookRoutes.routes(), webhookRoutes.allowedMethods());
  app.use(root.routes());
  app.use(root.allowedMethods());
  return app;
}

/**
 * Two installed shops, each with one sweep-eligible order carrying one
 * unsent alert. Ids are explicit: SERIAL does not rewind on DELETE, so
 * leaving them to the sequence would make assertions depend on test order.
 */
function seedTwoInstalledShops(): void {
  execSql('DELETE FROM delay_alerts');
  execSql('DELETE FROM app_settings');
  execSql('DELETE FROM orders');
  execSql('DELETE FROM shops');

  let shopId = 1;
  for (const domain of [LEAVING_SHOP, STAYING_SHOP]) {
    execSql(`INSERT INTO shops (id, shop_domain, access_token, scope)
             VALUES (${shopId}, '${domain}', 'shpat_live_${shopId}', ARRAY['read_orders'])`);
    execSql(`INSERT INTO app_settings (shop_id, email_enabled, sms_enabled)
             VALUES (${shopId}, TRUE, FALSE)`);
    execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status, created_at)
             VALUES (${shopId}, ${shopId}, '99001${shopId}', '#DG100${shopId}', 'Ada Lovelace', 'ada${shopId}@example.com', 'unfulfilled', NOW())`);
    execSql(`INSERT INTO delay_alerts (id, order_id, delay_days, delay_reason, created_at, email_sent, sms_sent)
             VALUES (${shopId}, ${shopId}, 3, 'CARRIER_DELAY', NOW(), FALSE, FALSE)`);
    shopId += 1;
  }
}

async function postUninstall(shopDomain: string, hmac?: string): Promise<request.Response> {
  const payload = { id: 1234, domain: shopDomain };
  const body = JSON.stringify(payload);
  return request(buildApp().callback())
    .post('/webhooks/app/uninstalled')
    .set('X-Shopify-Hmac-Sha256', hmac ?? sign(body))
    .set('X-Shopify-Shop-Domain', shopDomain)
    .set('Content-Type', 'application/json')
    .send(payload);
}

beforeAll(applyProductionSchema);

beforeEach(() => {
  process.env.SHOPIFY_API_SECRET = WEBHOOK_SECRET;
  jest.clearAllMocks();
  seedTwoInstalledShops();
});

describe('POST /webhooks/app/uninstalled', () => {
  it('marks only the uninstalling shop, leaving every other shop untouched', async() => {
    const response = await postUninstall(LEAVING_SHOP);

    expect(response.status).toBe(200);
    expect(shopRow(LEAVING_SHOP).uninstalled_at).toBeInstanceOf(Date);
    expect(shopRow(STAYING_SHOP).uninstalled_at).toBeNull();
  });

  it('does not delete the shop row — shop/redact owns deletion 48h later', async() => {
    await postUninstall(LEAVING_SHOP);

    expect(shops()).toHaveLength(2);
    expect(shopRow(LEAVING_SHOP).access_token).toBe('shpat_live_1');
    expect(
      selectRows('SELECT id FROM orders WHERE shop_id = 1'),
    ).toHaveLength(1);
  });

  it('rejects a bad HMAC with 401 and writes nothing', async() => {
    const response = await postUninstall(LEAVING_SHOP, 'not-a-valid-signature');

    expect(response.status).toBe(401);
    expect(shopRow(LEAVING_SHOP).uninstalled_at).toBeNull();
  });

  it('silently skips an unknown shop with a 200 so Shopify stops retrying', async() => {
    const response = await postUninstall('never-installed.myshopify.com');

    expect(response.status).toBe(200);
    expect(shops().every((s) => s.uninstalled_at === null)).toBe(true);
  });
});

describe('reinstall', () => {
  it('clears uninstalled_at so the shop is swept again', async() => {
    await postUninstall(LEAVING_SHOP);
    expect(shopRow(LEAVING_SHOP).uninstalled_at).toBeInstanceOf(Date);

    await new ShopAuthService().upsertShop({
      shopDomain: LEAVING_SHOP,
      accessToken: 'shpat_reinstalled',
      scope: 'read_orders,write_orders',
    });

    expect(shopRow(LEAVING_SHOP).uninstalled_at).toBeNull();
    expect(shopRow(LEAVING_SHOP).access_token).toBe('shpat_reinstalled');
  });
});
