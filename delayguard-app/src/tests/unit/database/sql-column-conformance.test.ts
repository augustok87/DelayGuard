/**
 * Every SQL statement must only reference columns the schema defines —
 * R2 live-install fixes (B6, B10, B11, B12).
 *
 * The first real dev-store install turned up five of these in one session:
 *
 *   B6  `SELECT … shop_name FROM shops`            -> 500 on every
 *                                                     authenticated request
 *   B10 `SELECT … custom_message FROM app_settings`-> settings fetch failed
 *   B11 `UPDATE delay_alerts SET customer_email …` -> customers/redact threw
 *       `SELECT id FROM shops WHERE shop_id = $1`  -> six GDPR sites
 *   B12 `SELECT o.total_price …`                   -> /api/orders 500
 *       `COUNT(CASE WHEN status = …)` over a JOIN  -> /api/analytics 500
 *
 * None was reachable by the existing suite: every test mocks `query`, and a
 * mock returns rows for columns that do not exist. Each fix also proved the
 * guard was too narrow — the first version checked only `shops` (so B10 got
 * through minutes later), and the second skipped aliased queries (so all of
 * B12 got through). This version resolves table aliases and checks
 * qualified references too.
 *
 * Schema source of truth: `runMigrations()` in database/connection.ts. The
 * `migrations/*.sql` files are dead code (LAUNCH_PLAN Appendix A.5).
 *
 * Still deliberately conservative: a statement is only checked where its
 * columns can be attributed to a table with certainty. Unqualified columns
 * are checked only in single-table statements; qualified ones only when the
 * alias resolves to a table the schema defines. A false alarm here would
 * train people to ignore the test, which is worse than the gap.
 */
import fs from "fs";
import path from "path";

const SRC_ROOT = path.join(__dirname, "..", "..", "..");
const SCHEMA_FILE = path.join("database", "connection.ts");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), "utf8");
}

/**
 * Comments are prose, not SQL. Without stripping them a sentence such as
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

/** Pull out the SQL string literals, so statements are analysed in isolation. */
function sqlStatements(source: string): string[] {
  const sql = stripComments(source);
  const statements: string[] = [];

  for (const literal of sql.matchAll(/`([^`]*)`/g)) {
    if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(literal[1])) {
      statements.push(literal[1]);
    }
  }
  for (const literal of sql.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
    if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(literal[1])) {
      statements.push(literal[1]);
    }
  }

  return statements;
}

/** alias (and bare table name) -> table, from FROM and JOIN clauses. */
function tableAliases(statement: string): Map<string, string> {
  const aliases = new Map<string, string>();

  for (const clause of statement.matchAll(
    /\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi,
  )) {
    const [, table, alias] = clause;
    const RESERVED = /^(WHERE|ORDER|GROUP|HAVING|LIMIT|ON|SET|LEFT|RIGHT|INNER|OUTER|JOIN|SELECT|AND|OR)$/i;
    aliases.set(table, table);
    if (alias && !RESERVED.test(alias)) aliases.set(alias, table);
  }

  return aliases;
}

interface Violation {
  file: string;
  reference: string;
}

describe("SQL column references match the canonical schema", () => {
  const schema = canonicalSchema();

  it("parses the schema it is validating against", () => {
    // If the parser breaks, every check below passes vacuously.
    expect(schema.get("shops")?.has("shop_domain")).toBe(true);
    expect(schema.get("app_settings")?.has("custom_message")).toBe(true);
    expect(schema.get("orders")?.has("total_amount")).toBe(true);
    // The columns behind B6 and B12 must not exist.
    expect(schema.get("shops")?.has("shop_name")).toBe(false);
    expect(schema.get("orders")?.has("total_price")).toBe(false);
  });

  it("finds no reference to a column the schema does not define", () => {
    const violations: Violation[] = [];
    let checked = 0;

    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(path.join(SRC_ROOT, dir), {
        withFileTypes: true,
      })) {
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "tests" || entry.name === "__mocks__") continue;
          walk(relative);
        } else if (
          entry.name.endsWith(".ts") &&
          !entry.name.includes(".test.") &&
          relative !== SCHEMA_FILE
        ) {
          files.push(relative);
        }
      }
    };
    walk(".");

    for (const file of files) {
      for (const statement of sqlStatements(read(file))) {
        const aliases = tableAliases(statement);

        // 1. Qualified refs — `o.total_price`, `da.status`.
        for (const ref of statement.matchAll(
          /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi,
        )) {
          const [, qualifier, column] = ref;
          const table = aliases.get(qualifier);
          const columns = table ? schema.get(table) : undefined;
          if (!columns) continue;
          checked += 1;
          if (!columns.has(column)) {
            violations.push({ file, reference: `${qualifier}.${column}` });
          }
        }

        // 2. Unqualified refs. These are only attributable when the target
        // table is unambiguous, so each form is handled separately rather
        // than lumped together — `UPDATE orders SET … WHERE shop_id =
        // (SELECT id FROM shops …)` names two tables, and guessing between
        // them is how a guard starts crying wolf.
        const attributed: Array<{ table: string; column: string }> = [];

        // INSERT and UPDATE state their own target explicitly.
        for (const insert of statement.matchAll(
          /INSERT INTO\s+(\w+)\s*\(([^)]*)\)/gi,
        )) {
          for (const column of columnsFromList(insert[2])) {
            attributed.push({ table: insert[1], column });
          }
        }
        for (const update of statement.matchAll(
          /UPDATE\s+(\w+)\s+SET([\s\S]*?)(?:WHERE|$)/gi,
        )) {
          for (const assignment of update[2].split(",")) {
            const column = assignment.trim().split("=")[0].trim();
            if (isPlainColumn(column)) {
              attributed.push({ table: update[1], column });
            }
          }
        }

        // SELECT lists and WHERE filters only when the whole statement —
        // including any INSERT/UPDATE target — involves a single table.
        const allTables = new Set(aliases.values());
        for (const target of statement.matchAll(
          /(?:INSERT INTO|UPDATE)\s+(\w+)/gi,
        )) {
          allTables.add(target[1]);
        }
        if (allTables.size === 1 && aliases.size <= 1) {
          const table = [...allTables][0];
          for (const select of statement.matchAll(
            /SELECT((?:(?!\bFROM\b)[\s\S])*?)\bFROM\b/gi,
          )) {
            if (select[1].includes("*")) continue;
            for (const column of columnsFromList(select[1])) {
              attributed.push({ table, column });
            }
          }
          for (const where of statement.matchAll(
            /\b(?:WHERE|AND)\s+([a-z_][a-z0-9_]*)\s*=/gi,
          )) {
            if (isPlainColumn(where[1])) {
              attributed.push({ table, column: where[1] });
            }
          }
        }

        for (const { table, column } of attributed) {
          const columns = schema.get(table);
          if (!columns) continue;
          checked += 1;
          if (!columns.has(column)) {
            violations.push({ file, reference: `${table}.${column}` });
          }
        }
      }
    }

    // Guard against the parser silently matching nothing.
    expect(checked).toBeGreaterThan(50);
    expect(
      violations.map((v) => `${v.file}: ${v.reference}`).sort(),
    ).toEqual([]);
  });
});
