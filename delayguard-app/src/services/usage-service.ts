/**
 * Per-shop usage measurement.
 *
 * The free plan declares `monthly_alert_limit: 50` in three config files and no
 * code counts anything, so the limit is documentation rather than a mechanism.
 * This service supplies the measurement a cap would need — and deliberately
 * stops there. Enforcement is not wired anywhere: blocking a free merchant when
 * there is no paid plan to upgrade to would break the app and earn nothing.
 *
 * Two numbers, because they are not the same number:
 *
 *   - `alertsThisMonth` is the OUTPUT — what a 50-alert cap would limit and what
 *     a merchant would recognise as their usage.
 *   - `ordersMonitored` is the COST DRIVER. `delay-check-sweep` scans every
 *     undelivered order from the last 30 days whether or not it alerts, so the
 *     infrastructure bill follows this figure, not the one above. A shop with
 *     50,000 quiet orders costs Redis commands, Neon compute and Vercel
 *     invocations on all 50,000 while sending nothing.
 *
 * Capping only the first would limit what the merchant sees and leave the bill
 * untouched, which is why both are collected.
 *
 * Nothing here writes: both figures are derived from `orders` and `delay_alerts`
 * as they already stand, so there is no new table, no migration and no extra
 * work on the send path.
 */
import { query } from "../database/connection";

/** Mirrors `delay-check-sweep`'s candidate window. Changing one without the
 *  other makes the usage figure count a different population than the job. */
const MONITORED_WINDOW_DAYS = 30;

export interface ShopUsage {
  shopDomain: string;
  /** Alerts raised since the start of the current calendar month. */
  alertsThisMonth: number;
  /** Orders the sweep would currently scan — what the bill actually follows. */
  ordersMonitored: number;
}

interface CountRow {
  shop_domain: string;
  count: string;
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function monitoredSince(now: Date): Date {
  return new Date(now.getTime() - MONITORED_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Usage for every installed shop, including shops with no activity — a quiet
 * shop reading zero is a finding, whereas a missing row is ambiguous.
 *
 * `now` is injected so the month boundary is deterministic under test; the
 * production callers pass nothing.
 */
export async function collectShopUsage(now: Date = new Date()): Promise<ShopUsage[]> {
  const alertRows = await query<CountRow>(
    `SELECT s.shop_domain, COUNT(a.id) AS count
     FROM shops s
     JOIN orders o ON o.shop_id = s.id
     JOIN delay_alerts a ON a.order_id = o.id
     WHERE s.uninstalled_at IS NULL
       AND a.created_at >= $1
     GROUP BY s.shop_domain`,
    [startOfMonth(now)],
  );

  const orderRows = await query<CountRow>(
    `SELECT s.shop_domain, COUNT(o.id) AS count
     FROM shops s
     JOIN orders o ON o.shop_id = s.id
     WHERE s.uninstalled_at IS NULL
       AND (o.tracking_status IS NULL OR o.tracking_status <> 'DELIVERED')
       AND o.created_at >= $1
     GROUP BY s.shop_domain`,
    [monitoredSince(now)],
  );

  const installed = await query<{ shop_domain: string }>(
    `SELECT shop_domain FROM shops WHERE uninstalled_at IS NULL`,
  );

  const alerts = new Map(alertRows.map(r => [r.shop_domain, Number(r.count)]));
  const orders = new Map(orderRows.map(r => [r.shop_domain, Number(r.count)]));

  return installed.map(({ shop_domain }) => ({
    shopDomain: shop_domain,
    alertsThisMonth: alerts.get(shop_domain) ?? 0,
    ordersMonitored: orders.get(shop_domain) ?? 0,
  }));
}
