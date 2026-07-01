import { fetchMock, env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { handleChat } from '../src/chat';

function post(body: unknown): Request {
  return new Request('https://api.sergiocuellar.dev/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `9.9.9.${Math.floor(Math.random() * 1000)}` },
    body: JSON.stringify(body),
  });
}

async function readSSE(res: Response): Promise<string> {
  return await new Response(res.body).text();
}

function mockHappyPath() {
  fetchMock.get('https://challenges.cloudflare.com')
    .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' }).reply(200, { success: true });
  fetchMock.get('https://api.openai.com')
    .intercept({ path: '/v1/embeddings', method: 'POST' })
    .reply(200, { data: [{ embedding: Array.from({ length: 1536 }, () => 0.01) }] });
  fetchMock.get('https://test.supabase.co')
    .intercept({ path: '/rest/v1/rpc/match_documents', method: 'POST' })
    .reply(200, [{ id: 1, content: 'Sergio shipped RAG.', metadata: { title: 'Kynetix', ref: 'projects/kynetix' }, similarity: 0.9 }]);
  fetchMock.get('https://api.openai.com')
    .intercept({ path: '/v1/chat/completions', method: 'POST' })
    .reply(200, ['data: {"choices":[{"delta":{"content":"Sergio shipped RAG."}}]}',
                 'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}',
                 'data: [DONE]', ''].join('\n\n'),
           { headers: { 'Content-Type': 'text/event-stream' } });
  fetchMock.get('https://test.supabase.co')
    .intercept({ path: '/rest/v1/rpc/log_conversation', method: 'POST' }).reply(204, '');
}

describe('handleChat', () => {
  it('returns 400 when there is no user message', async () => {
    const ctx = createExecutionContext();
    const res = await handleChat(post({ messages: [], turnstileToken: 't' }), env, ctx);
    expect(res.status).toBe(400);
  });

  it('returns 403 when Turnstile fails', async () => {
    fetchMock.get('https://challenges.cloudflare.com')
      .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' }).reply(200, { success: false });
    const ctx = createExecutionContext();
    const res = await handleChat(post({ messages: [{ role: 'user', content: 'hi' }], turnstileToken: 'bad' }), env, ctx);
    expect(res.status).toBe(403);
  });

  it('streams token, sources and done on the happy path', async () => {
    mockHappyPath();
    const ctx = createExecutionContext();
    const res = await handleChat(post({ messages: [{ role: 'user', content: 'rag?' }], turnstileToken: 'ok' }), env, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const text = await readSSE(res);
    await waitOnExecutionContext(ctx);
    expect(text).toContain('"type":"token"');
    expect(text).toContain('Sergio shipped RAG.');
    expect(text).toContain('"type":"sources"');
    expect(text).toContain('projects/kynetix');
    expect(text).toContain('"type":"done"');
  });

  it('emits budget_exceeded and makes no OpenAI call when over budget', async () => {
    fetchMock.get('https://challenges.cloudflare.com')
      .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' }).reply(200, { success: true });
    const { recordUsage } = await import('../src/ratelimit');
    await recordUsage(Number(env.DAILY_TOKEN_BUDGET), env); // push over the cap
    const ctx = createExecutionContext();
    const res = await handleChat(post({ messages: [{ role: 'user', content: 'rag?' }], turnstileToken: 'ok' }), env, ctx);
    const text = await readSSE(res);
    expect(res.status).toBe(200);
    expect(text).toContain('"type":"error"');
    expect(text).toContain('budget_exceeded');
  });

  it('schedules a conversation log on the happy path', async () => {
    mockHappyPath();
    const ctx = createExecutionContext();
    const res = await handleChat(
      post({ messages: [{ role: 'user', content: 'rag?' }], turnstileToken: 'ok', sessionId: 'sess-1' }),
      env, ctx,
    );
    await readSSE(res);
    await waitOnExecutionContext(ctx);
    // If the log_conversation interceptor was never hit, this throws.
    fetchMock.assertNoPendingInterceptors();
  });

  it('still completes the stream when logging fails', async () => {
    fetchMock.get('https://challenges.cloudflare.com')
      .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' }).reply(200, { success: true });
    fetchMock.get('https://api.openai.com')
      .intercept({ path: '/v1/embeddings', method: 'POST' })
      .reply(200, { data: [{ embedding: Array.from({ length: 1536 }, () => 0.01) }] });
    fetchMock.get('https://test.supabase.co')
      .intercept({ path: '/rest/v1/rpc/match_documents', method: 'POST' })
      .reply(200, [{ id: 1, content: 'x', metadata: { title: 'T', ref: 'r' }, similarity: 0.9 }]);
    fetchMock.get('https://api.openai.com')
      .intercept({ path: '/v1/chat/completions', method: 'POST' })
      .reply(200, ['data: {"choices":[{"delta":{"content":"hi"}}]}', 'data: [DONE]', ''].join('\n\n'),
             { headers: { 'Content-Type': 'text/event-stream' } });
    fetchMock.get('https://test.supabase.co')
      .intercept({ path: '/rest/v1/rpc/log_conversation', method: 'POST' }).reply(500, 'boom');
    const ctx = createExecutionContext();
    const res = await handleChat(post({ messages: [{ role: 'user', content: 'hi' }], turnstileToken: 'ok', sessionId: 's2' }), env, ctx);
    const text = await readSSE(res);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(text).toContain('"type":"done"');
  });
});
