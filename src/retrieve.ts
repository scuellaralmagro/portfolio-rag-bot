import type { Env, RetrievedChunk } from './types';

export async function embed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embed failed: OpenAI ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export async function retrieve(query: string, env: Env): Promise<RetrievedChunk[]> {
  const embedding = await embed(query, env.OPENAI_API_KEY);
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/match_documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query_embedding: embedding, match_count: Number(env.TOP_K) }),
  });
  if (!res.ok) throw new Error(`retrieve failed: Supabase ${res.status}`);
  const rows = (await res.json()) as {
    content: string;
    metadata: { title?: string; ref?: string };
    similarity: number;
  }[];
  return rows.map((r) => ({
    content: r.content,
    title: r.metadata?.title ?? '',
    ref: r.metadata?.ref ?? '',
    similarity: r.similarity,
  }));
}
