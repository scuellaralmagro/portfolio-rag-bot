import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { checkRateLimit, checkBudget, recordUsage } from '../src/ratelimit';

describe('rate limit', () => {
  it('allows up to RATE_PER_MIN then blocks', async () => {
    const ip = `1.1.1.${Math.floor(Math.random() * 1000)}`; // unique key per run
    const limit = Number(env.RATE_PER_MIN); // 5
    for (let i = 0; i < limit; i++) {
      expect(await checkRateLimit(ip, env)).toBe(true);
    }
    expect(await checkRateLimit(ip, env)).toBe(false);
  });
});

describe('budget', () => {
  it('is within budget until recorded usage exceeds the cap', async () => {
    expect(await checkBudget(env)).toBe(true);
    await recordUsage(Number(env.DAILY_TOKEN_BUDGET), env);
    expect(await checkBudget(env)).toBe(false);
  });
});
