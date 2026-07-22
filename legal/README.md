# DelayGuard Legal Documentation

**Project**: DelayGuard Shopify App
**Last Updated**: 2026-07-22

## Documents in this directory (6 files)

### Public-facing (served by the app)

1. **privacy-policy.md** — GDPR-aware privacy policy. Served at `/legal/privacy-policy` by `delayguard-app/src/routes/legal.ts`.
2. **terms-of-service.md** — Terms and conditions. Served at `/legal/terms-of-service`.

### Internal compliance references

3. **data-protection-policy.md** — Data security framework.
4. **shopify-app-store-compliance.md** — Shopify platform requirements and guidelines reference.
5. **legal-compliance-checklist.md** — Compliance tracking checklist.
6. **README.md** — This file.

> Earlier revisions of this README listed 13 documents (cookie policy, liability disclaimer, GDPR guide, LLC/tax guides, compliance summary). Those files were never created or were removed; only the 6 files above exist. If a new legal document is added, list it here in the same commit.

## Hosting

The privacy policy and terms of service are rendered from markdown to HTML at request time by the Koa route module `delayguard-app/src/routes/legal.ts` (unit-tested in `delayguard-app/tests/unit/routes/legal.test.ts`). The Shopify App Store listing must link to the production URLs:

- `https://<SHOPIFY_APP_URL>/legal/privacy-policy`
- `https://<SHOPIFY_APP_URL>/legal/terms-of-service`

## Contact Information

**DelayGuard**
Email: augustok87@gmail.com
Address: Billinghurst 1664, 5A, Buenos Aires, Argentina

**Data Protection / Legal Compliance**
Email: augustok87@gmail.com

## Document Maintenance

- Review compliance status regularly and before each App Store submission.
- Update `privacy-policy.md` / `terms-of-service.md` whenever data collection, pricing, or features change — the served pages update automatically on the next deploy.
- Professional legal review is recommended before commercial launch.

---

*Note: currently operating as an individual developer. Business-entity formation (LLC) is planned for the commercial phase; legal documents will be updated with entity information upon formation.*
