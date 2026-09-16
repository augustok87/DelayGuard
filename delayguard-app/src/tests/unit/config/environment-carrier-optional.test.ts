/**
 * LAUNCH_PLAN §6 R24 — the carrier API key must not be required to boot.
 *
 * Delay detection now has a carrier-independent source: Shopify's own
 * `shipment_status`, pushed on every fulfillments/updated webhook, drives
 * orders.tracking_status and orders.last_tracking_update, which is what RULE 3
 * measures. The app is therefore *functional* with no carrier account at all.
 *
 * Keeping EASYPOST_API_KEY in requiredVars contradicted that design and had a
 * concrete cost: production holds SHIPENGINE_API_KEY and not EASYPOST_API_KEY,
 * so deploying the migration would have failed at cold start — trading a
 * degraded feature for a dead app.
 *
 * The contract pinned here: absence is a WARNING, never an error.
 */
import envValidator from '../../../config/environment';

const REQUIRED_BASE = {
  SHOPIFY_API_KEY: 'key',
  SHOPIFY_API_SECRET: 'secret',
  SHOPIFY_SCOPES: 'write_orders',
  DATABASE_URL: 'postgresql://user:pass@host:5432/db',
  REDIS_URL: 'redis://host:6379',
  SENDGRID_API_KEY: 'SG.key',
  SENDGRID_DELAY_TEMPLATE_ID: 'd-1234567890abcdef1234567890abcdef',
  SENDGRID_FROM_EMAIL: 'noreply@delayguardapp.com',
  TWILIO_ACCOUNT_SID: 'AC',
  TWILIO_AUTH_TOKEN: 'tok',
  TWILIO_PHONE_NUMBER: '+15550000000',
};

describe('environment validator — the carrier key is optional (§6 R24)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...REQUIRED_BASE } as NodeJS.ProcessEnv;
    delete process.env.EASYPOST_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('boots in production with no carrier key at all', () => {
    process.env.NODE_ENV = 'production';

    const result = envValidator.validate();

    // Self-describing on failure: names whatever else broke rather than
    // reporting a bare false.
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('warns about the absent carrier key rather than staying silent', () => {
    process.env.NODE_ENV = 'production';

    const result = envValidator.validate();

    expect(result.warnings.join(' | ')).toMatch(/EASYPOST_API_KEY/);
  });

  // The other half of the contract: a key that IS present must still be
  // checked, so a pasted placeholder cannot reach production unnoticed.
  it('still rejects a placeholder carrier key when one is supplied', () => {
    process.env.NODE_ENV = 'production';
    process.env.EASYPOST_API_KEY = 'your_easypost_key_here';

    const result = envValidator.validate();

    expect(result.errors.join(' | ')).toMatch(/EASYPOST_API_KEY/);
  });

  it('accepts a real carrier key without warning about it', () => {
    process.env.NODE_ENV = 'production';
    process.env.EASYPOST_API_KEY = 'EZAK_live_key';

    const result = envValidator.validate();

    expect(result.warnings.join(' | ')).not.toMatch(/EASYPOST_API_KEY/);
  });
});
