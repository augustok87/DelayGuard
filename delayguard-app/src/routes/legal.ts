/**
 * Legal document routes (LAUNCH_PLAN WS-H task H-1)
 *
 * Serves the repo's legal/ markdown documents as clean, self-contained HTML:
 *   GET /legal/privacy-policy   -> legal/privacy-policy.md
 *   GET /legal/terms-of-service -> legal/terms-of-service.md
 *
 * Shopify App Store listings must link a publicly hosted privacy policy and
 * terms of service; both URLs 404 in production today (LAUNCH_PLAN Appendix B).
 *
 * The markdown -> HTML conversion is a tiny purpose-built renderer (headings,
 * bold/italic, lists, links, hr, paragraphs — the only constructs the legal
 * docs use) so no markdown dependency is added. Rendered pages are cached in
 * memory after the first request.
 *
 * Deploy note: the markdown lives OUTSIDE delayguard-app/ (repo root legal/).
 * The Vercel function bundle must include those files (vercel.json
 * `functions.includeFiles` or equivalent) — see WS-H PR notes.
 */

import Router from "koa-router";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";

/** Documents this router serves: URL slug -> { file, page title }. */
const LEGAL_DOCS: Record<string, { file: string; title: string }> = {
  "privacy-policy": {
    file: "privacy-policy.md",
    title: "DelayGuard Privacy Policy",
  },
  "terms-of-service": {
    file: "terms-of-service.md",
    title: "DelayGuard Terms of Service",
  },
};

/** Escape HTML special characters before any markdown transformation. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Apply inline markdown marks (links, bold, italic) to escaped text. */
function renderInline(text: string): string {
  return (
    text
      // [text](https://url) — http(s) only, so escaped content can never
      // produce javascript: URLs
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" rel="noopener noreferrer">$1</a>',
      )
      // **bold** before *italic* so the double marker wins
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
  );
}

/**
 * Convert the subset of markdown used by the legal documents to HTML.
 * Supported: # h1..###### h6, "- " lists, "---" rules, blank-line-separated
 * paragraphs, and inline links / bold / italic. Raw HTML is escaped.
 */
export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown.replace(/\r\n/g, "\n")).split("\n");
  const html: string[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = (): void => {
    if (listItems.length > 0) {
      html.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.join("<br/>")}</p>`);
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      flushList();
      flushParagraph();
    } else if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
    } else if (/^-{3,}$/.test(line.trim())) {
      flushList();
      flushParagraph();
      html.push("<hr/>");
    } else if (/^\s*-\s+/.test(line)) {
      flushParagraph();
      listItems.push(`<li>${renderInline(line.replace(/^\s*-\s+/, ""))}</li>`);
    } else {
      flushList();
      paragraph.push(renderInline(line.trim()));
    }
  }

  flushList();
  flushParagraph();
  return html.join("\n");
}

/** Wrap rendered document HTML in a minimal, self-contained page. */
function renderPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; padding: 2rem 1rem 4rem; background: #f8f9fb; color: #1a2233;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         line-height: 1.6; }
  main { max-width: 760px; margin: 0 auto; background: #ffffff; padding: 2.5rem 2rem;
         border-radius: 8px; box-shadow: 0 1px 4px rgba(16, 42, 67, 0.08); }
  h1, h2, h3, h4 { color: #102a43; line-height: 1.3; }
  h1 { font-size: 1.9rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
  h2 { font-size: 1.4rem; margin-top: 2rem; }
  h3 { font-size: 1.1rem; margin-top: 1.5rem; }
  a { color: #1d4ed8; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
  ul { padding-left: 1.4rem; }
</style>
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>
`;
}

/**
 * Locate the repo-root legal/ directory. `LEGAL_DOCS_DIR` overrides for
 * tests/deploys; otherwise try paths that hold in dev (cwd = delayguard-app),
 * in Jest, and in a bundled serverless function.
 */
function resolveLegalDir(): string | null {
  const candidates = [
    process.env.LEGAL_DOCS_DIR,
    // Canonical in-project serving copy (delayguard-app/legal). Resolves the
    // same from src/routes (ts-node) and dist/routes (compiled), and is the
    // only location Vercel can reliably bundle — vercel.json `includeFiles`
    // ships these two files with the serverless function. Files outside the
    // project root (repo-root legal/) are NOT dependable in the bundle.
    path.resolve(__dirname, "../../legal"),
    path.resolve(process.cwd(), "legal"),
    // Dev/monorepo fallbacks (repo-root legal/, when cwd = delayguard-app).
    path.resolve(__dirname, "../../../legal"),
    path.resolve(process.cwd(), "../legal"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  // An explicit override must not silently fall through to other locations
  if (process.env.LEGAL_DOCS_DIR) {
    return fs.existsSync(candidates[0]) ? candidates[0] : null;
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Rendered-page cache: slug -> full HTML page. */
const pageCache = new Map<string, string>();

/** Load, render, and cache a legal document; null when unavailable. */
function getLegalPage(slug: string): string | null {
  const cached = pageCache.get(slug);
  if (cached) {
    return cached;
  }

  const doc = LEGAL_DOCS[slug];
  if (!doc) {
    return null;
  }

  const legalDir = resolveLegalDir();
  if (!legalDir) {
    logger.error("Legal docs directory not found; cannot serve legal pages");
    return null;
  }

  try {
    const markdown = fs.readFileSync(path.join(legalDir, doc.file), "utf8");
    const page = renderPage(doc.title, renderMarkdown(markdown));
    pageCache.set(slug, page);
    return page;
  } catch (error) {
    logger.error("Failed to read legal document", error as Error, { slug });
    return null;
  }
}

// No router-level prefix: server.ts mounts this at /legal (LAUNCH_PLAN A3 —
// mount-point prefixes only, no double-prefixing).
const router = new Router();

for (const slug of Object.keys(LEGAL_DOCS)) {
  router.get(`/${slug}`, async(ctx) => {
    const page = getLegalPage(slug);
    if (!page) {
      ctx.status = 404;
      ctx.body = "Document not found";
      return;
    }
    ctx.status = 200;
    ctx.type = "html";
    ctx.body = page;
  });
}

export { router as legalRoutes };
