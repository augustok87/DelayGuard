/**
 * Single-table `shops` SELECTs must only reference columns that the
 * canonical schema actually creates — R2 live-install fix (B6).
 *
 * Found on the first real dev-store install (2026-07-29): every
 * authenticated API request returned 500. The session-token middleware
 * ran `SELECT id, access_token, scope, shop_name FROM shops`, but `shops`
 * has no `shop_name` column, so Postgres threw and the generic catch
 * turned it into INTERNAL_ERROR. `merchant-api-service.getShop` was worse
 * — four phantom columns (`shopify_shop_id`, `shop_name`, `email`,
 * `plan_name`). The whole authenticated surface was dead and no test
 * noticed, because every unit test mocks `query` and a mock will happily
 * return rows for a column that does not exist.
 *
 * This test reads the schema from its single source of truth
 * (`runMigrations()` in database/connection.ts — the `migrations/` .sql
 * files are dead, per LAUNCH_PLAN Appendix A.5) and checks it against the
 * SELECT lists in the source. It only inspects *single-table* queries with
 * unqualified column names; anything with a JOIN, a table alias, or a
 * qualified `x.y` column is skipped, because those cannot be attributed to
 * `shops` by inspection alone.
 */
import fs from "fs";
import path from "path";

const SRC_ROOT = path.join(__dirname, "..", "..", "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), "utf8");
}

/** Columns `shops` really has: CREATE TABLE body + every ADD COLUMN. */
function canonicalShopsColumns(): Set<string> {
  const schemaSource = readSource(path.join("database", "connection.ts"));

  const createBody = schemaSource.match(
    /CREATE TABLE IF NOT EXISTS shops \(([\s\S]*?)\)\s*\n?\s*`/i,
  );
  if (!createBody) {
    throw new Error("Could not locate the CREATE TABLE for `shops`");
  }

  const columns = new Set<string>();
  for (const line of createBody[1].split("\n")) {
    const column = line.trim().match(/^([a-z_]+)\s+[A-Za-z]/);
    // Skip table-level constraints (UNIQUE(...), PRIMARY KEY(...), ...).
    if (column && !/^(unique|primary|foreign|constraint|check)$/i.test(column[1])) {
      columns.add(column[1]);
    }
  }

  for (const added of schemaSource.matchAll(
    /ALTER TABLE shops\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi,
  )) {
    columns.add(added[1]);
  }

  return columns;
}

/**
 * Comments are prose, not SQL. Without stripping them a sentence like
 * "Select only what is used." parses as a query and poisons the result.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Unqualified columns selected by single-table `FROM shops` queries. */
function selectedShopsColumns(fileSource: string): string[] {
  const source = stripComments(fileSource);
  const selected: string[] = [];

  // The column list must not itself span a FROM, or a subquery like
  // `... FROM app_settings WHERE shop_id = (SELECT id FROM shops …)`
  // would attribute the outer table's columns to `shops`.
  for (const match of source.matchAll(
    /SELECT((?:(?!\bFROM\b)[\s\S])*?)\bFROM\s+shops\b([^\n]*)/gi,
  )) {
    const [, columnList, afterTable] = match;
    // A qualified `x.y` column means multiple tables are in play.
    if (columnList.includes(".")) continue;
    // A table alias or JOIN after `shops` — same problem.
    const continuesWithClause = /^\s*(WHERE|ORDER|GROUP|HAVING|LIMIT)\b/i.test(
      afterTable,
    );
    if (/^\s*[a-z_]/i.test(afterTable) && !continuesWithClause) continue;

    for (const entry of columnList.split(",")) {
      // `merchant_email AS email` => validate the source column only.
      const column = entry.trim().split(/\s+AS\s+/i)[0].trim();
      // Skip literals/expressions (NULL::text, COUNT(*), 2, ...).
      if (/^[a-z_]+$/.test(column)) selected.push(column);
    }
  }

  return selected;
}

const CONSUMERS = [
  path.join("middleware", "shopify-session.ts"),
  path.join("services", "merchant-api-service.ts"),
];

describe("single-table `shops` SELECTs match the canonical schema", () => {
  const schemaColumns = canonicalShopsColumns();

  it("derives the real shops columns from runMigrations()", () => {
    // Guards the parser itself: if this drifts, the checks below are noise.
    expect(schemaColumns.has("shop_domain")).toBe(true);
    expect(schemaColumns.has("access_token")).toBe(true);
    expect(schemaColumns.has("scope")).toBe(true);
    expect(schemaColumns.has("merchant_email")).toBe(true);
    // The columns that caused B6 must NOT be in the schema.
    expect(schemaColumns.has("shop_name")).toBe(false);
    expect(schemaColumns.has("plan_name")).toBe(false);
    expect(schemaColumns.has("shopify_shop_id")).toBe(false);
  });

  it.each(CONSUMERS)("%s selects no phantom column", (relativePath) => {
    const selected = selectedShopsColumns(readSource(relativePath));

    // A consumer with zero parsed queries would pass vacuously.
    expect(selected.length).toBeGreaterThan(0);

    const phantom = selected.filter((column) => !schemaColumns.has(column));
    expect(phantom).toEqual([]);
  });
});
