/**
 * The SendGrid SDK binding must survive TypeScript's CommonJS interop.
 *
 * Regression (LAUNCH_PLAN §6 R14). `email-service.ts` used
 * `import * as sgMail from "@sendgrid/mail"`. With `module: commonjs` +
 * `esModuleInterop`, that compiles to `__importStar`, which copies only
 * the module's **own** enumerable properties.
 *
 * `@sendgrid/mail` exports an *instance* of `MailService`, so `setApiKey`
 * and `send` live on the prototype — `__importStar` drops both. Production
 * therefore threw `sgMail.setApiKey is not a function` on **every** email:
 * the dashboard test alert and the cron notification sweep alike.
 *
 * This is deliberately NOT mocked. `email-service.test.ts` mocks
 * `@sendgrid/mail`, so it asserted against a hand-written object that had
 * the methods — and stayed green for the entire life of the defect.
 * A mocked boundary cannot tell you the real module's shape.
 */

import { EmailService } from '../../../src/services/email-service';

describe('SendGrid SDK binding (unmocked)', () => {
  it('constructs without losing setApiKey to CommonJS interop', () => {
    // The constructor calls sgMail.setApiKey().
    expect(() => new EmailService('SG.test.not-a-real-key')).not.toThrow();
  });

  it('exposes send() as a callable, not just a copied own-property', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk = require('@sendgrid/mail');
    const bound = sdk.default ?? sdk;

    expect(typeof bound.setApiKey).toBe('function');
    expect(typeof bound.send).toBe('function');
  });
});
