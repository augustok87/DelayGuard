---
name: DelayGuard testing rules
description: TDD-first workflow, Jest layout, mocks, no-placeholder-tests rule from v1.20
type: project
paths:
  - "delayguard-app/src/tests/**"
  - "delayguard-app/__mocks__/**"
  - "delayguard-app/jest.config.ts"
  - "delayguard-app/**/*.test.{ts,tsx}"
---

# Testing rules

Jest + ts-jest + jsdom test environment. Config: [jest.config.ts](delayguard-app/jest.config.ts).

## TDD-first (mandatory)

Write tests **first**, run them, see them fail (RED), then write the implementation (GREEN). The order matters because:

- v1.16 dashboard metrics shipped without tests, bugs leaked, retrofitting tests cost ~2× the original work.
- A `PreToolUse` hook (`.claude/hooks/tdd-warn.sh`) warns on `Write` of new source files in `delayguard-app/src/**` without a sibling `*.test.ts(x)`. The warning is advisory — but the warning means you're skipping TDD.

Pattern: for `delayguard-app/src/services/Foo.ts`, the sibling test is `Foo.test.ts` next to it (or under `src/tests/unit/services/Foo.test.ts`).

## Fixing a bug? RED means failing against the *broken* code (v1.61/v1.62)

For a bug fix, "see it fail" is not satisfied by writing the test before the fix. **Re-introduce the defect and confirm the test fails**, then restore. Both dashboard fixes did this, and it paid twice:

- The seam test for R10 failed against the broken reducer — a real check.
- A sibling test in the same commit passed in **both** states: `fireEvent.change` fires on a `disabled` input in jsdom, so it never detected the bug it was named after. **It was deleted, not kept for appearances.** A test that cannot fail is worse than no test — it reads as proof (global rule #11).

Keep a test that passes in both states only when it pins the *other* half of a contract (guarding an over-correction) — and say so in a comment.

## Never mock a third-party SDK without one unmocked binding test (R14)

`email-service.test.ts` mocked `@sendgrid/mail` and asserted against a hand-written object with `setApiKey`/`send` as own properties. It was green for months while **every production send threw `sgMail.setApiKey is not a function`**: the real module exports a `MailService` *instance*, its methods live on the prototype, and `import * as` (→ `__importStar`) copies only own properties.

For every third-party SDK the app calls, keep **one deliberately unmocked test** that constructs the real binding and asserts the methods it uses are callable — see `tests/unit/services/email-service-sdk-binding.test.ts`. It needs no network: `new EmailService(key)` alone reproduced the failure.

**Prefer `import x from` over `import * as x` for CommonJS packages that export an instance or a class.** `import * as` is for true namespace modules (`fs`, `path`, `dotenv`).

## Unit tests are blind to seams (R10, R12)

Two 2026-08 defects made the dashboard unusable while a 2,449-test suite stayed green, because **every assertion sat on one side of a boundary**:

- **R10** — the reducer correctly set `loading`; the component correctly disabled itself when told to. Only the *mapping* was wrong (a save flipped the flag meaning "initial fetch"), so every input disabled itself mid-keystroke.
- **R12** — the client PUT valid settings and the server correctly ignored fields it was never sent. Contact details reported "saved successfully" and persisted nothing for 26 days.

When a change spans store → props → DOM, or client → wire → route → SQL, **add one test that crosses the seam** — e.g. derive the prop from a real store dispatch and assert the rendered result. Mocking both sides proves only that each side matches your assumption about the other.

**Corollary:** a passing check is not evidence until you know what it is wired to. `monitoring-service`'s health test passes only because a global `fetch` mock hides three real network calls that all return non-2xx; the boot env validator "reported no problem" with the SendGrid vars it never reads.

## The `pg` mock cannot see what a statement did (R17)

`jest.config.ts` maps `^pg$` to [`__mocks__/pg.js`](delayguard-app/__mocks__/pg.js), whose `MockClient.query` returns **`rowCount: 1` for every `UPDATE`** — it never reads the statement, let alone the `WHERE` clause. So a write that flips four rows is indistinguishable from one that flips the intended row.

That is not hypothetical. `processNotification` completed notifications with `UPDATE delay_alerts … WHERE order_id = $1`; in production one send marked **all four** alerts on an order delivered with one timestamp to the microsecond, and **2,446 tests were green throughout**, because the processor's tests assert the statement was *issued*, never what it touched.

**Rule: any assertion about what a statement DID — rows affected, which row, whether a column was even selected — must run against a real schema.** Use [`src/tests/helpers/pg-mem-schema.ts`](delayguard-app/src/tests/helpers/pg-mem-schema.ts):

```ts
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());
import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
beforeAll(applyProductionSchema);
```

It swaps in pg-mem (a real SQL engine) and builds the schema by running the **production `runMigrations()`**, so the tables are the deployed ones rather than a transcription that drifts. Assert on rows read back from the database, not on `mockQuery.mock.calls`. `jest.mock('pg', factory)` does override `moduleNameMapper`.

**Corollary, and it found a second bug the same day (R19):** a hand-built fixture row can supply a column the real `SELECT` never fetches. `order.shop_domain` was `undefined` in production for every notification — `orders` has no such column and the query didn't select it from `shops` — while every test happily returned a fixture containing it. **A mock that returns the row you wish the query returned cannot tell you the query is wrong.**

## No placeholder tests (v1.20 incident)

`expect(true).toBe(true)` and similar tautological stubs are **forbidden** in non-WIP branches. They previously masked unfinished work because CI passed and reviewers couldn't tell stubs from real coverage.

If a feature isn't ready to test, use:
```ts
it.skip("FUTURE: routes carrier delays to merchant — see #123", () => {});
```
`it.skip` surfaces visibly in CI output; `expect(true).toBe(true)` does not.

## Test placement

| Kind | Location |
|---|---|
| Unit (services, components, utils) | `delayguard-app/src/tests/unit/**/*.test.ts` |
| Integration (DB, queue, multi-service) | `delayguard-app/src/tests/integration/**/*.test.ts` |
| Co-located unit tests (also acceptable) | `<file>.test.ts` next to the source |
| Manual mocks (Jest auto-discovery) | `delayguard-app/__mocks__/` — currently `pg.js`, `ioredis.js`, `fileMock.js` |

## Mocking external services

- Postgres and Redis are mocked at the module level via `delayguard-app/__mocks__/` — Jest auto-applies these. Don't re-mock in individual test files.
- For Shopify/ShipEngine/SendGrid HTTP calls: mock at the service-method level (don't reach into `fetch`/`axios` — services already wrap the call surface).
- Integration tests that hit a real DB are gated with `npm run test:integration` / `npm run test:db:schema` and excluded from the default `npm test` run due to race conditions.

## Running

```bash
cd delayguard-app
npm test                  # default Jest run
npm run test:watch        # watch mode
npm run test:coverage     # coverage report
npm run test:integration  # integration suite
npm run test:db:schema    # DB schema tests (excluded from default)
```

---

For workflow basics see the root [CLAUDE.md](CLAUDE.md).
