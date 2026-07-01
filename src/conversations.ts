import type { ChatMessage, ListParams } from './types';

const LIST_COLUMNS =
  'id,session_id,created_at,updated_at,country,city,ip_hash,input_tokens,output_tokens,preview';

export function previewOf(messages: ChatMessage[], max = 120): string {
  const text = messages.find((m) => m.role === 'user')?.content ?? '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function transcriptText(messages: ChatMessage[]): string {
  return messages.map((m) => m.content).join('\n');
}

export function assembleTranscript(messages: ChatMessage[], assistantText: string): ChatMessage[] {
  return [...messages, { role: 'assistant', content: assistantText }];
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export function buildListQuery(p: ListParams): string {
  const sp = new URLSearchParams();
  sp.set('select', LIST_COLUMNS);
  sp.set('order', 'created_at.desc');
  sp.set('limit', String(p.limit));
  sp.set('offset', String(p.offset));
  if (p.q) sp.append('transcript_text', `ilike.*${p.q}*`);
  if (p.from) sp.append('created_at', `gte.${p.from}`);
  if (p.to) sp.append('created_at', `lte.${p.to}`);
  return sp.toString();
}
