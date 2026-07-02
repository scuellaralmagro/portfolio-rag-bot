# Ask My Portfolio — RAG Chat API

Ask My Portfolio is the grounded retrieval-augmented-generation (RAG) chat API that powers
the "Ask my portfolio" chat box on Sergio's website — the very chat you may be using right
now is served by this project. It answers questions about Sergio, his experience, and his
projects strictly from a curated knowledge base, rather than making things up. The entire
service runs on a single Cloudflare Worker at the edge.

## How it works

Each request runs through a short pipeline: it verifies the visitor with Cloudflare
Turnstile, throttles requests per IP and enforces a daily token budget (both backed by
Workers KV), embeds the question and retrieves the most relevant chunks from a Supabase
pgvector store, assembles a tightly scoped prompt with the retrieved context, and streams
the answer back token by token over Server-Sent Events (SSE) followed by its sources. If an
answer isn't in the knowledge base, the assistant says so and points to Sergio's email
instead of inventing one.

## Why it matters

It is a compact, honest example of production RAG: grounded answers, token streaming, and the
guardrails — bot verification, rate limiting, a daily spend cap, refusal behaviour, and
prompt-injection resistance — that make a public AI endpoint safe and cheap to operate.
Conversations are logged (country, city, and a salted, truncated IP hash — never raw IPs) to
a key-gated admin vault for observability.

## Ask My Portfolio tech stack and source

TypeScript on Cloudflare Workers (no framework), Workers KV for counters, Supabase Postgres
with pgvector for retrieval, Cloudflare Turnstile for bot protection, and the OpenAI API for
embeddings (text-embedding-3-small) and generation, tested with Vitest. The source code is
public on GitHub at github.com/scuellaralmagro/portfolio-rag-bot.
