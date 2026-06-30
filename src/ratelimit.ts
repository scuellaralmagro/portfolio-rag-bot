import type { Env } from './types';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(ip: string, env: Env): Promise<boolean> {
  const key = `rl:${ip}`;
  const current = Number((await env.KV.get(key)) ?? '0');
  if (current >= Number(env.RATE_PER_MIN)) return false;
  await env.KV.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}

export async function checkBudget(env: Env): Promise<boolean> {
  const used = Number((await env.KV.get(`budget:${todayUTC()}`)) ?? '0');
  return used < Number(env.DAILY_TOKEN_BUDGET);
}

export async function recordUsage(tokens: number, env: Env): Promise<void> {
  const key = `budget:${todayUTC()}`;
  const used = Number((await env.KV.get(key)) ?? '0');
  await env.KV.put(key, String(used + tokens), { expirationTtl: 60 * 60 * 48 });
}
