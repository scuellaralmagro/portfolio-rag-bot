import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildMessages } from '../src/prompt';
import type { ChatMessage, RetrievedChunk } from '../src/types';

const chunks: RetrievedChunk[] = [
  { content: 'Sergio shipped RAG at Kynetix.', title: 'Kynetix', ref: 'projects/kynetix', similarity: 0.9 },
];

describe('buildMessages', () => {
  it('puts the system prompt + numbered context first', () => {
    const out = buildMessages([{ role: 'user', content: 'rag?' }], chunks, 4);
    expect(out[0].role).toBe('system');
    expect(out[0].content).toContain(SYSTEM_PROMPT);
    expect(out[0].content).toContain('[1] Kynetix');
    expect(out[0].content).toContain('Sergio shipped RAG at Kynetix.');
  });

  it('instructs the model to reply in the user\'s language', () => {
    expect(SYSTEM_PROMPT).toMatch(/same language the user writes in/i);
  });

  it('keeps only the last `window` history messages, in order', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
      { role: 'assistant', content: 'd' },
      { role: 'user', content: 'e' },
    ];
    const out = buildMessages(history, chunks, 4);
    expect(out.slice(1)).toEqual(history.slice(-4));
    expect(out).toHaveLength(5); // 1 system + 4 history
  });
});
