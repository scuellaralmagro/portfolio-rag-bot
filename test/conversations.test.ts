import { describe, it, expect } from 'vitest';
import {
  previewOf, transcriptText, assembleTranscript, hashIp, buildListQuery,
} from '../src/conversations';

const msgs = [
  { role: 'user' as const, content: 'What is Sergio good at?' },
  { role: 'assistant' as const, content: 'RAG and agents.' },
];

describe('conversation helpers', () => {
  it('previewOf returns the first user message, truncated', () => {
    expect(previewOf(msgs)).toBe('What is Sergio good at?');
    expect(previewOf([{ role: 'user', content: 'x'.repeat(200) }], 10)).toBe('xxxxxxxxxx…');
  });

  it('transcriptText joins all contents', () => {
    expect(transcriptText(msgs)).toBe('What is Sergio good at?\nRAG and agents.');
  });

  it('assembleTranscript appends the assistant answer', () => {
    const out = assembleTranscript([{ role: 'user', content: 'hi' }], 'hello');
    expect(out).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  it('hashIp is stable, salted, and never equals the raw ip', async () => {
    const a = await hashIp('1.2.3.4', 'salt');
    const b = await hashIp('1.2.3.4', 'salt');
    const c = await hashIp('1.2.3.4', 'other');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(16);
    expect(a).not.toContain('1.2.3.4');
  });

  it('buildListQuery sets order/limit/offset and optional filters', () => {
    const base = buildListQuery({ limit: 50, offset: 0 });
    expect(base).toContain('order=created_at.desc');
    expect(base).toContain('limit=50');
    expect(base).toContain('offset=0');
    const filtered = buildListQuery({ q: 'rag', from: '2026-01-01', to: '2026-12-31', limit: 10, offset: 20 });
    expect(filtered).toContain('transcript_text=ilike');
    expect(filtered).toContain('created_at=gte.2026-01-01');
    expect(filtered).toContain('created_at=lte.2026-12-31');
  });
});
