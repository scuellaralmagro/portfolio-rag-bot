export interface Env {
  KV: KVNamespace;
  OPENAI_API_KEY: string;
  TURNSTILE_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  RATE_PER_MIN: string;
  DAILY_TOKEN_BUDGET: string;
  HISTORY_WINDOW: string;
  TOP_K: string;
  MAX_OUTPUT_TOKENS: string;
  ALLOWED_ORIGIN: string;
  ADMIN_KEY: string;
  IP_HASH_SALT: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
export interface ChatRequest {
  messages: ChatMessage[];
  turnstileToken: string;
  sessionId?: string;
}
export interface RetrievedChunk {
  content: string;
  title: string;
  ref: string;
  similarity: number;
}
export interface Usage {
  input: number;
  output: number;
}
export interface ConversationSummary {
  totalConversations: number;
  totalTokens: number;
  today: number;
  dailyTokenBudget: { limit: number; used: number; remaining: number };
}
export interface ConversationListItem {
  id: number;
  session_id: string;
  created_at: string;
  updated_at: string;
  country: string | null;
  city: string | null;
  ip_hash: string | null;
  input_tokens: number;
  output_tokens: number;
  preview: string;
}
export interface ConversationDetail extends ConversationListItem {
  messages: ChatMessage[];
  sources: { title: string; ref: string }[];
}
export interface ListParams {
  q?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}
export interface LogParams {
  sessionId: string;
  messages: ChatMessage[];
  sources: { title: string; ref: string }[];
  usage: Usage;
  country: string | null;
  city: string | null;
  ipHash: string;
}
