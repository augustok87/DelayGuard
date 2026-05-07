# DelayGuard — agent onboarding

Shopify app (not a theme): React 18 + TS frontend, Koa + PostgreSQL + BullMQ/Redis backend, deployed to Vercel.
**Code lives in [`delayguard-app/`](delayguard-app/)**, not at the repo root. Run all `npm` commands from there.

## Status

- **Phase**: 1 complete (95/100 readiness for Shopify App Store submission — see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)). Phase 2 (customer intelligence & priority scoring) is next.
- **Tests**: 1,810 passing, 25 skipped, 0 failing. Local CI gate: `npm test && npm run lint && npm run type-check && npm run build` (run from `delayguard-app/`).
- **Husky**: pre-commit runs `node scripts/quality-gates.js` automatically. Don't bypass with `--no-verify`.

## Canonical docs (point at these instead of re-explaining)

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) — single source of truth for current state, metrics, and roadmap.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — phase-by-phase technical specs and code examples.
- [DEEP_DIVE_UX_UI_RESEARCH.md](DEEP_DIVE_UX_UI_RESEARCH.md) — UX strategy and feature prioritization.
- [DATA_AVAILABILITY_ANALYSIS.md](DATA_AVAILABILITY_ANALYSIS.md) — every data point's source (Shopify / ShipEngine / SendGrid / Postgres).
- [UI_UX_REDESIGN_ANCHOUR_INSPIRED.md](UI_UX_REDESIGN_ANCHOUR_INSPIRED.md) — active redesign spec (navy + gold).
- [DEVELOPMENT_STORE_TESTING_GUIDE.md](DEVELOPMENT_STORE_TESTING_GUIDE.md) — local + dev-store testing walkthrough.
- [CHANGELOG.md](CHANGELOG.md) — version history. Don't paste version logs into code comments or docs; point here.

## Path-scoped rules

Detailed conventions live in [`.claude/rules/`](.claude/rules/) and load only when you touch matching files:

- [backend.md](.claude/rules/backend.md) — services, routes, middleware, queue, database. Webhook signing, BullMQ retry, migration recipe, v1.19 incident rules.
- [frontend.md](.claude/rules/frontend.md) — React components, Polaris, App Bridge, Redux Toolkit, Anchour design tokens, prop-type widening rule (v1.33).
- [tests.md](.claude/rules/tests.md) — Jest layout, mocks, no-placeholder-tests rule (v1.20).
- [deploy.md](.claude/rules/deploy.md) — Vercel 30s function cap, no BullMQ workers in serverless, cron pattern.

Read the matching rules file before editing in that area.

## Mandatory workflow

For every feature, in this order:

1. **Read the plan.** Find the feature in `IMPLEMENTATION_PLAN.md`. Confirm acceptance criteria.
2. **Tests first (TDD).** Create `*.test.ts(x)`, write failing tests covering happy path + edge + error cases, run them, see them fail. *Do not* write implementation before tests fail visibly.
   - v1.16 dashboard metrics shipped without TDD; bugs leaked; retrofitting cost ~2× the original work.
   - A `PreToolUse` hook (`.claude/hooks/tdd-warn.sh`) warns when you `Write` a new source file under `delayguard-app/src/**` without a sibling test.
3. **Implement minimally.** Write the smallest code that turns the tests green.
4. **Lint + type-check.** `npm run lint` (auto-fix with `npm run lint:fix`), `npm run type-check`. Zero errors before continuing.
5. **Run the full test suite.** `npm test`. All green.
6. **Update docs immediately.** `IMPLEMENTATION_PLAN.md` (mark phase status / test count), `CHANGELOG.md` (version entry). Don't batch this — stale docs accumulate fast.
7. **No leftover debug.** Strip `console.log`, commented-out blocks, scratch files.

## Coding guardrails

- **TypeScript strict.** No `any` (use `unknown` + narrowing). No `@ts-ignore` without an inline explanation.
- **Business logic in services**, not routes or components. Routes: `delayguard-app/src/routes/`. Services: `delayguard-app/src/services/`. Components stay pure.
- **Database**: raw `pg` with manual SQL migrations at `delayguard-app/src/database/migrations/`. **Not Prisma.** Migration command: `npm run db:migrate`. No rollback tooling — write forward-compatible migrations.
- **State** (frontend): Redux Toolkit + redux-persist. No Zustand/Context for new global state — see `.claude/rules/frontend.md`.
- **External APIs**: Shopify Admin API, ShipEngine, SendGrid, Twilio. Each has a service wrapper — don't call `fetch`/`axios` from a route or component directly.
- **Smallest blast radius.** Touch only what the task requires. No drive-by refactors, no speculative abstractions.

## Asking-vs-acting

- Reverse-prompt when intent is unclear; don't guess your way into the wrong implementation.
- Push back on requests that won't work (CSS spec, platform constraints, prior failure here) — explain *why* with concrete facts before proceeding.
- Self-verify after changes: re-run tests, grep for regressions, describe manual verification steps if no automated check exists.

## What to leave alone

- `.claude/settings.local.json` — per-developer permission allowlist.
- `archive/`, `app-store-assets/`, `legal/`, `docs/jsdoc/` — generated or finalized assets.
- Existing test counts, version numbers, or phase labels in docs unless your change actually moves them.

---

*This file replaces a 494-line predecessor. Verbose per-doc summaries, repeated TDD warnings, common-task examples, and stale Remix/Prisma guidance were removed — their content lives in the canonical docs above or in path-scoped rules. See git history for the full prior version.*
