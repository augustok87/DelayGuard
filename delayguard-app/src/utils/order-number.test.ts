/**
 * LAUNCH_PLAN §6 R18 defect 1 — `Order ##DG1001` in the first real email.
 *
 * `orders.order_number` stores Shopify's `name` field, which already carries
 * the merchant's prefix (`#DG1001`). Both renderers add their own `#`
 * (the SendGrid template's `#{{orderNumber}}`, and sms-service's
 * `order #${orderNumber}`), so a real order doubles it. The contract this
 * pins: renderers own the `#`, the data carries the bare number.
 */
import { formatOrderNumber } from './order-number';

describe('formatOrderNumber (§6 R18)', () => {
  it('strips the prefix Shopify already stored', () => {
    expect(formatOrderNumber('#DG1001')).toBe('DG1001');
  });

  it('leaves a bare number untouched', () => {
    expect(formatOrderNumber('1001')).toBe('1001');
  });

  it('collapses an already-doubled prefix', () => {
    expect(formatOrderNumber('##DG1001')).toBe('DG1001');
  });

  it('does not strip a # that is not a prefix', () => {
    expect(formatOrderNumber('DG#1001')).toBe('DG#1001');
  });

  it('survives empty and whitespace-padded values', () => {
    expect(formatOrderNumber('')).toBe('');
    expect(formatOrderNumber('  #DG1001 ')).toBe('DG1001');
  });
});
