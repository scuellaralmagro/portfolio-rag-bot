import { fetchMock, env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { embed, retrieve } from '../src/retrieve';

describe('embed', () => {
  it('calls OpenAI embeddings and returns the vector', async () => {
    const vector = Array.from({ length: 1536 }, () => 0.01);
    fetchMock
      .get('https://api.openai.com')
      .intercept({ path: '/v1/embeddings', method: 'POST' })
      .reply(200, { data: [{ embedding: vector }] });

    const result = await embed('hello', 'test-openai-key');
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0.01);
  });

  it('throws on a non-2xx response', async () => {
    fetchMock
      .get('https://api.openai.com')
      .intercept({ path: '/v1/embeddings', method: 'POST' })
      .reply(500, 'boom');

    await expect(embed('hello', 'test-openai-key')).rejects.toThrow(/embed/i);
  });
});

describe('retrieve', () => {
  it('embeds the query then maps match_documents rows to chunks', async () => {
    const vector = Array.from({ length: 1536 }, () => 0.02);
    fetchMock
      .get('https://api.openai.com')
      .intercept({ path: '/v1/embeddings', method: 'POST' })
      .reply(200, { data: [{ embedding: vector }] });
    fetchMock
      .get('https://test.supabase.co')
      .intercept({ path: '/rest/v1/rpc/match_documents', method: 'POST' })
      .reply(200, [
        { id: 1, content: 'Sergio shipped RAG at Kynetix.', metadata: { title: 'Kynetix', ref: 'projects/kynetix' }, similarity: 0.91 },
      ]);

    const chunks = await retrieve('rag experience?', env);
    expect(chunks).toEqual([
      { content: 'Sergio shipped RAG at Kynetix.', title: 'Kynetix', ref: 'projects/kynetix', similarity: 0.91 },
    ]);
  });
});
