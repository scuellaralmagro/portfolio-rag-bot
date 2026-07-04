import { fetchMock, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { handleAdmin } from '../src/admin';

beforeAll(() => fetchMock.activate());

const origin = 'https://api.sergiocuellar.dev';
const base = 'https://test.supabase.co';

function get(path: string, auth?: string): { request: Request; url: URL } {
  const url = new URL(origin + path);
  const request = new Request(url, { headers: auth ? { Authorization: auth } : {} });
  return { request, url };
}

describe('handleAdmin', () => {
  it('401s without a valid key', async () => {
    const { request, url } = get('/api/admin/conversations');
    const res = await handleAdmin(request, env, url);
    expect(res.status).toBe(401);
  });

  it('lists conversations with a valid key', async () => {
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?'), method: 'GET' })
      .reply(200, [{ id: 1, session_id: 's1', created_at: 't', updated_at: 't', country: null, city: null, ip_hash: null, input_tokens: 1, output_tokens: 2, preview: 'hi' }]);
    fetchMock.get(base).intercept({ path: '/rest/v1/rpc/conversation_stats', method: 'POST' })
      .reply(200, [{ total_conversations: 1, total_tokens: 3, today: 1 }]);
    const { request, url } = get('/api/admin/conversations', 'Bearer test-admin-key');
    const res = await handleAdmin(request, env, url);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; summary: { totalTokens: number } };
    expect(body.items).toHaveLength(1);
    expect(body.summary.totalTokens).toBe(3);
  });

  it('includes the remaining daily token budget in the summary', async () => {
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?'), method: 'GET' })
      .reply(200, []);
    fetchMock.get(base).intercept({ path: '/rest/v1/rpc/conversation_stats', method: 'POST' })
      .reply(200, [{ total_conversations: 0, total_tokens: 0, today: 0 }]);
    const { request, url } = get('/api/admin/conversations', 'Bearer test-admin-key');
    const res = await handleAdmin(request, env, url);
    expect(res.status).toBe(200);
    const body = await res.json() as { summary: { dailyTokenBudget: { limit: number; used: number; remaining: number } } };
    const limit = Number(env.DAILY_TOKEN_BUDGET);
    expect(body.summary.dailyTokenBudget).toEqual({ limit, used: 0, remaining: limit });
  });

  it('defaults to limit=50 (not 0) when no limit param is given', async () => {
    let listedPath = '';
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?'), method: 'GET' })
      .reply(200, (opts) => { listedPath = String(opts.path); return []; });
    fetchMock.get(base).intercept({ path: '/rest/v1/rpc/conversation_stats', method: 'POST' })
      .reply(200, [{ total_conversations: 0, total_tokens: 0, today: 0 }]);
    const { request, url } = get('/api/admin/conversations', 'Bearer test-admin-key');
    const res = await handleAdmin(request, env, url);
    expect(res.status).toBe(200);
    expect(listedPath).toContain('limit=50');
    expect(listedPath).not.toContain('limit=0');
  });

  it('404s for an unknown conversation id', async () => {
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?id=eq.999'), method: 'GET' }).reply(200, []);
    const { request, url } = get('/api/admin/conversations/999', 'Bearer test-admin-key');
    const res = await handleAdmin(request, env, url);
    expect(res.status).toBe(404);
  });
});
