/**
 * LAUNCH_PLAN §6 R11 — the boot validator ignored the two variables whose
 * absence silently broke every production delay email for three weeks.
 *
 * The failure this prevents is subtle: a previous session read the startup log,
 * saw no warning about SENDGRID_DELAY_TEMPLATE_ID, and took that as evidence
 * the deploy had picked the value up. It was not evidence — the validator
 * never looked at the variable, so its silence meant nothing (global rule #11:
 * a check that cannot fail proves nothing).
 *
 * `resolveDelayTemplateId()` / `resolveFromAddress()` do refuse to send without
 * them, but only on the send path, and for three weeks nothing ever sent. The
 * contract pinned here: production boot names them; non-production warns.
 */
import envValidator from '../../../config/environment';

const REQUIRED_BASE = {
  SHOPIFY_API_KEY: 'key',
  SHOPIFY_API_SECRET: 'secret',
  SHOPIFY_SCOPES: 'write_orders',
  DATABASE_URL: 'postgresql://user:pass@host:5432/db',
  REDIS_URL: 'redis://host:6379',
  SHIPENGINE_API_KEY: 'se',
  SENDGRID_API_KEY: 'SG.key',
  TWILIO_ACCOUNT_SID: 'AC',
  TWILIO_AUTH_TOKEN: 'tok',
  TWILIO_PHONE_NUMBER: '+15550000000',
};

describe('environment validator — SendGrid delivery variables (§6 R11)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...REQUIRED_BASE } as NodeJS.ProcessEnv;
    delete process.env.SENDGRID_DELAY_TEMPLATE_ID;
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('fails production validation when SENDGRID_DELAY_TEMPLATE_ID is absent', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@delayguardapp.com';

    const result = envValidator.validate();

    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain('SENDGRID_DELAY_TEMPLATE_ID');
  });

  it('fails production validation when SENDGRID_FROM_EMAIL is absent', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENDGRID_DELAY_TEMPLATE_ID = 'd-4a91c0f2b7e34d5a8c1f60b92e7d3a58';

    const result = envValidator.validate();

    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain('SENDGRID_FROM_EMAIL');
  });

  // Passes in both the broken and fixed states, deliberately (tests.md): it is
  // the false-positive guard, and it is NOT a check that cannot fail — an
  // earlier draft of this validator rejected any id not matching
  // /^d-[0-9a-f]{32}$/, and this test is what caught it. Production calls
  // process.exit(1) on a failed validation, so a rule that is merely too
  // narrow is an outage.
  it('passes production validation when both are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENDGRID_DELAY_TEMPLATE_ID = 'd-4a91c0f2b7e34d5a8c1f60b92e7d3a58';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@delayguardapp.com';

    const result = envValidator.validate();

    expect(result.errors.join('\n')).not.toContain('SENDGRID_');
  });

  it('warns about — but never kills production for — an odd from-address', () => {
    // Module load calls process.exit(1) on an invalid production environment,
    // and the real value is Sensitive and unreadable. A format rule that is
    // merely too narrow (SendGrid also accepts `Name <addr@host>`) must not be
    // able to take down a working deployment.
    process.env.NODE_ENV = 'production';
    process.env.SENDGRID_DELAY_TEMPLATE_ID = 'd-4a91c0f2b7e34d5a8c1f60b92e7d3a58';
    process.env.SENDGRID_FROM_EMAIL = 'delayguardapp.com';

    const result = envValidator.validate();

    expect(result.warnings.join('\n')).toMatch(/SENDGRID_FROM_EMAIL/);
    expect(result.errors.join('\n')).not.toMatch(/SENDGRID_FROM_EMAIL/);
    expect(result.isValid).toBe(true);
  });

  it("rejects EmailService's dev placeholder template id", () => {
    // Shipping the placeholder to production 400s at SendGrid and drops the
    // notification. Only this known-bad value is rejected — the real id is a
    // Sensitive Vercel variable, so guessing its exact format could fail boot
    // on a good deployment.
    process.env.NODE_ENV = 'production';
    process.env.SENDGRID_DELAY_TEMPLATE_ID = 'd-delay-notification-template';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@delayguardapp.com';

    const result = envValidator.validate();

    expect(result.warnings.join('\n')).toContain('SENDGRID_DELAY_TEMPLATE_ID');
    expect(result.errors.join('\n')).not.toContain('placeholder');
  });

  it('only warns outside production, so local dev still boots', () => {
    process.env.NODE_ENV = 'development';

    const result = envValidator.validate();

    expect(result.errors.join('\n')).not.toContain('SENDGRID_DELAY_TEMPLATE_ID');
    expect(result.warnings.join('\n')).toContain('SENDGRID_DELAY_TEMPLATE_ID');
    expect(result.warnings.join('\n')).toContain('SENDGRID_FROM_EMAIL');
  });
});
