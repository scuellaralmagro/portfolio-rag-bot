create extension if not exists vector;

create table documents (
  id          bigint generated always as identity primary key,
  content     text not null,
  metadata    jsonb not null default '{}',   -- { source, title, ref, chunk }
  embedding   vector(1536) not null          -- text-embedding-3-small
);

create index on documents using hnsw (embedding vector_cosine_ops);

create function match_documents(query_embedding vector(1536), match_count int default 5)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable as $$
  select id, content, metadata,
         1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
