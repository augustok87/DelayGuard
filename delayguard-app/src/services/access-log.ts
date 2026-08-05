/**
 * Access log for protected customer data (LAUNCH_PLAN §6 R7).
 *
 * Shopify's Level 2 protected-customer-data requirements state, verbatim:
 * "Keep an access log to protected customer data". DelayGuard requests
 * Name, Address, Phone and Email — Level 2 — so this is mandatory, and the
 * Partner Dashboard withholds approval without it.
 *
 * This records *who touched what, when*: the shop, the endpoint, the HTTP
 * method and the outcome. It deliberately stores **no customer values** —
 * an audit trail that copies the data it audits is a second breach surface,
 * so the query string is dropped before the path is persisted.
 *
 * Called from `requireAuth` (middleware/shopify-session.ts), which every
 * `/api/*` route carrying customer data passes through.
 */
import { query } from "../database/connection";
import { logger } from "../utils/logger";

/** Matches `data_access_log.path`; longer values are truncated, not dropped. */
const MAX_PATH_LENGTH = 255;

export interface DataAccessEntry {
  shopDomain: string;
  /** `sub` claim of the session token — the admin user, when present. */
  userId?: string;
  path: string;
  method: string;
  statusCode: number;
}

/**
 * Append one entry. Never throws: a logging outage must degrade the audit
 * trail, not 500 a merchant's dashboard.
 */
export async function recordDataAccess(entry: DataAccessEntry): Promise<void> {
  try {
    const path = entry.path.split("?")[0].slice(0, MAX_PATH_LENGTH);

    await query(
      `INSERT INTO data_access_log
         (shop_domain, user_id, path, method, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.shopDomain,
        entry.userId ?? null,
        path,
        entry.method,
        entry.statusCode,
      ],
    );
  } catch (error) {
    logger.error("Failed to record data access", error as Error, {
      shop: entry.shopDomain,
      path: entry.path,
    });
  }
}
