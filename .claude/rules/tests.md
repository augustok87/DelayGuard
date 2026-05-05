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
