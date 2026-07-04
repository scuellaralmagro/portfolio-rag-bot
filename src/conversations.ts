import type {
  ChatMessage, Env, ListParams, LogParams,
  ConversationListItem, ConversationDetail, ConversationSummary,
} from './types';
import { getBudgetStatus } from './ratelimit';

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

function supabaseHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

export async function logConversation(p: LogParams, env: Env): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/log_conversation`, {
    method: 'POST',
    headers: { ...supabaseHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_session_id: p.sessionId,
      p_messages: p.messages,
      p_sources: p.sources,
      p_preview: previewOf(p.messages),
      p_transcript_text: transcriptText(p.messages),
      p_input_tokens: p.usage.input,
      p_output_tokens: p.usage.output,
      p_country: p.country,
      p_city: p.city,
      p_ip_hash: p.ipHash,
    }),
  });
  if (!res.ok) throw new Error(`logConversation failed: Supabase ${res.status}`);
}

export async function listConversations(
  p: ListParams,
  env: Env,
): Promise<{ items: ConversationListItem[]; summary: ConversationSummary }> {
  const headers = supabaseHeaders(env);
  const [itemsRes, statsRes, dailyTokenBudget] = await Promise.all([
    fetch(`${env.SUPABASE_URL}/rest/v1/conversations?${buildListQuery(p)}`, { headers }),
    fetch(`${env.SUPABASE_URL}/rest/v1/rpc/conversation_stats`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}',
    }),
    getBudgetStatus(env),
  ]);
  if (!itemsRes.ok) throw new Error(`listConversations failed: Supabase ${itemsRes.status}`);
  if (!statsRes.ok) throw new Error(`conversation_stats failed: Supabase ${statsRes.status}`);
  const items = (await itemsRes.json()) as ConversationListItem[];
  const rows = (await statsRes.json()) as { total_conversations: number; total_tokens: number; today: number }[];
  const s = rows[0] ?? { total_conversations: 0, total_tokens: 0, today: 0 };
  return {
    items,
    summary: {
      totalConversations: Number(s.total_conversations),
      totalTokens: Number(s.total_tokens),
      today: Number(s.today),
      dailyTokenBudget,
    },
  };
}

export async function getConversation(id: number, env: Env): Promise<ConversationDetail | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/conversations?id=eq.${id}&select=*&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  if (!res.ok) throw new Error(`getConversation failed: Supabase ${res.status}`);
  const rows = (await res.json()) as ConversationDetail[];
  return rows[0] ?? null;
}
