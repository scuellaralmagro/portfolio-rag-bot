import { describe, it, expect } from 'vitest';
import { sseLine, sseEncode, tokenEvent, sourcesEvent, doneEvent, errorEvent } from '../src/sse';

describe('sse', () => {
  it('frames an object as a single SSE data event terminated by a blank line', () => {
    expect(sseLine(tokenEvent('hi'))).toBe('data: {"type":"token","text":"hi"}\n\n');
  });

  it('encodes to UTF-8 bytes', () => {
    const bytes = sseEncode(tokenEvent('hi'));
    expect(new TextDecoder().decode(bytes)).toBe('data: {"type":"token","text":"hi"}\n\n');
  });

  it('builds sources/done/error events', () => {
    expect(sourcesEvent([{ title: 'Kynetix', ref: 'projects/kynetix' }])).toEqual({
      type: 'sources',
      items: [{ title: 'Kynetix', ref: 'projects/kynetix' }],
    });
    expect(doneEvent({ input: 10, output: 5 })).toEqual({ type: 'done', usage: { input: 10, output: 5 } });
    expect(errorEvent('budget_exceeded', 'limit')).toEqual({
      type: 'error',
      code: 'budget_exceeded',
      message: 'limit',
    });
  });
});
