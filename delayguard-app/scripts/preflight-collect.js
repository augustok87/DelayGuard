#!/usr/bin/env node
/**
 * preflight-collect — measure DelayGuard's shippability, once, into JSON.
 *
 * Every number this emits was observed during this run. Nothing is carried
 * from a previous run, from docs, or from memory: the reader of the report
 * downstream needs to be able to say "this was true at 19:07 today", and that
 * is only honest if the collector refuses to remember anything.
 *
 * Usage:
 *   node scripts/preflight-collect.js                 # probe production
 *   node scripts/preflight-collect.js --gates         # also run test/lint/type-check/build (~3-5 min)
 *   node scripts/preflight-collect.js --base <url>    # probe a preview deployment instead
 *
 * Exits 0 even when findings are severe — a collector that fails on bad news
 * cannot report bad news. Only an internal error exits non-zero.
 */

"use strict";

const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(REPO, "..");
const DEFAULT_BASE = "https://delayguard-api.vercel.app";
const SENDING_DOMAIN = "delayguardapp.com";
const PROBE_TIMEOUT_SECONDS = 25;

const argv = process.argv.slice(2);
const runGates = argv.includes("--gates");
const baseUrl = readFlag("--base") || DEFAULT_BASE;

function readFlag(name) {
  const at = argv.indexOf(name);
  return at !== -1 ? argv[at + 1] : null;
}

/** Run a command for its stdout; null when it fails for any reason. */
function capture(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      timeout: options.timeoutMs || 30_000,
      stdio: ["ignore", "pipe", "ignore"],
      cwd: options.cwd || REPO,
    }).trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Production probes
// ---------------------------------------------------------------------------

/**
 * One HTTP probe. Returns status, latency and body — never throws, because a
 * dead endpoint is a finding rather than a reason to abandon the run.
 */
function probe(urlPath, { followRedirects = false } = {}) {
  const url = `${baseUrl}${urlPath}`;
  const args = [
    "-s",
    "-m", String(PROBE_TIMEOUT_SECONDS),
    "-o", "-",
    "-w", "\n__META__%{http_code} %{time_total} %{redirect_url}",
  ];
  if (followRedirects) {
    args.push("-L");
  }
  args.push(url);

  const raw = capture("curl", args, { timeoutMs: (PROBE_TIMEOUT_SECONDS + 5) * 1000 });
  if (raw === null) {
    return { path: urlPath, status: null, seconds: null, body: null, error: "no response" };
  }

  const marker = raw.lastIndexOf("__META__");
  const body = marker === -1 ? raw : raw.slice(0, marker).trimEnd();
  const meta = marker === -1 ? "" : raw.slice(marker + "__META__".length);
  const [code, seconds, redirect] = meta.trim().split(/\s+/);

  return {
    path: urlPath,
    status: Number(code) || null,
    seconds: Number(seconds) || null,
    redirect: redirect || null,
    body: body.slice(0, 4000),
  };
}

function parseJsonBody(result) {
  if (!result || !result.body) {
    return null;
  }
  try {
    return JSON.parse(result.body);
  } catch {
    return null;
  }
}

/**
 * The merchant-facing surface, in the order a merchant meets it. Each entry
 * carries what a healthy answer looks like, so the report can grade rather
 * than merely list.
 */
const ENDPOINT_MATRIX = [
  { path: "/health", expect: [200], means: "Boot + database + Redis reachable" },
  { path: "/monitoring/health", expect: [200], means: "All six dependency probes" },
  { path: "/?shop=delayguard-dev.myshopify.com", expect: [200, 302, 307], means: "Install entry redirects into OAuth" },
  { path: "/auth", expect: [400], means: "OAuth refuses a request with no shop (correct)" },
  { path: "/legal/privacy-policy", expect: [200], means: "Listing requirement: privacy policy URL" },
  { path: "/legal/terms-of-service", expect: [200], means: "Listing requirement: terms URL" },
  { path: "/webhooks/customers/data_request", expect: [401, 405], means: "GDPR topic mounted and refusing unsigned calls" },
  { path: "/webhooks/customers/redact", expect: [401, 405], means: "GDPR topic mounted and refusing unsigned calls" },
  { path: "/webhooks/shop/redact", expect: [401, 405], means: "GDPR topic mounted and refusing unsigned calls" },
];

function collectProduction() {
  const endpoints = ENDPOINT_MATRIX.map((entry) => {
    const result = probe(entry.path);
    return {
      ...entry,
      status: result.status,
      seconds: result.seconds,
      redirect: result.redirect,
      pass: result.status !== null && entry.expect.includes(result.status),
    };
  });

  const health = parseJsonBody(probe("/health"));
  const monitoring = parseJsonBody(probe("/monitoring/health"));

  return {
    base: baseUrl,
    endpoints,
    health,
    monitoring,
    vendor_checks: monitoring && Array.isArray(monitoring.checks)
      ? monitoring.checks.map((c) => ({
        name: c.name,
        status: c.status,
        responseTime: c.responseTime,
      }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Deploy drift — the check that catches "committed but never shipped"
// ---------------------------------------------------------------------------

/**
 * Production exposes the NAMES of its dependency probes. Those names are
 * declared in one place in the source, so comparing the two sets asks the
 * running deployment what build it is, without needing a version endpoint
 * (/health reports a hardcoded "1.0.0" and cannot answer this).
 *
 * A name present in source but absent live means HEAD contains work that
 * production has never run. That is exactly how the EasyPost migration was
 * found sitting undeployed on 2026-09-16.
 */
/** Probes the monitoring service builds itself, which carry no vendor name. */
const INTRINSIC_PROBES = ["Database", "Redis", "Application"];

/**
 * Pure set comparison, split out from the I/O so `--self-test` can drive it
 * with fixtures. A drift detector that has only ever reported drift is not a
 * detector; the self-test below is what makes this one falsifiable.
 */
function computeDeployDrift(declared, live) {
  const liveSet = new Set(live);
  const declaredSet = new Set(declared);

  const missingFromProduction = declared.filter((name) => !liveSet.has(name));
  const staleInProduction = live.filter(
    (name) => !declaredSet.has(name) && !INTRINSIC_PROBES.includes(name),
  );

  return {
    declared_in_source: declared,
    live_probe_names: live,
    missing_from_production: missingFromProduction,
    stale_in_production: staleInProduction,
    // Any asymmetry means the running build is not HEAD.
    production_is_stale: missingFromProduction.length > 0 || staleInProduction.length > 0,
    how_measured:
      "probe names declared in src/services/monitoring-service.ts vs names returned by GET /monitoring/health",
  };
}

function readDeclaredProbeNames() {
  const source = path.join(REPO, "src/services/monitoring-service.ts");
  if (!fs.existsSync(source)) {
    return [];
  }

  const text = fs.readFileSync(source, "utf8");
  const start = text.indexOf("const probes");
  if (start === -1) {
    return [];
  }

  const probesBlock = text.slice(start, start + 1200);
  return [...probesBlock.matchAll(/name:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function collectDeployDrift(production) {
  return computeDeployDrift(
    readDeclaredProbeNames(),
    production.vendor_checks.map((check) => check.name),
  );
}

/**
 * Break-it-on-purpose cases for the drift detector. Each states the answer it
 * must give; a case that cannot fail is not listed here.
 */
const DRIFT_SELF_TESTS = [
  {
    name: "agreement reports NO drift",
    declared: ["EasyPost", "SendGrid", "Twilio"],
    live: ["Database", "Redis", "EasyPost", "SendGrid", "Twilio", "Application"],
    expectStale: false,
  },
  {
    name: "a renamed vendor reports drift in both directions",
    declared: ["EasyPost", "SendGrid", "Twilio"],
    live: ["Database", "Redis", "ShipEngine", "SendGrid", "Twilio", "Application"],
    expectStale: true,
    expectMissing: ["EasyPost"],
    expectStaleNames: ["ShipEngine"],
  },
  {
    name: "a vendor added in source but not yet deployed reports drift",
    declared: ["EasyPost", "SendGrid", "Twilio", "Postmark"],
    live: ["Database", "Redis", "EasyPost", "SendGrid", "Twilio", "Application"],
    expectStale: true,
    expectMissing: ["Postmark"],
  },
  {
    name: "intrinsic probes never count as vendor drift",
    declared: [],
    live: ["Database", "Redis", "Application"],
    expectStale: false,
  },
];

/**
 * Real §6 headings with the state LAUNCH_PLAN §7 independently reports for
 * them. These are the cases the first parser got wrong — "fixed same session"
 * carries no strikethrough and no tick, and R24 says "resolved" and "awaiting"
 * in one breath.
 */
const BLOCKER_SELF_TESTS = [
  {
    id: "R8",
    heading: "R8 — No working support mailbox, and the listing claims one `[HUMAN]` — **submission-blocking**",
    expect: "open",
  },
  {
    id: "R9",
    heading: "R9 — The agent can no longer authenticate to Shopify, or read any Vercel secret `[HUMAN]` — **new 2026-08-25**",
    expect: "open",
  },
  {
    id: "R19",
    heading: "R19 — The processor never selects the shop's domain, so SMS is dead on every plan `[AGENT]` — **new 2026-08-26, fixed same session (v1.67)**",
    expect: "closed",
  },
  {
    id: "R23",
    heading: "~~R23 — `/monitoring/health` returns 503 in production, permanently and by construction~~ `[AGENT]` — ✅ **FIXED 2026-08-26 (v1.73)**",
    expect: "closed",
  },
  {
    id: "R24",
    heading: "R24 — Two of the three delay rules have never worked `[AGENT — code DONE, awaiting an EasyPost key]` — **resolved by migration, not by purchase (v1.75)**",
    expect: "awaiting_input",
  },
  {
    // A sub-item's closure must not close the parent: H3 and H7 are both open.
    id: "R3",
    heading: "R3 — Human dashboard gate: H3, H7 `[HUMAN]` — **H4 closed 2026-08-05**",
    expect: "open",
  },
];

function runSelfTest() {
  const failures = [];

  for (const testCase of BLOCKER_SELF_TESTS) {
    const actual = classifyBlockerHeading(testCase.heading, testCase.id);
    const passed = actual === testCase.expect;
    const label = `blocker "${testCase.heading.slice(0, 44)}…" → ${testCase.expect}`;
    process.stdout.write(`${passed ? "PASS" : "FAIL"}  ${label}\n`);
    if (!passed) {
      process.stdout.write(`      got "${actual}"\n`);
      failures.push(label);
    }
  }

  for (const testCase of DRIFT_SELF_TESTS) {
    const result = computeDeployDrift(testCase.declared, testCase.live);
    const problems = [];

    if (result.production_is_stale !== testCase.expectStale) {
      problems.push(`production_is_stale=${result.production_is_stale}, expected ${testCase.expectStale}`);
    }
    if (testCase.expectMissing
      && result.missing_from_production.join(",") !== testCase.expectMissing.join(",")) {
      problems.push(`missing_from_production=[${result.missing_from_production}], expected [${testCase.expectMissing}]`);
    }
    if (testCase.expectStaleNames
      && result.stale_in_production.join(",") !== testCase.expectStaleNames.join(",")) {
      problems.push(`stale_in_production=[${result.stale_in_production}], expected [${testCase.expectStaleNames}]`);
    }

    const passed = problems.length === 0;
    process.stdout.write(`${passed ? "PASS" : "FAIL"}  ${testCase.name}\n`);
    for (const problem of problems) {
      process.stdout.write(`      ${problem}\n`);
      failures.push(`${testCase.name}: ${problem}`);
    }
  }

  const total = DRIFT_SELF_TESTS.length + BLOCKER_SELF_TESTS.length;
  process.stdout.write(`\n${total - failures.length}/${total} cases pass\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// DNS — the support mailbox and the sending domain
// ---------------------------------------------------------------------------

function dig(type, name) {
  const out = capture("dig", ["+short", type, name], { timeoutMs: 15_000 });
  return out ? out.split("\n").filter(Boolean) : [];
}

function collectDns() {
  const mx = dig("MX", SENDING_DOMAIN);
  const txt = dig("TXT", SENDING_DOMAIN);
  const spf = txt.filter((r) => r.includes("v=spf1"));

  return {
    domain: SENDING_DOMAIN,
    mx,
    txt,
    spf,
    dkim: {
      s1: dig("CNAME", `s1._domainkey.${SENDING_DOMAIN}`),
      s2: dig("CNAME", `s2._domainkey.${SENDING_DOMAIN}`),
    },
    // A merchant who replies to a notification, or a Shopify reviewer emailing
    // support, needs MX. Its absence is submission-blocking (LAUNCH_PLAN R8).
    can_receive_mail: mx.length > 0,
    has_spf: spf.length > 0,
    dkim_resolves: dig("CNAME", `s1._domainkey.${SENDING_DOMAIN}`).length > 0,
  };
}

// ---------------------------------------------------------------------------
// Repo, CI and gates
// ---------------------------------------------------------------------------

/** Anything touched this recently is probably another session, not history. */
const CONCURRENT_EDIT_WINDOW_MINUTES = 30;

function collectRepo() {
  const head = capture("git", ["rev-parse", "--short", "HEAD"], { cwd: PROJECT_ROOT });
  const subject = capture("git", ["log", "-1", "--pretty=%s"], { cwd: PROJECT_ROOT });
  const committed = capture("git", ["log", "-1", "--pretty=%cI"], { cwd: PROJECT_ROOT });
  const dirty = capture("git", ["status", "--porcelain"], { cwd: PROJECT_ROOT });
  const unpushed = capture("git", ["log", "--oneline", "origin/main..HEAD"], { cwd: PROJECT_ROOT });
  const worktrees = capture("git", ["worktree", "list"], { cwd: PROJECT_ROOT });

  // Uncommitted work is ambiguous on its own: it could be three-week-old
  // scraps or another agent mid-edit. The modification time disambiguates,
  // and getting that wrong risks one session clobbering another's work.
  const uncommitted = (dirty ? dirty.split("\n").filter(Boolean) : []).map((line) => {
    const state = line.slice(0, 2).trim();
    const file = line.slice(3).trim();
    const absolute = path.join(PROJECT_ROOT, file);
    let modifiedAt = null;
    try {
      modifiedAt = fs.statSync(absolute).mtime.toISOString();
    } catch {
      modifiedAt = null;
    }
    return { state, file, modified_at: modifiedAt };
  });

  const cutoff = Date.now() - CONCURRENT_EDIT_WINDOW_MINUTES * 60_000;
  const recentlyEdited = uncommitted.filter(
    (entry) => entry.modified_at && Date.parse(entry.modified_at) > cutoff,
  );

  return {
    head,
    subject,
    committed_at: committed,
    unpushed_commits: unpushed ? unpushed.split("\n").filter(Boolean).length : 0,
    worktrees: worktrees ? worktrees.split("\n").filter(Boolean).length : null,
    uncommitted,
    dirty_files: uncommitted.length,
    recently_edited: recentlyEdited,
    // A loud signal, because the cost of ignoring it is destroying work that
    // another session has not committed yet.
    possible_concurrent_session: recentlyEdited.length > 0,
  };
}

/**
 * CI health is per WORKFLOW, not per run. Asking for the last N runs globally
 * hides a red workflow behind a chatty green one — the scheduled cron sweep
 * fires every few hours and buries the push-triggered suites entirely. So
 * enumerate the workflows first, then ask each for its own latest run.
 */
function collectCi() {
  const listed = capture("gh", [
    "workflow", "list", "--json", "name,id,state",
  ], { cwd: PROJECT_ROOT, timeoutMs: 45_000 });

  if (!listed) {
    return { available: false, workflows: [], note: "gh unavailable or not authenticated" };
  }

  let definitions = [];
  try {
    definitions = JSON.parse(listed).filter((w) => w.state === "active");
  } catch {
    return { available: false, workflows: [], note: "gh returned unparseable JSON" };
  }

  const workflows = definitions.map((definition) => {
    const raw = capture("gh", [
      "run", "list",
      "--workflow", String(definition.id),
      "--limit", "1",
      "--json", "conclusion,status,event,createdAt,headBranch,headSha,url",
    ], { cwd: PROJECT_ROOT, timeoutMs: 45_000 });

    let latest = null;
    try {
      latest = raw ? JSON.parse(raw)[0] : null;
    } catch {
      latest = null;
    }

    if (!latest) {
      return { name: definition.name, green: null, note: "no runs found" };
    }

    // Green on WHAT? A success from ten commits ago is not evidence about the
    // code in the tree, and reporting it as "CI green" is the same lie as a
    // deployed build that is not HEAD.
    const behind = latest.headSha
      ? Number(capture("git", ["rev-list", "--count", `${latest.headSha}..HEAD`], { cwd: PROJECT_ROOT }))
      : null;

    return {
      name: definition.name,
      conclusion: latest.conclusion,
      status: latest.status,
      event: latest.event,
      branch: latest.headBranch,
      at: latest.createdAt,
      url: latest.url,
      tested_sha: latest.headSha ? latest.headSha.slice(0, 8) : null,
      commits_since_tested: Number.isFinite(behind) ? behind : null,
      tested_head: behind === 0,
      green: latest.conclusion === "success",
    };
  });

  const greenOnHead = workflows.filter((w) => w.green && w.tested_head);

  return {
    available: true,
    workflows,
    // Deliberately two different questions. all_green says the last run passed;
    // green_on_head says the tree you are looking at has actually been tested.
    green_on_head: workflows.length > 0 && greenOnHead.length === workflows.length,
    max_commits_behind: workflows.reduce(
      (worst, w) => Math.max(worst, w.commits_since_tested ?? 0), 0,
    ),
    all_green: workflows.every((w) => w.green === true),
  };
}

const GATES = [
  { id: "test", command: "npm test -- --silent" },
  { id: "lint", command: "npm run lint" },
  { id: "type-check", command: "npm run type-check" },
  { id: "build", command: "npm run build" },
];

function collectGates() {
  if (!runGates) {
    return { ran: false, note: "pass --gates to run the local CI gate (~3-5 min)" };
  }

  const results = GATES.map((gate) => {
    const startedAt = Date.now();
    try {
      execSync(gate.command, { cwd: REPO, stdio: "ignore", timeout: 600_000 });
      return { id: gate.id, pass: true, seconds: Math.round((Date.now() - startedAt) / 1000) };
    } catch {
      return { id: gate.id, pass: false, seconds: Math.round((Date.now() - startedAt) / 1000) };
    }
  });

  return { ran: true, results, all_pass: results.every((r) => r.pass) };
}

// ---------------------------------------------------------------------------
// Production database — the only place that knows whether the app has USERS
// ---------------------------------------------------------------------------

const TABLES = [
  "shops",
  "orders",
  "fulfillments",
  "delay_alerts",
  "order_line_items",
  "tracking_events",
  "app_settings",
  "customer_intelligence",
  "data_access_log",
];

async function collectDatabase() {
  if (!process.env.DATABASE_URL) {
    return {
      reachable: false,
      reason: "DATABASE_URL is not set in this shell",
      // Named so the report can say precisely what stays unanswerable rather
      // than quietly omitting the section.
      unanswerable: [
        "how many shops have installed the app",
        "whether a real (non-synthetic) order webhook has ever landed",
        "how many alerts have been sent, and how many were duplicates",
        "whether delay_alerts carries the UNIQUE constraint that makes dedupe real",
      ],
    };
  }

  let Client;
  try {
    ({ Client } = require("pg"));
  } catch {
    return { reachable: false, reason: "the pg package is not installed" };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });

  try {
    await client.connect();
  } catch (error) {
    return { reachable: false, reason: `connection failed: ${error.message}` };
  }

  const counts = {};
  for (const table of TABLES) {
    try {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      counts[table] = rows[0].n;
    } catch {
      counts[table] = null;
    }
  }

  const safeQuery = async(sql) => {
    try {
      const { rows } = await client.query(sql);
      return rows;
    } catch {
      return null;
    }
  };

  // Is the app actually being used, or is the only row the synthetic one the
  // team inserted by hand? This distinction is the whole ballgame pre-launch.
  const realOrders = await safeQuery(
    "SELECT COUNT(*)::int AS n FROM orders WHERE shopify_order_id <> '9900112233'",
  );

  const alertDelivery = await safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE email_sent) ::int AS email_sent,
           COUNT(*) FILTER (WHERE sms_sent)   ::int AS sms_sent
    FROM delay_alerts
  `);

  // LAUNCH_PLAN records ON CONFLICT DO NOTHING with no unique index behind it.
  // Until this returns a row, idempotent dispatch is a convention, not a rule.
  const dedupeConstraint = await safeQuery(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'delay_alerts' AND indexdef ILIKE '%UNIQUE%'
  `);

  await client.end();

  return {
    reachable: true,
    counts,
    real_orders: realOrders ? realOrders[0].n : null,
    alerts: alertDelivery ? alertDelivery[0] : null,
    dedupe_unique_indexes: dedupeConstraint ? dedupeConstraint.map((r) => r.indexname) : null,
  };
}

// ---------------------------------------------------------------------------
// Launch blockers, read out of LAUNCH_PLAN.md rather than restated
// ---------------------------------------------------------------------------

/**
 * §6 is the live blocker list. Parsing it keeps the report and the plan from
 * drifting apart: if a blocker is closed in the doc it closes here too, and a
 * blocker that exists only in someone's head never appears at all.
 */
/**
 * Classify one §6 heading. Three states, not two: a blocker whose code is
 * finished but which cannot close until someone supplies a key or clicks
 * something is neither done nor outstanding work, and collapsing it into
 * either one misreports the critical path.
 */
const CLOSURE_VERB = "closed|fixed|resolved|granted";
const SELF_CLOSURE_MARKER = new RegExp(`~~|✅|\\b(${CLOSURE_VERB})\\b`, "i");

function classifyBlockerHeading(heading, ownId) {
  // "awaiting"/"pending" beats a fix marker: R24 reads "resolved by migration"
  // and "awaiting an EasyPost key" in the same line, and it is not closed.
  if (/awaiting|pending a|needs a .*key|blocked on/i.test(heading)) {
    return "awaiting_input";
  }

  // A closure verb belonging to a DIFFERENT id closes that sub-item, not this
  // blocker. R3 ("Human dashboard gate: H3, H7 — H4 closed 2026-08-05") read
  // as closed under a plain substring test while H3 and H7 were both open, so
  // drop every foreign "<id> … closed" phrase before looking for a marker.
  const foreignClosure = new RegExp(`\\b(H-?\\d+|R\\d+)\\b[^.;]{0,12}\\b(${CLOSURE_VERB})\\b`, "gi");
  const ownClosures = heading.replace(foreignClosure, (phrase, id) => (
    ownId && id.toUpperCase() === ownId.toUpperCase() ? phrase : ""
  ));

  return SELF_CLOSURE_MARKER.test(ownClosures) ? "closed" : "open";
}

/** Container headings that group other entries rather than tracking work. */
function isBlockerHeading(heading) {
  return !/Known non-blockers/i.test(heading);
}

function collectBlockers() {
  const planPath = path.join(PROJECT_ROOT, "LAUNCH_PLAN.md");
  if (!fs.existsSync(planPath)) {
    return { available: false, blockers: [] };
  }

  const lines = fs.readFileSync(planPath, "utf8").split("\n");
  const blockers = [];

  for (const line of lines) {
    const heading = line.match(/^#{3}\s+(.*)$/);
    if (!heading) {
      continue;
    }
    const body = heading[1];
    const id = body.match(/^~*\s*(R\d+|H-?\d+)\b/);
    if (!id || !isBlockerHeading(body)) {
      continue;
    }

    const state = classifyBlockerHeading(body, id[1]);
    const owner = /\[HUMAN/.test(body)
      ? "HUMAN"
      : /\[AGENT/.test(body)
        ? "AGENT"
        : "unassigned";

    blockers.push({
      id: id[1],
      owner,
      state,
      closed: state === "closed",
      submission_blocking: /submission-blocking|blocks all revenue/i.test(body),
      title: body
        .replace(/~~/g, "")
        .replace(/`\[(HUMAN|AGENT)[^\]]*\]`/g, "")
        .replace(/\*\*/g, "")
        .trim(),
    });
  }

  // §6 repeats some ids across celebration headings; the first occurrence is
  // the canonical entry.
  const seen = new Set();
  const unique = blockers.filter((blocker) => {
    if (seen.has(blocker.id)) {
      return false;
    }
    seen.add(blocker.id);
    return true;
  });

  const outstanding = unique.filter((b) => b.state !== "closed");

  return {
    available: true,
    blockers: unique,
    closed: unique.filter((b) => b.state === "closed"),
    outstanding,
    awaiting_input: unique.filter((b) => b.state === "awaiting_input"),
    open_human: outstanding.filter((b) => b.owner === "HUMAN"),
    open_agent: outstanding.filter((b) => b.owner === "AGENT"),
  };
}

// ---------------------------------------------------------------------------
// Shopify app configuration — what a reviewer will check
// ---------------------------------------------------------------------------

function collectAppConfig() {
  // The toml lives beside the app code, not at the repo root.
  const tomlPath = path.join(REPO, "shopify.app.toml");
  if (!fs.existsSync(tomlPath)) {
    return { available: false, looked_in: tomlPath };
  }

  const toml = fs.readFileSync(tomlPath, "utf8");
  const value = (key) => {
    const hit = toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
    return hit ? hit[1] : null;
  };

  const scopes = value("scopes");

  return {
    available: true,
    client_id: value("client_id"),
    handle: value("handle"),
    application_url: value("application_url"),
    embedded: /^embedded\s*=\s*true/m.test(toml),
    api_version: value("api_version"),
    scopes: scopes ? scopes.split(",").map((s) => s.trim()) : [],
    legacy_install_flow: /^use_legacy_install_flow\s*=\s*true/m.test(toml),
    compliance_topics: [...toml.matchAll(/compliance_topics\s*=\s*\["([^"]+)"\]/g)].map((m) => m[1]),
    // Functional topics are registered per-shop after OAuth because the legacy
    // install flow forbids app-level subscriptions — absence here is correct.
    functional_topics_declared: /orders\/updated|fulfillments\/updated/.test(toml),
  };
}

// ---------------------------------------------------------------------------

async function main() {
  if (argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const startedAt = new Date().toISOString();

  const production = collectProduction();
  const snapshot = {
    meta: {
      collected_at: startedAt,
      base_url: baseUrl,
      collector: "scripts/preflight-collect.js",
      gates_requested: runGates,
    },
    repo: collectRepo(),
    production,
    deploy_drift: collectDeployDrift(production),
    dns: collectDns(),
    ci: collectCi(),
    database: await collectDatabase(),
    blockers: collectBlockers(),
    app_config: collectAppConfig(),
    gates: collectGates(),
  };

  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`preflight-collect failed: ${error.stack}\n`);
  process.exit(1);
});
