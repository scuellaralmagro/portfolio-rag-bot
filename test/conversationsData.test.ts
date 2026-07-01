import { fetchMock, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { logConversation, listConversations, getConversation } from '../src/conversations';

beforeAll(() => fetchMock.activate());
afterEach(() => fetchMock.assertNoPendingInterceptors());

const base = 'https://test.supabase.co';

describe('conversation data access', () => {
  it('logConversation posts to the log_conversation RPC', async () => {
    fetchMock.get(base).intercept({ path: '/rest/v1/rpc/log_conversation', method: 'POST' }).reply(204, '');
    await logConversation({
      sessionId: 's1',
      messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'yo' }],
      sources: [{ title: 'Kynetix', ref: 'projects/kynetix' }],
      usage: { input: 10, output: 5 },
      country: 'ES', city: 'Marbella', ipHash: 'abcd',
    }, env);
  });

  it('listConversations returns items + summary', async () => {
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?'), method: 'GET' })
      .reply(200, [{ id: 1, session_id: 's1', created_at: 't', updated_at: 't', country: 'ES', city: 'Marbella', ip_hash: 'abcd', input_tokens: 10, output_tokens: 5, preview: 'hi' }]);
    fetchMock.get(base).intercept({ path: '/rest/v1/rpc/conversation_stats', method: 'POST' })
      .reply(200, [{ total_conversations: 3, total_tokens: 42, today: 1 }]);
    const out = await listConversations({ limit: 50, offset: 0 }, env);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].preview).toBe('hi');
    expect(out.summary).toEqual({ totalConversations: 3, totalTokens: 42, today: 1 });
  });

  it('getConversation returns the row or null', async () => {
    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?id=eq.1'), method: 'GET' })
      .reply(200, [{ id: 1, session_id: 's1', created_at: 't', updated_at: 't', country: null, city: null, ip_hash: null, input_tokens: 0, output_tokens: 0, preview: 'hi', messages: [{ role: 'user', content: 'hi' }], sources: [] }]);
    const detail = await getConversation(1, env);
    expect(detail?.id).toBe(1);
    expect(detail?.messages[0].content).toBe('hi');

    fetchMock.get(base).intercept({ path: (p) => p.startsWith('/rest/v1/conversations?id=eq.2'), method: 'GET' }).reply(200, []);
    expect(await getConversation(2, env)).toBeNull();
  });
});
