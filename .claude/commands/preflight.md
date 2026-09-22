---
description: Full state of DelayGuard — what is running, what is correct, and the exact ordered path to a merchant-installable App Store listing
argument-hint: "[--gates to also run the local CI gate] [--base <url> to probe a preview deploy]"
allowed-tools: Bash(node scripts/preflight-collect.js:*), Bash(curl:*), Bash(dig:*), Bash(git:*), Bash(gh:*), Bash(npm test:*), Bash(npm run lint:*), Bash(npm run type-check:*), Bash(npm run build:*), Read, Grep, Glob, Artifact
---

# /preflight — is DelayGuard shippable, and what stands in the way

Flags (may be empty): $ARGUMENTS

You are a **Shopify App Store reviewer and the launch engineer at the same
time**. One half of you asks "would this pass review and work for a merchant
who installed it this morning"; the other half asks "what is the next thing I
can actually do about it". Neither half is allowed to be reassuring.

Read [LAUNCH_PLAN.md](../../LAUNCH_PLAN.md) **§7 then §6**. §§1–4 are history.
**Appendix A is ground truth — never re-audit it.**

## Hard rules

- **Read-only.** No deploy, no migration, no `git push`, no Partner-Dashboard
  write, no vendor purchase. If a write is the right next step, it goes in the
  human column of the critical path — you do not do it.
- **The running deployment outranks every document in this repo.** A doc saying
  a thing shipped is a claim; a probe is evidence. Where they disagree, the
  probe wins and the disagreement is itself a finding.
- **Never print a secret.** `.env.local`, Vercel env and `DATABASE_URL` values
  never reach the transcript, the report or the Artifact. Key *names* and
  presence/absence are fine; values never are.
- **Every number carries a provenance badge** (vocabulary below). A number with
  no badge is a defect, because it invites the reader to treat an inference as
  a measurement.
- **Absence of access is a finding, not a gap to paper over.** When the
  collector reports `reachable: false`, say precisely what became unanswerable
  and what would restore it. Never substitute a remembered number.

| Badge | Means |
|---|---|
| `◆ probed` | Observed from the running deployment, DNS, `gh` or Postgres this run |
| `◈ read` | Read out of a repo file this run — source, toml, LAUNCH_PLAN |
| `◇ derived` | Arithmetic or set comparison over `◆`/`◈` values |
| `○ judged` | Your inference or recommendation. Not truth-apt — never a finding |
| `⊘ no access` | Cannot be measured from here. Name what would unlock it |

## Step 1 — collect

```bash
node scripts/preflight-collect.js > /tmp/preflight.json     # ~10s
node scripts/preflight-collect.js --gates > /tmp/preflight.json   # + local CI gate, ~4min
```

Run from `delayguard-app/`. Add `--base <url>` to grade a preview deployment
instead of production.

**Verify the collector before trusting it**, every run — it is cheap and it is
the whole basis of the report:

```bash
node scripts/preflight-collect.js --self-test    # 10 cases, must be 10/10
```

Those cases exist because both parsers shipped wrong the first time. The drift
detector once reported drift unconditionally; the blocker classifier read
"**H4 closed**" inside R3's heading and closed R3 while H3 and H7 were both
open. If the self-test is not green, **fix the collector before writing a
word** — a report built on a broken parser is worse than no report.

If the collector itself fails, report the failure verbatim and stop. Do not
reconstruct the state from LAUNCH_PLAN: that is precisely the habit this
command exists to replace.

## Step 2 — the four questions, in this order

The report answers exactly four questions. Nothing else earns space.

### 1. Is it up? `production` + `dns`

Grade the endpoint matrix. Every row carries what a healthy answer *is*, so
report pass/fail, never raw status codes alone. `/auth` answering **400** with
no `shop` is correct behaviour and must not be reported as a failure.

### 2. Is what's running the code we think is running? `deploy_drift`

This is the finding the rest of the report depends on, so lead with it when it
fires. `/health` reports a hardcoded version and cannot answer this; the
collector instead compares the dependency-probe **names** declared in
`src/services/monitoring-service.ts` against the names production returns.

`production_is_stale: true` means **HEAD contains work no merchant has ever
run.** Say which work, by reading the commits between the last deploy and HEAD.
Do not soften this into "a deploy is pending" — until it deploys, the fix does
not exist for anyone.

### 3. Does it work for a merchant? `database` + `app_config`

The install path in order: OAuth redirect → scopes granted → webhooks
registered per-shop → an order arrives → a delay is detected → an email is
sent. Grade each step, and **be blunt about which steps have never been
observed with real data.** One synthetic order row is not evidence that webhook
ingest works.

When `database.reachable` is false, print `⊘ no access` against every question
in its `unanswerable` list rather than skipping the section.

Two standing invariants to check and name, because they are money:
- SMS gating reads the **live** plan, never a stored flag.
- `delay_alerts` dedupe is **not** backed by a unique index until
  `dedupe_unique_indexes` returns one. Until then idempotency is a convention.

### 4. What is left, and who owns each piece? `blockers`

Split **HUMAN** from **AGENT** and order by what unblocks the most. The agent
column is empty until a human step lands — say so plainly rather than inventing
agent work to look busy.

`awaiting_input` is its own state: code finished, blocked on a key or a click.
Never report it as done, and never report it as work outstanding.

## Step 3 — the merchant-installable checklist

The heart of this command. A merchant can install DelayGuard when **all** of
these hold; report each with ✅ / ⚠️ / 🔴 and the evidence:

| # | Requirement | Where the evidence comes from |
|---|---|---|
| 1 | App is reachable and boots | `/health` 200 |
| 2 | OAuth entry redirects into the grant screen | `/?shop=…` → 302/307 → `/auth` |
| 3 | Scopes in the toml match the code's defaults | `app_config.scopes` vs `src/config/app-config.ts` |
| 4 | Privacy policy + terms served at public URLs | `/legal/*` 200 |
| 5 | Three GDPR compliance topics mounted and refusing unsigned calls | `/webhooks/*` 401/405 |
| 6 | Support mailbox can receive mail | `dns.can_receive_mail` |
| 7 | Billing plans exist on the live app | Partner Dashboard — `⊘ no access`, human must confirm |
| 8 | Notifications actually deliver | `delay_alerts.email_sent` against a real order |
| 9 | The listing claims only what the app can do | `SHOPIFY_APP_STORE_LISTING.md` vs vendor reality |
| 10 | Deployed build is HEAD | `deploy_drift.production_is_stale` false |

Where a row cannot be measured from here, say so and name the human action
that would settle it. **Never mark a row ✅ on the strength of a document.**

## Step 4 — the ordered path to shipped

One table, strictly ordered, each row naming its owner and what it unblocks.
Mirror §7's structure: each `[AGENT]` verification is gated on a `[HUMAN]` step
landing first, so the human column is the critical path and the agent column is
the proof that follows.

For every human step give **the exact thing to click or run** — not "configure
billing" but the screen, the values, and how they will know it worked. The
whole point is that the user can act on this without re-deriving it.

Close with what would still be true after everything on the list is done —
Shopify's own review queue takes days to weeks, so "submitted" and "live" are
different dates and the report must not blur them.

## Step 5 — publish the visual briefing (required, every run)

**Every `/preflight` run ends with a published Artifact.** The terminal is for
reading now; the Artifact is what gets revisited between sessions and shown to
anyone else. Do not ask whether to build it.

Read `.claude/artifacts.json` → `reports.preflight.url` and pass it as `url` so
the page **updates in place**. Set `label` to the run date. Never mint a new
artifact per run — the user keeps one bookmark. If the url is `null`, publish a
new one and write the URL back into that file.

**Load the `artifact-design` skill before writing it**, and `dataviz` before
any chart. Title stays **"DelayGuard Preflight"**, favicon stays **🛫**.

| § | Content |
|---|---|
| Masthead | The single most important finding this run, as a sentence — not a generic title |
| Status strip | Is it up / is it current / is it installable / how many blockers, each with a verdict |
| 01 Running state | Endpoint matrix, vendor probes, latency |
| 02 Deploy drift | What is committed but not deployed, and what that costs |
| 03 Merchant install path | The 10-row checklist as a visual flow, blockers highlighted |
| 04 Data reality | Row counts, real-vs-synthetic orders, delivery counts — or `⊘ no access` |
| 05 The path to shipped | Ordered human/agent table with the exact actions |
| 06 Decisions | Numbered, each naming who decides |

Non-negotiables for the page:

- **Every number carries its badge**, and the page opens with a key.
- **Charts are inline SVG** — the artifact CSP blocks external scripts.
- **Encode state in form, not only colour** — pills, icons, status columns.
- **No secrets and no customer PII.** Shop domains are fine; tokens, keys,
  emails and phone numbers are not.
- **A blocker nobody can act on is drawn differently from one that is next.**
  The reader's first question is "what do I do now", and the page must answer
  it without being read end to end.
- **Re-derive the headline figures from the snapshot before publishing.** State
  what each one would look like if it were wrong.

Give the user the URL in your reply.

## Step 6 — close

Terminal report first, then the link. End with a `**TL;DR**` as the last thing
in the message — conclusions, one bullet per decision — followed by the
glossary sections per the global convention.

If the run surfaced a durable finding — a new blocker, a trap, a structural
change — write it into `LAUNCH_PLAN.md` §6 with **the evidence that proves it,
not the reasoning that suggests it**, and rewrite §7. A finding that lives only
in terminal scrollback is lost.

## Traps this command has already paid for

- **A green `/health` proves boot, not correctness.** `/monitoring/health`
  returned 503 permanently by construction while `/health` was green, and the
  Application check divided heap by system memory and reported 124%.
- **Production ran three-week-old code while HEAD looked finished.** Measured
  2026-09-16: the EasyPost migration was committed, CI-green and never
  deployed. Nothing in the repo could have told you — only the live probe did.
- **`__mocks__/pg.js` answers every `UPDATE` with `rowCount: 1`.** No test
  using it can tell a one-row write from a four-row one. For any claim about
  what a statement *did*, use `src/tests/helpers/pg-mem-schema.ts`.
- **One synthetic order is not webhook ingest.** `orders` held exactly one
  hand-inserted row for six weeks while every endpoint stayed green.
- **A vendor probe reporting "healthy" does not mean the vendor can do its
  job.** Twilio's check is green on a trial account that owns no phone numbers
  and has never sent a message.
- **This checkout is shared.** `repo.possible_concurrent_session` fires when
  uncommitted files were touched in the last 30 minutes. If it does, say so and
  **do not** stage, stash, commit or revert anything you did not write.
