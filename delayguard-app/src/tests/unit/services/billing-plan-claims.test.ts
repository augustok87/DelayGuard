/**
 * LAUNCH_PLAN §6 R20 + decision D3 — the app must not advertise a capability
 * it cannot perform.
 *
 * D3 sets SMS to OFF at launch (email-only), and `app_settings.sms_enabled`
 * defaults to FALSE to match. But the plan configs returned by
 * `getPlanConfig()` listed "Email and SMS notifications" on both paid tiers,
 * and the App Store listing sold the same thing — while the Twilio account is
 * a trial that owns NO phone number and has never sent a message (verified
 * against the Twilio API 2026-08-26: `IncomingPhoneNumbers` empty, the
 * configured `TWILIO_PHONE_NUMBER` not on the account, 0 messages).
 *
 * A reviewer subscribing to Pro to test a $7 feature that silently does
 * nothing is a rejection, and a rejection costs a full review cycle.
 *
 * ⚠️ DELETE THIS TEST when D3 is reversed — i.e. once the Twilio account is
 * upgraded, an SMS-capable number is purchased, and A2P 10DLC brand +
 * campaign registration is approved. Until then it is the guard that keeps
 * the paid-plan copy honest.
 */
import { billingService, type PlanTier } from '../../../services/billing-service';

const TIERS: PlanTier[] = ['free', 'pro', 'enterprise'];

describe('plan feature claims match what the app can actually deliver (§6 R20)', () => {
  it.each(TIERS)('the %s plan does not advertise SMS while D3 holds', tier => {
    const features = billingService.getPlanConfig(tier).features ?? [];

    expect(features.filter(f => /sms/i.test(f))).toEqual([]);
  });

  it('still advertises email, which the app demonstrably does deliver', () => {
    // Guards the over-correction: stripping SMS must not strip the channel
    // that actually works (a real email was delivered from production
    // 2026-08-25). Passes in both states by design — see tests.md.
    for (const tier of TIERS) {
      const features = billingService.getPlanConfig(tier).features ?? [];
      expect(features.some(f => /email/i.test(f))).toBe(true);
    }
  });

  it('keeps SMS gated in code so it can be switched on without a rewrite', () => {
    // D3 turns SMS off in COPY, not in capability: the plan gate must still
    // reserve it for Pro+ so re-enabling is a config change, not a refactor.
    expect(billingService.isSmsAllowed('free')).toBe(false);
    expect(billingService.isSmsAllowed('pro')).toBe(true);
    expect(billingService.isSmsAllowed('enterprise')).toBe(true);
  });
});
