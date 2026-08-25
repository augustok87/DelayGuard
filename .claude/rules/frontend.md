---
name: DelayGuard frontend rules
description: React 18 + Polaris + App Bridge + Redux Toolkit guidance, design tokens, prop-type widening rule
type: project
paths:
  - "delayguard-app/src/components/**/*.{ts,tsx}"
  - "delayguard-app/src/store/**/*.ts"
  - "delayguard-app/src/hooks/**/*.ts"
---

# Frontend rules

React 18 + TypeScript, Shopify Polaris UI, Shopify App Bridge, Redux Toolkit (RTK) for global state.

## State management

- Single Redux store at [store/store.ts](delayguard-app/src/store/store.ts), persisted to `localStorage` via `redux-persist`.
- Slices live in `delayguard-app/src/store/slices/` (`appSlice`, `alertsSlice`, `ordersSlice`, `settingsSlice`, `uiSlice`).
- **Don't introduce Zustand, Recoil, or React Context for new global state** — extend an existing slice or add a new slice in the same pattern.
- Component-local state (`useState`) is fine for ephemeral UI state.

## Polaris + App Bridge

- Polaris components live under [components/ui/](delayguard-app/src/components/ui/). Compose with these before reaching for a third-party component or hand-rolled CSS.
- App Bridge is initialized in [ShopifyProvider.tsx](delayguard-app/src/components/ShopifyProvider.tsx) via `useAppBridge()`. Don't re-initialize App Bridge in child components.
- Custom hooks live in `delayguard-app/src/hooks/` (18 files) — check for an existing hook before writing a new fetch/state hook.

## Prop-type widening rule (v1.33 incident)

When widening a prop type (e.g., `string → React.ReactNode`, or `number → string | number`), keep at least one test for the **old** type alongside tests for the new type. The Accordion `title` widening shipped without backwards-compat tests, leaving regressions in string-only call sites silently possible.

Pattern:
```tsx
it("accepts string title (legacy)", () => { render(<Accordion title="text" />) })
it("accepts ReactNode title (new)", () => { render(<Accordion title={<Icon />} />) })
```

## Design tokens (Anchour redesign)

Active redesign uses navy + gold; CSS variables defined per [UI_UX_REDESIGN_ANCHOUR_INSPIRED.md](UI_UX_REDESIGN_ANCHOUR_INSPIRED.md). **Don't hardcode hex values** — reference the CSS variables. New components should match the redesign aesthetic by default.

## Icons

All emoji icons have been migrated to Lucide SVG (v1.31–v1.35). Don't reintroduce emoji or PNG icons for UI signaling — use Lucide.

---

For workflow basics (TDD-first, lint, type-check) see the root [CLAUDE.md](CLAUDE.md). **TDD is mandatory here too** — and for a bug fix, RED means the test fails against the *broken* component, not merely that it was written first; see [tests.md](.claude/rules/tests.md).

**Redux loading flags:** `loading` means *the initial fetch*, and may gate interactivity. A write in flight is `saving`, and must never disable or hide the control that triggered it. Conflating them made every input in `NotificationPreferences` disable itself mid-keystroke (v1.61, LAUNCH_PLAN §6 R10).

**Inputs the merchant types into must debounce their persist call** (~1s, `useDebouncedCallback`) with local state for instant feedback. Saving per `onChange` cost one PUT, one `data_access_log` row and one toast *per character* (v1.62).

**Adding a field to a settings form? Verify it reaches Postgres, not just that the request returned 200.** `PUT /api/settings` carries only the four `app_settings` columns; merchant contact details go to `PUT /api/merchant-settings` (camelCase). Sending them to the wrong one returns success and writes nothing (§6 R12).
