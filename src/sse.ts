import type { Usage } from './types';

const encoder = new TextEncoder();

export function sseLine(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export function sseEncode(obj: unknown): Uint8Array {
  return encoder.encode(sseLine(obj));
}

export const tokenEvent = (text: string) => ({ type: 'token' as const, text });
export const sourcesEvent = (items: { title: string; ref: string }[]) => ({ type: 'sources' as const, items });
export const doneEvent = (usage: Usage) => ({ type: 'done' as const, usage });
export const errorEvent = (code: string, message: string) => ({ type: 'error' as const, code, message });
