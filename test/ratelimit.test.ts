import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { checkRateLimit, checkBudget, recordUsage, getBudgetStatus } from '../src/ratelimit';

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

describe('getBudgetStatus', () => {
  it('reports remaining tokens against the daily cap after usage is recorded', async () => {
    const limit = Number(env.DAILY_TOKEN_BUDGET);
    const before = await getBudgetStatus(env);
    expect(before).toEqual({ limit, used: 0, remaining: limit });

    await recordUsage(100, env);

    const after = await getBudgetStatus(env);
    expect(after).toEqual({ limit, used: 100, remaining: limit - 100 });
  });

  it('floors remaining at 0 once usage exceeds the cap', async () => {
    const limit = Number(env.DAILY_TOKEN_BUDGET);
    await recordUsage(limit + 500, env);

    const status = await getBudgetStatus(env);
    expect(status.remaining).toBe(0);
  });
});
