import { fetchMock } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { embed } from '../src/retrieve';

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
