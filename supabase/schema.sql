create extension if not exists vector;

create table documents (
  id          bigint generated always as identity primary key,
  content     text not null,
  metadata    jsonb not null default '{}',   -- { source, title, ref, chunk }
  embedding   vector(1536) not null          -- text-embedding-3-small
);

create index on documents using hnsw (embedding vector_cosine_ops);

-- Enable RLS with no policies: the anon/public API key can't read the table,
-- while the Worker's service_role key bypasses RLS (so ingest + retrieval work).
alter table documents enable row level security;

create function match_documents(query_embedding vector(1536), match_count int default 5)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable as $$
  select id, content, metadata,
         1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── Conversation logging (admin vault) ────────────────────────────────────
create table conversations (
  id              bigint generated always as identity primary key,
  session_id      text unique not null,
  messages        jsonb not null,                 -- [{role, content}] full transcript
  sources         jsonb not null default '[]',    -- [{title, ref}] latest cited
  preview         text not null default '',        -- first user message, truncated
  transcript_text text not null default '',        -- all message contents, for search
  input_tokens    int not null default 0,
  output_tokens   int not null default 0,
  country         text,
  city            text,
  ip_hash         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on conversations (created_at desc);

-- RLS on, no policies: anon key can't read; the Worker's service_role bypasses.
alter table conversations enable row level security;

-- Atomic upsert + token accumulation for one conversation (keyed by session_id).
create or replace function log_conversation(
  p_session_id text, p_messages jsonb, p_sources jsonb,
  p_preview text, p_transcript_text text,
  p_input_tokens int, p_output_tokens int,
  p_country text, p_city text, p_ip_hash text
) returns void language sql as $$
  insert into conversations
    (session_id, messages, sources, preview, transcript_text,
     input_tokens, output_tokens, country, city, ip_hash, updated_at)
  values
    (p_session_id, p_messages, p_sources, p_preview, p_transcript_text,
     p_input_tokens, p_output_tokens, p_country, p_city, p_ip_hash, now())
  on conflict (session_id) do update set
    messages        = excluded.messages,
    sources         = excluded.sources,
    transcript_text = excluded.transcript_text,
    input_tokens    = conversations.input_tokens  + excluded.input_tokens,
    output_tokens   = conversations.output_tokens + excluded.output_tokens,
    country         = coalesce(conversations.country, excluded.country),
    city            = coalesce(conversations.city, excluded.city),
    ip_hash         = coalesce(conversations.ip_hash, excluded.ip_hash),
    updated_at      = now();
$$;

-- Global usage summary for the panel header.
create or replace function conversation_stats()
returns table(total_conversations bigint, total_tokens bigint, today bigint)
language sql stable as $$
  select
    count(*),
    coalesce(sum(input_tokens + output_tokens), 0),
    count(*) filter (where created_at >= date_trunc('day', now() at time zone 'utc'))
  from conversations;
$$;
