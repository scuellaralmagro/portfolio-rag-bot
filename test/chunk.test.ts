import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from '../scripts/chunk';

describe('chunkMarkdown', () => {
  it('splits by heading and carries the heading as the chunk title', () => {
    const md = `# About\nSergio is an ML engineer.\n\n## Experience\nShipped RAG at Kynetix.`;
    const chunks = chunkMarkdown(md, 'about');
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ title: 'About', ref: 'about' });
    expect(chunks[0].content).toContain('ML engineer');
    expect(chunks[1].title).toBe('Experience');
  });

  it('further splits a long section into overlapping chunks', () => {
    const body = 'x'.repeat(6000);
    const chunks = chunkMarkdown(`# Big\n${body}`, 'big', 2800, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.title === 'Big')).toBe(true);
  });
});
