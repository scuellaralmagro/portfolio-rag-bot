import { fetchMock } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { verifyTurnstile } from '../src/turnstile';

describe('verifyTurnstile', () => {
  it('returns true when siteverify succeeds', async () => {
    fetchMock
      .get('https://challenges.cloudflare.com')
      .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' })
      .reply(200, { success: true });
    expect(await verifyTurnstile('tok', 'secret', '1.2.3.4')).toBe(true);
  });

  it('returns false when siteverify rejects', async () => {
    fetchMock
      .get('https://challenges.cloudflare.com')
      .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' })
      .reply(200, { success: false, 'error-codes': ['invalid-input-response'] });
    expect(await verifyTurnstile('bad', 'secret', '1.2.3.4')).toBe(false);
  });

  it('returns false for an empty token without calling siteverify', async () => {
    expect(await verifyTurnstile('', 'secret', '1.2.3.4')).toBe(false);
  });
});
