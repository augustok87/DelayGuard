/**
 * Every single-table SQL statement must only reference columns that the
 * canonical schema actually creates — R2 live-install fixes (B6, B10).
 *
 * The first real dev-store install produced two of these in one session:
 *
 *   B6  `SELECT id, access_token, scope, shop_name FROM shops`
 *       -> 500 on every authenticated request; `shops` has no shop_name.
 *   B10 `SELECT … custom_message … FROM app_settings`
 *       -> "column custom_message does not exist"; the settings fetch
 *       failed for a feature the API also writes to.
 *
 * No unit test could catch either, because every test mocks `query` and a
 * mock happily returns rows for columns that do not exist. The first
 * version of this guard covered only `shops`, which is why B10 slipped
 * through minutes later — so it now checks every table the schema defines,
 * across SELECT, UPDATE and INSERT.
 *
 * Schema source of truth: `runMigrations()` in database/connection.ts. The
 * `migrations/*.sql` files are dead code (LAUNCH_PLAN Appendix A.5).
 *
 * Deliberately conservative: only statements that can be attributed to one
 * table by inspection are checked. Anything with a JOIN, a table alias, a
 * qualified `x.y` column, or a table the schema does not define is skipped
 * rather than guessed at — a false alarm here would train people to ignore
 * this test, which is worse than the gap.
 */
import fs from "fs";
import path from "path";

const SRC_ROOT = path.join(__dirname, "..", "..", "..");
const SCHEMA_FILE = path.join("database", "connection.ts");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), "utf8");
}

/**
 * Comments are prose, not SQL. Without stripping them, a sentence such as
 * "Select only what is used." parses as a query and poisons the results.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** table -> columns, from CREATE TABLE bodies plus every ADD COLUMN. */
function canonicalSchema(): Map<string, Set<string>> {
  const source = read(SCHEMA_FILE);
  const schema = new Map<string, Set<string>>();

  for (const table of source.matchAll(
    /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\)\s*\n?\s*`/gi,
  )) {
    const [, tableName, body] = table;
    const columns = new Set<string>();
    for (const line of body.split("\n")) {
      const column = line.trim().match(/^(\w+)\s+[A-Za-z]/);
      if (
        column &&
        !/^(unique|primary|foreign|constraint|check)$/i.test(column[1])
      ) {
        columns.add(column[1]);
      }
    }
    schema.set(tableName, columns);
  }

  for (const added of source.matchAll(
    /ALTER TABLE (\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)/gi,
  )) {
    schema.get(added[1])?.add(added[2]);
  }

  return schema;
}

interface Reference {
  table: string;
  column: string;
  statement: string;
}

/**
 * SQL literals and keywords that look like bare identifiers. `INSERT …
 * SELECT id, 2, true, false, 'default' FROM shops` would otherwise report
 * `shops.true` as a missing column.
 */
const SQL_LITERALS = new Set([
  "true",
  "false",
  "null",
  "default",
  "current_timestamp",
  "current_date",
  "now",
]);

/** Plain column identifiers only — skips literals, casts and functions. */
function isPlainColumn(token: string): boolean {
  return (
    /^[a-z_][a-z0-9_]*$/.test(token) && !SQL_LITERALS.has(token.toLowerCase())
  );
}

function columnsFromList(list: string): string[] {
  return list
    .split(",")
    .map((entry) => entry.trim().split(/\s+AS\s+/i)[0].trim())
    .filter(isPlainColumn);
}

function referencesIn(source: string): Reference[] {
  const sql = stripComments(source);
  const found: Reference[] = [];

  // SELECT <cols> FROM <table>
  for (const match of sql.matchAll(
    /SELECT((?:(?!\bFROM\b)[\s\S])*?)\bFROM\s+(\w+)\b([^\n]*)/gi,
  )) {
    const [, columnList, table, afterTable] = match;
    if (columnList.includes(".") || columnList.includes("*")) continue;
    const continuesWithClause = /^\s*(WHERE|ORDER|GROUP|HAVING|LIMIT)\b/i.test(
      afterTable,
    );
    // A table alias or JOIN after the table name => multi-table.
    if (/^\s*[a-z_]/i.test(afterTable) && !continuesWithClause) continue;
    for (const column of columnsFromList(columnList)) {
      found.push({ table, column, statement: "SELECT" });
    }
  }

  // UPDATE <table> SET <col> = …
  for (const match of sql.matchAll(
    /UPDATE\s+(\w+)\s+SET([\s\S]*?)(?:WHERE|`)/gi,
  )) {
    const [, table, assignments] = match;
    if (assignments.includes(".")) continue;
    for (const assignment of assignments.split(",")) {
      const column = assignment.trim().split("=")[0].trim();
      if (isPlainColumn(column)) {
        found.push({ table, column, statement: "UPDATE" });
      }
    }
  }

  // FROM <table> WHERE <column> = …  — the single-table filter idiom.
  // Catches B11a, where `(SELECT id FROM shops WHERE shop_id = $1)` threw
  // because `shops` is keyed by shop_domain and has no shop_id column.
  // Requiring WHERE immediately after the table name keeps aliased and
  // joined queries (`FROM orders o WHERE …`) out of scope.
  for (const match of sql.matchAll(/\bFROM\s+(\w+)\s+WHERE\s+(\w+)\s*=/gi)) {
    const [, table, column] = match;
    if (isPlainColumn(column)) {
      found.push({ table, column, statement: "WHERE" });
    }
  }

  // INSERT INTO <table> (<cols>)
  for (const match of sql.matchAll(/INSERT INTO\s+(\w+)\s*\(([^)]*)\)/gi)) {
    const [, table, columnList] = match;
    for (const column of columnsFromList(columnList)) {
      found.push({ table, column, statement: "INSERT" });
    }
  }

  return found;
}

function sourceFiles(dir: string, collected: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(SRC_ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests" || entry.name === "__mocks__") continue;
      sourceFiles(relative, collected);
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.includes(".test.") &&
      relative !== SCHEMA_FILE
    ) {
      collected.push(relative);
    }
  }
  return collected;
}

describe("SQL column references match the canonical schema", () => {
  const schema = canonicalSchema();

  it("parses the schema it is validating against", () => {
    // If the parser breaks, every check below passes vacuously.
    expect(schema.get("shops")?.has("shop_domain")).toBe(true);
    expect(schema.get("app_settings")?.has("delay_threshold_days")).toBe(true);
    expect(schema.get("orders")?.has("shopify_order_id")).toBe(true);
    // The columns behind B6 must not exist.
    expect(schema.get("shops")?.has("shop_name")).toBe(false);
  });

  it("finds no reference to a column the schema does not define", () => {
    const violations: string[] = [];
    let checked = 0;

    for (const file of sourceFiles(".")) {
      for (const ref of referencesIn(read(file))) {
        const columns = schema.get(ref.table);
        // Unknown table => not ours to validate (see LAUNCH_PLAN A.5).
        if (!columns) continue;
        checked += 1;
        if (!columns.has(ref.column)) {
          violations.push(
            `${file}: ${ref.statement} ${ref.table}.${ref.column}`,
          );
        }
      }
    }

    // Guard against the parser silently matching nothing.
    expect(checked).toBeGreaterThan(20);
    expect(violations).toEqual([]);
  });
});
