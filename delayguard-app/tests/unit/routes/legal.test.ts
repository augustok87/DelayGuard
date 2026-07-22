/**
 * Unit Tests: Legal document routes (LAUNCH_PLAN WS-H task H-1)
 *
 * Serves legal/privacy-policy.md and legal/terms-of-service.md as clean HTML at
 * GET /legal/privacy-policy and GET /legal/terms-of-service.
 * Required by Shopify App Store listing (privacy policy / terms URLs must be
 * publicly hosted — they 404 in production today).
 */

import Koa from 'koa';
import Router from 'koa-router';
import request from 'supertest';
import { legalRoutes, renderMarkdown } from '../../../src/routes/legal';

/**
 * Mounts the legal router exactly the way server.ts should (mount-point
 * prefix only — no router-level prefix, per LAUNCH_PLAN task A3).
 */
function buildCallback() {
  const app = new Koa();
  const root = new Router();
  root.use('/legal', legalRoutes.routes(), legalRoutes.allowedMethods());
  app.use(root.routes());
  app.use(root.allowedMethods());
  return app.callback();
}

describe('GET /legal/privacy-policy', () => {
  it('returns 200 with an HTML content type', async() => {
    const response = await request(buildCallback())
      .get('/legal/privacy-policy')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  it('renders the privacy policy markdown as a full HTML page', async() => {
    const response = await request(buildCallback())
      .get('/legal/privacy-policy')
      .expect(200);

    expect(response.text).toContain('<!DOCTYPE html>');
    expect(response.text).toContain('<title>DelayGuard Privacy Policy</title>');
    expect(response.text).toContain('DelayGuard Privacy Policy');
    // Real section content from legal/privacy-policy.md
    expect(response.text).toContain('Information We Collect');
  });

  it('converts markdown syntax instead of leaking it', async() => {
    const response = await request(buildCallback())
      .get('/legal/privacy-policy')
      .expect(200);

    // No raw markdown artifacts in the rendered page
    expect(response.text).not.toContain('**');
    expect(response.text).not.toContain('## ');
    expect(response.text).not.toContain('undefined');
  });
});

describe('GET /legal/terms-of-service', () => {
  it('returns 200 with an HTML content type', async() => {
    const response = await request(buildCallback())
      .get('/legal/terms-of-service')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  it('renders the terms of service markdown as a full HTML page', async() => {
    const response = await request(buildCallback())
      .get('/legal/terms-of-service')
      .expect(200);

    expect(response.text).toContain('<!DOCTYPE html>');
    expect(response.text).toContain(
      '<title>DelayGuard Terms of Service</title>',
    );
    expect(response.text).toContain('Acceptance of Terms');
  });
});

describe('GET /legal/<unknown>', () => {
  it('returns 404 for paths that are not served legal documents', async() => {
    await request(buildCallback()).get('/legal/cookie-policy').expect(404);
  });

  it('returns 404 for path traversal attempts', async() => {
    await request(buildCallback())
      .get('/legal/..%2Fprivacy-policy')
      .expect(404);
  });
});

describe('legal routes when the docs directory is missing', () => {
  const originalDir = process.env.LEGAL_DOCS_DIR;

  afterEach(() => {
    if (originalDir === undefined) {
      delete process.env.LEGAL_DOCS_DIR;
    } else {
      process.env.LEGAL_DOCS_DIR = originalDir;
    }
    jest.resetModules();
  });

  it('returns 404 instead of crashing when the markdown cannot be found', async() => {
    process.env.LEGAL_DOCS_DIR = '/nonexistent/legal-docs-dir';
    jest.resetModules();

    // Re-import so the module resolves the (bogus) override directory
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshModule = require('../../../src/routes/legal');
    const app = new Koa();
    const root = new Router();
    root.use(
      '/legal',
      freshModule.legalRoutes.routes(),
      freshModule.legalRoutes.allowedMethods(),
    );
    app.use(root.routes());

    await request(app.callback()).get('/legal/privacy-policy').expect(404);
  });
});

describe('renderMarkdown', () => {
  it('renders headings h1-h3', () => {
    expect(renderMarkdown('# Title')).toContain('<h1>Title</h1>');
    expect(renderMarkdown('## Section')).toContain('<h2>Section</h2>');
    expect(renderMarkdown('### Subsection')).toContain('<h3>Subsection</h3>');
  });

  it('renders bold and italic inline marks', () => {
    expect(renderMarkdown('**Effective Date**: today')).toContain(
      '<strong>Effective Date</strong>: today',
    );
    expect(renderMarkdown('*emphasis*')).toContain('<em>emphasis</em>');
  });

  it('groups consecutive list items into a single list', () => {
    const html = renderMarkdown('- first\n- second');
    expect(html.match(/<ul>/g)).toHaveLength(1);
    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<li>second</li>');
  });

  it('renders http(s) links as anchors', () => {
    expect(
      renderMarkdown('[Shopify Privacy Policy](https://www.shopify.com/legal/privacy)'),
    ).toContain(
      '<a href="https://www.shopify.com/legal/privacy" rel="noopener noreferrer">Shopify Privacy Policy</a>',
    );
  });

  it('renders horizontal rules', () => {
    expect(renderMarkdown('---')).toContain('<hr');
  });

  it('wraps plain text in paragraphs', () => {
    expect(renderMarkdown('Just a sentence.')).toContain(
      '<p>Just a sentence.</p>',
    );
  });

  it('escapes raw HTML so markdown content cannot inject markup', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
