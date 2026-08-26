/**
 * Real-SQL test harness (LAUNCH_PLAN §6 R17).
 *
 * The default Jest config maps `pg` to `__mocks__/pg.js`, whose MockClient
 * answers EVERY `UPDATE` with `rowCount: 1` regardless of what the statement
 * would actually touch. That is precisely why 2,446 tests could not see R17:
 * an `UPDATE … WHERE order_id = $1` that flips four rows is indistinguishable
 * from one that flips the single intended row when the driver is a stub that
 * never reads the WHERE clause.
 *
 * This harness swaps in `pg-mem` — a real SQL engine — and builds the schema
 * by running the PRODUCTION `runMigrations()` against it, so the tables under
 * test are the ones the app actually deploys rather than a transcription that
 * drifts.
 *
 * Usage — the `jest.mock` call is hoisted, so it must live in the test file:
 *
 *   jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());
 *   import { applyProductionSchema, selectRows } from '../helpers/pg-mem-schema';
 *   beforeAll(applyProductionSchema);
 *
 * Two fidelity gaps, both deliberate and both narrow:
 *
 * 1. plpgsql. `runMigrations()` performs its additive column migrations inside
 *    `DO $$ … END $$` blocks and pg-mem has no plpgsql interpreter. The shim
 *    below runs the `ALTER TABLE … ADD COLUMN` statements found in each block
 *    and swallows duplicate-column errors — the same observable outcome as the
 *    guarded block, which adds the columns exactly when they are absent. On a
 *    freshly-created database they always are, so the `IF NOT EXISTS` predicate
 *    needs no interpretation.
 *
 * 2. Backfills. A few one-shot data backfills use syntax pg-mem does not
 *    implement (`UPDATE … FROM (subquery)`). While the schema is being built,
 *    a failing *DML* statement is skipped and recorded; a failing *DDL*
 *    statement still throws. Backfills move data between columns that already
 *    exist, so skipping them cannot change the schema under test — and any
 *    test that depends on backfilled data would be asserting against fixtures
 *    it wrote itself anyway.
 */
import { newDb, IMemoryDb } from 'pg-mem';

let memDb: IMemoryDb | null = null;
let migrating = false;
const skippedBackfills: string[] = [];

const DDL = /^\s*(CREATE|ALTER|DROP|TRUNCATE|COMMENT)\b/i;

interface QueryResultLike {
  rows: unknown[];
  rowCount: number;
}

interface PgQueryableLike {
  query: (text: string, params?: unknown[]) => Promise<QueryResultLike>;
  release?: () => void;
}

interface PgPoolLike extends PgQueryableLike {
  connect: () => Promise<PgQueryableLike & { release: () => void }>;
  end?: () => Promise<void>;
}

/**
 * `pg`-shaped module object backed by pg-mem. Intended to be returned straight
 * from a `jest.mock('pg', …)` factory, which is what constructs the database.
 */
export function createMemPg(): { Pool: unknown; Client: unknown; default: unknown } {
  const db = newDb();
  memDb = db;
  skippedBackfills.length = 0;

  db.registerLanguage('plpgsql', ({ code }) => {
    const statements = code.match(/ALTER TABLE[\s\S]*?;/gi) ?? [];
    return () => {
      for (const statement of statements) {
        try {
          db.public.none(statement);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/already exists|duplicate/i.test(message)) {
            throw error;
          }
        }
      }
    };
  });

  const adapter = db.adapters.createPg() as unknown as {
    Pool: new (config?: unknown) => PgPoolLike;
    Client: unknown;
  };

  // Tolerate unsupported one-shot DML backfills, and ONLY while the schema is
  // being built. Outside applyProductionSchema() every statement runs for real
  // — that is the whole point of the harness.
  function rescue(error: unknown, sql: string): QueryResultLike {
    if (!migrating || DDL.test(sql)) {
      throw error;
    }
    skippedBackfills.push(sql.trim().slice(0, 80));
    return { rows: [], rowCount: 0 };
  }

  function tolerant<T extends PgQueryableLike>(target: T): T {
    const original = target.query.bind(target);
    target.query = async(text: string, params?: unknown[]): Promise<QueryResultLike> => {
      try {
        return await original(text, params);
      } catch (error) {
        return rescue(error, text);
      }
    };
    return target;
  }

  class MemPool {
    private readonly inner: PgPoolLike;

    constructor(config?: unknown) {
      this.inner = tolerant(new adapter.Pool(config));
    }

    query(text: string, params?: unknown[]): Promise<QueryResultLike> {
      return this.inner.query(text, params);
    }

    async connect(): Promise<PgQueryableLike & { release: () => void }> {
      const client = await this.inner.connect();
      return tolerant(client);
    }

    async end(): Promise<void> {
      await this.inner.end?.();
    }

    on(): this {
      return this;
    }
  }

  return {
    Pool: MemPool,
    Client: adapter.Client,
    default: { Pool: MemPool, Client: adapter.Client },
  };
}

/**
 * Build the production schema by running the real `runMigrations()`.
 * Imported lazily so that `jest.mock('pg', …)` is in place first.
 */
export async function applyProductionSchema(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const connection = require('../../database/connection') as {
    setupDatabase: () => Promise<void>;
    runMigrations: () => Promise<void>;
  };
  migrating = true;
  try {
    await connection.setupDatabase();
    await connection.runMigrations();
  } finally {
    migrating = false;
  }
}

/** Statements skipped while building the schema — asserted on by the harness's own test. */
export function backfillsSkipped(): readonly string[] {
  return skippedBackfills;
}

/** The pg-mem instance, for assertions that bypass the code under test. */
export function memoryDb(): IMemoryDb {
  if (!memDb) {
    throw new Error('createMemPg() must run before memoryDb() — is jest.mock("pg", …) missing?');
  }
  return memDb;
}

/** Read rows straight from the in-memory database, bypassing the code under test. */
export function selectRows<T = Record<string, unknown>>(sql: string): T[] {
  return memoryDb().public.many(sql) as T[];
}

/** Execute a statement directly against the in-memory database (fixtures). */
export function execSql(sql: string): void {
  memoryDb().public.none(sql);
}
