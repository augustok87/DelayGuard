# CLAUDE.MD - DelayGuard Project Context Guide
*Essential reading for all AI agents working on this project*

---

## PURPOSE OF THIS DOCUMENT

This document serves as the **mandatory onboarding guide** for any AI agent (Claude or otherwise) working on the DelayGuard project. Read this FIRST before answering questions or making code changes.

---

## CRITICAL DOCUMENTS TO READ (IN ORDER)

### 0. PROJECT_OVERVIEW.md ⭐⭐ START HERE
**Must read FIRST - Single consolidated view of current state and roadmap**

This document provides:
- Current Phase 1 completion status with all metrics
- Readiness score (98/100) and what remains for Shopify submission
- Complete Phase 2 roadmap (customer intelligence & priority scoring)
- Phase 3-5 future roadmap overview
- Links to all other documentation

**Start here to understand:** Where we are, where we're going, and how everything fits together.

---

### 1. DEEP_DIVE_UX_UI_RESEARCH.md ⭐ PRIORITY 1
**Must read before any UX/UI work**

This document contains:
- Comprehensive UX research from a world-class product management perspective
- All 5 implementation phases with detailed feature specifications
- Current state assessment (strengths and critical gaps)
- Competitive differentiation strategy
- Shopify permissions required for each feature
- UI/UX mockups and improvements

**Key Sections:**
- Section 2: UX/UI Improvements (Dashboard, Alerts, Orders tabs)
- Section 3: Additional data opportunities (what data to capture from Shopify)
- Section 4: Core service value-add features (discount generation, workflows, carrier intelligence)
- Section 7: Prioritized implementation roadmap (Phases 1-5)

**When to reference:**
- Before working on any UI component
- When adding new features
- When planning Shopify API integrations
- When answering "what should we build next?"

---

### 2. IMPLEMENTATION_PLAN.md ⭐ PRIORITY 1
**Must read before any development work**

This document contains:
- Detailed technical implementation plan for ALL 5 phases
- Code examples with file paths and function signatures
- Database schema changes for each phase
- Shopify GraphQL queries
- Frontend component specifications
- Testing strategies
- Rollout and business strategy

**Key Sections:**
- Phase 1 & 2: Pre-Shopify submission requirements (CURRENT PRIORITY)
- Phase 3: Premium/Enterprise features
- Phase 4-5: Future roadmap
- Technical infrastructure requirements
- Success criteria for each phase

**When to reference:**
- Before implementing any feature
- When estimating effort
- When planning database migrations
- When writing new API routes
- When creating new React components

---

### 3. DATA_AVAILABILITY_ANALYSIS.md ⭐ REFERENCE
**Complete data point inventory and testing requirements**

This document contains:
- Master inventory of all 84 dynamic data points across the application
- Exact data source for each data point (Shopify API, ShipEngine API, SendGrid, PostgreSQL)
- Implementation status: ✅ REAL (84%), ❓ UNCERTAIN (12%), ❌ MOCK (4%)
- Deep dive into each external API integration
- Uncertain features analysis (Merchant Benchmarks, Suggested Actions)
- Testing requirements by data type (5 comprehensive test groups)

**Key Sections:**
- Section 1: Executive Summary - Implementation status overview
- Section 2: Master Data Inventory - All 84 data points in table format
- Section 3: Data Source Deep Dive - Shopify GraphQL, ShipEngine, SendGrid, PostgreSQL
- Section 4: Uncertain/Unimplemented Features - What needs investigation
- Section 5: Testing Requirements - 5 test groups with detailed scenarios

**When to reference:**
- When verifying data sources for UI components
- When planning new feature implementations
- When debugging data sync issues
- When answering "where does this data come from?"
- Before Shopify development store testing

---

### 4. UI_UX_REDESIGN_ANCHOUR_INSPIRED.md ⭐ ACTIVE REDESIGN
**Active redesign specification - Anchour-inspired premium aesthetic**

This document contains:
- Complete UI/UX redesign spec inspired by Anchour design agency
- Navy + gold color system with premium aesthetic
- Component-by-component redesign specifications
- AppHeader premium redesign (completed)
- Design system CSS variables and typography

**When to reference:**
- Before working on any UI component styling
- When implementing redesign phases
- When making color or typography decisions
- When reviewing design system variables

---

### 5. DEVELOPMENT_STORE_TESTING_GUIDE.md ⭐ TESTING
**Step-by-step guide for testing with Shopify development store**

This document contains:
- Complete walkthrough for creating Shopify development store
- App registration and OAuth setup instructions
- Local development environment configuration (ngrok, PostgreSQL, env vars)
- 7 comprehensive test scenarios with expected results
- Troubleshooting guide for common issues
- Test data cleanup procedures
- Production deployment checklist

**Key Sections:**
- Prerequisites - Required accounts and tools
- Creating Development Store - Step-by-step Shopify Partner setup
- Local Setup - Database, ngrok tunnel, environment variables
- Testing Data Flow - 7 complete test walkthroughs
- Testing Uncertain Features - Merchant Benchmarks, Suggested Actions
- Troubleshooting - Common issues and solutions

**When to reference:**
- Before testing with Shopify development store
- When setting up local development environment
- When debugging webhook or OAuth issues
- When verifying all 84 data points work correctly
- Before production deployment

---

## PROJECT CONTEXT

**Essential Reading** (read these FIRST before starting work):
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Current state (98/100 readiness), Phase 1 complete, test metrics
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Technical specs, code examples, phase details
- **[PROJECT_STATUS_AND_NEXT_STEPS.md](PROJECT_STATUS_AND_NEXT_STEPS.md)** - Immediate tasks, priorities

**Quick Summary** (for reference):
- **Status**: Phase 1 Complete + 3-Rule Delay Detection (v1.19)
- **Tests**: 1,348 passing, 0 failing
- **Next**: Phase 2 (Customer Intelligence & Priority Scoring)
- **Tech Stack**: React/TypeScript, Koa, PostgreSQL, BullMQ, ShipEngine

**For complete project details, architecture, and business context**: See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - it is the single source of truth for project status.

---

## ⚠️ MANDATORY DEVELOPMENT WORKFLOW

**CRITICAL: This workflow is NON-NEGOTIABLE. Follow it for EVERY feature implementation.**

---

### ⚠️ BEFORE STARTING ANY FEATURE - READ THIS FIRST ⚠️

**CRITICAL PRE-TASK CHECKLIST** - Complete BEFORE writing any code:

- [ ] ✅ Have I read IMPLEMENTATION_PLAN.md for this feature?
- [ ] ✅ Have I read DEEP_DIVE_UX_UI_RESEARCH.md for UX context?
- [ ] ✅ Do I understand the acceptance criteria?
- [ ] ✅ Am I about to write TESTS FIRST (not implementation)?
- [ ] ✅ If I answered "no" to the above, STOP and write tests first!

**If you're about to write implementation code before tests:**
- ❌ **STOP IMMEDIATELY** - This violates TDD workflow
- ✅ **START OVER** - Create test file first, write failing tests, THEN implement

**Remember**: Tests come FIRST, always. No exceptions.

---

### 🚨 WARNING: TDD VIOLATIONS HAVE CONSEQUENCES 🚨

**What is a TDD violation?**
- Writing implementation code BEFORE writing tests
- Implementing a feature and saying "I'll add tests later"
- Skipping tests because "it's a small change"
- Writing code first, then writing tests to match

**Why this matters:**
- **v1.16 dashboard metrics**: Implemented without tests, user caught the mistake
- **Result**: Had to retroactively write tests and documentation
- **Cost**: 2x the effort, embarrassment, loss of trust
- **Lesson**: TDD is not optional - it saves time and prevents mistakes

**Your commitment:**
*I will write tests FIRST for every feature, no matter how small.*
*If I catch myself writing implementation code first, I will STOP and delete it.*

---

### The TDD-First Development Cycle

Every feature MUST follow this exact sequence:

#### 1. READ & UNDERSTAND (15-30 minutes)
   - ✅ Read IMPLEMENTATION_PLAN.md for the specific phase/feature
   - ✅ Read DEEP_DIVE_UX_UI_RESEARCH.md for UX context
   - ✅ Understand the acceptance criteria
   - ✅ Identify which files need to be modified

#### 2. WRITE TESTS FIRST (TDD - Test-Driven Development)
   **⚠️ CRITICAL: Write tests BEFORE writing implementation code!**

   ```bash
   # Create or update test file FIRST
   # Example: src/tests/unit/components/NewComponent.test.tsx

   # Write failing tests that describe the desired behavior
   # Tests should cover:
   # - Happy path (feature works as expected)
   # - Edge cases (empty data, null values, etc.)
   # - Error cases (API failures, validation errors)
   # - UI states (loading, error, success)
   ```

   **Why TDD?**
   - Forces you to think about requirements BEFORE coding
   - Ensures comprehensive test coverage
   - Prevents "forgetting" to write tests later
   - Makes refactoring safer

   **✅ SELF-CHECK: Did I actually write tests first?**

   Ask yourself:
   1. Did I create a `*.test.ts` or `*.test.tsx` file?
   2. Did I write at least 3 failing tests that describe the desired behavior?
   3. Did I run the tests and see them fail (RED phase)?
   4. Have I NOT written any implementation code yet?

   **If you answered "no" to ANY of these:**
   - ❌ You are violating TDD workflow
   - ❌ Delete any implementation code you wrote
   - ✅ Go back to Step 2 and write tests FIRST

#### 3. IMPLEMENT THE FEATURE
   - Write the minimal code to make tests pass
   - Follow existing patterns in the codebase
   - Keep business logic separate from UI components
   - Use TypeScript strict mode (no `any` types)

#### 4. RUN TESTS CONTINUOUSLY
   ```bash
   # Run tests as you code
   npm test -- ComponentName.test.tsx --watch

   # All tests should pass before proceeding
   ```

#### 5. FIX LINTING ERRORS
   **⚠️ CRITICAL: Fix linting BEFORE considering the feature done!**

   ```bash
   # Check for linting errors
   npm run lint

   # Auto-fix what can be auto-fixed
   npm run lint:fix

   # OR run ESLint directly
   npx eslint . --ext .js,.ts,.tsx --fix
   ```

#### 6. VERIFY EVERYTHING WORKS
   ```bash
   # Run all affected tests
   npm test -- ComponentName.test.tsx

   # Check dev server is running
   curl http://localhost:3000

   # Verify TypeScript compilation
   npm run type-check
   ```

#### 7. UPDATE DOCUMENTATION
   **⚠️ CRITICAL: Update docs IMMEDIATELY after completing feature!**

   **MANDATORY files to update:**
   - ✅ **IMPLEMENTATION_PLAN.md**: Mark phase as complete, add test count
   - ✅ **CLAUDE.md**: Add version history entry (in CHANGELOG.md now)
   - ✅ **PROJECT_OVERVIEW.md** (if applicable): Update phase completion status

#### 8. FINAL CHECKLIST
   Before considering ANY feature "done", verify:

   - [ ] ✅ Tests written FIRST (TDD approach)
   - [ ] ✅ All tests passing (100% pass rate)
   - [ ] ✅ Zero linting errors in modified files
   - [ ] ✅ Dev servers running successfully
   - [ ] ✅ TypeScript compilation successful
   - [ ] ✅ IMPLEMENTATION_PLAN.md updated
   - [ ] ✅ CHANGELOG.md updated (for version history)
   - [ ] ✅ No console.log or debug code left behind

---

### 🎉 TDD SUCCESS STORY

**v1.19 - 3-Rule Delay Detection System (2025-11-09)**
- ✅ Wrote 35 comprehensive tests FIRST (TDD Red phase)
- ✅ Implemented 3 delay detection rules (TDD Green phase)
- ✅ Discovered 3 critical bugs during honest review before shipping
- **Result**: Production-ready system, zero bugs shipped, complete confidence

**Key Lessons**:
1. Tests written FIRST = better architecture
2. Honest review catches bugs before production
3. TDD saves time (no rework needed)
4. Documentation completed immediately = no technical debt

---

## CODING GUIDELINES

### When Writing New Code

1. **Always check IMPLEMENTATION_PLAN.md first**
   - Contains detailed code examples
   - Shows exact file paths
   - Includes TypeScript interfaces

2. **Follow existing patterns**
   - Use Remix loaders for data fetching
   - Use Remix actions for mutations
   - Keep business logic in `/services`
   - Keep UI components pure (no business logic)

3. **Database changes require migrations**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

4. **New Shopify permissions require:**
   - Update `scopes` in `shopify.server.ts`
   - Merchants must re-authenticate
   - Update app listing documentation

5. **Testing requirements**
   - Unit tests for services (TDD approach)
   - Integration tests for Shopify API calls
   - E2E tests for user flows

---

## CORE CODEBASE STRUCTURE

### Important Directories
```
/app
  /routes              # Remix routes (pages + API endpoints)
  /components          # React components
  /services            # Business logic

/prisma
  /schema.prisma       # Database schema

/public               # Static assets
```

**For detailed architecture**: See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

---

## COMMON TASKS & HOW TO DO THEM

### Task: Add a new Shopify permission

1. Update scopes in `app/services/shopify.server.ts`
2. Merchants will be prompted to re-authorize on next login
3. Update app listing to explain why permission is needed

### Task: Add a new database model

1. Update `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name add_new_model`
3. Generate Prisma client: `npx prisma generate`

### Task: Create a new React component

```typescript
// app/components/ComponentName.tsx

interface ComponentProps {
  data: DataType;
}

export function ComponentName({ data }: ComponentProps) {
  return <Card>{/* content */}</Card>;
}
```

**For more examples**: See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

---

## FREQUENTLY ASKED QUESTIONS

### Q: What's the current state of the project?
**A:** Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) first! Phase 1 complete (98/100 readiness), 1,348 passing tests.

### Q: What phase should we focus on?
**A:** Phase 1 is COMPLETE ✅. Phase 2 is next priority (customer intelligence & priority scoring). See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).

### Q: Should we implement [feature X]?
**A:** Check [DEEP_DIVE_UX_UI_RESEARCH.md](DEEP_DIVE_UX_UI_RESEARCH.md) to see which phase it belongs to. If it's Phase 3+, defer until after Shopify submission.

### Q: How do I test locally?
**A:**
```bash
npm run dev
# Access at http://localhost:3000
```

---

## IMPORTANT REMINDERS

### ⚠️ MANDATORY: Follow the TDD-First Development Workflow
**See "MANDATORY DEVELOPMENT WORKFLOW" section above for complete details.**

### ⚠️ NEVER skip reading these documents before starting work:
1. DEEP_DIVE_UX_UI_RESEARCH.md
2. IMPLEMENTATION_PLAN.md
3. PROJECT_OVERVIEW.md

### ⚠️ NEVER skip these critical steps:
- **TDD**: Write tests BEFORE implementation code
- **Linting**: Fix ALL errors before considering feature "done"
- **Documentation**: Update IMPLEMENTATION_PLAN.md and CHANGELOG.md immediately

### ⚠️ ALWAYS follow the phased approach:
- Phase 1 & 2 FIRST (pre-submission)
- Phase 3+ AFTER Shopify approval and revenue

---

## RECENT VERSION HISTORY

For complete version history, see [CHANGELOG.md](CHANGELOG.md).

**Current version**: v1.35 (Dec 2025) - Anchour-Inspired UI/UX Redesign Phase 1
**Previous milestone**: v1.34 (Nov 2025) - Complete Data Availability Analysis (84 data points verified)

### Key milestones:
- **v1.35**: Anchour-inspired redesign - navy+gold color system, AppHeader premium redesign
- **v1.33-v1.34**: Complete icon migration (all emojis to Lucide SVG), data availability analysis
- **v1.26-v1.32**: Settings UX overhaul (accordion removal, color refinement, grid layout, modals)
- **v1.19-v1.25**: 3-rule delay detection system, notification routing, educational modals
- **v1.17-v1.18**: Header UI polish, dashboard refinements

---

## FINAL NOTE

This project is a market-ready Shopify app with strong technical foundation.

**Your job as an AI agent is to:**
- Understand the vision (from [DEEP_DIVE_UX_UI_RESEARCH.md](DEEP_DIVE_UX_UI_RESEARCH.md) and [UI_UX_REDESIGN_ANCHOUR_INSPIRED.md](UI_UX_REDESIGN_ANCHOUR_INSPIRED.md))
- Execute the plan (from [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md))
- Follow TDD workflow rigorously
- Maintain code quality
- Document everything immediately

**Single Source of Truth for Project Status**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

---

*Last updated: March 2026*
*Phase 1 COMPLETE (98/100 readiness) - Ready for Shopify App Store submission*
