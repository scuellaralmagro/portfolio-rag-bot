import { fetchMock, env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { streamChat } from '../src/openai';

function sseBody(): string {
  return [
    'data: {"choices":[{"delta":{"content":"Sergio "}}]}',
    'data: {"choices":[{"delta":{"content":"shipped RAG."}}]}',
    'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":812,"completion_tokens":143}}',
    'data: [DONE]',
    '',
  ].join('\n\n');
}

describe('streamChat', () => {
  it('yields tokens then a usage record', async () => {
    fetchMock
      .get('https://api.openai.com')
      .intercept({ path: '/v1/chat/completions', method: 'POST' })
      .reply(200, sseBody(), { headers: { 'Content-Type': 'text/event-stream' } });

    const tokens: string[] = [];
    let usage: { input: number; output: number } | undefined;
    for await (const part of streamChat([{ role: 'user', content: 'rag?' }], env)) {
      if (part.token) tokens.push(part.token);
      if (part.usage) usage = part.usage;
    }
    expect(tokens.join('')).toBe('Sergio shipped RAG.');
    expect(usage).toEqual({ input: 812, output: 143 });
  });

  it('throws on a non-2xx response', async () => {
    fetchMock
      .get('https://api.openai.com')
      .intercept({ path: '/v1/chat/completions', method: 'POST' })
      .reply(429, 'rate limited');

    const gen = streamChat([{ role: 'user', content: 'hi' }], env);
    await expect(gen.next()).rejects.toThrow(/openai/i);
  });
});
