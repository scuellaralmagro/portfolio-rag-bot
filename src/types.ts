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
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
export interface ChatRequest {
  messages: ChatMessage[];
  turnstileToken: string;
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
