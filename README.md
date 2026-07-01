# Ask my portfolio — RAG chat API

This is the backend behind the chat box on [sergiocuellar.dev](https://sergiocuellar.dev).
Ask it something about me — my experience, my projects, the stack I work with — and it
answers from a curated knowledge base instead of making things up. It runs entirely on a
single Cloudflare Worker at the edge.

I built it as a small, honest example of a production RAG service: grounded answers,
streaming responses, and the boring-but-necessary parts (auth, rate limits, a spend cap) that
separate a demo from something you can safely put on a public site.

## How it works

A request to `POST /api/chat` goes through a short pipeline:

1. **Verify** the visitor with Cloudflare Turnstile, so bots can't hammer the endpoint.
2. **Throttle** per IP and check a **daily token budget** — both backed by Workers KV. If the
   day's budget is spent, the API says so gracefully instead of running up a bill.
3. **Embed** the question and **retrieve** the most relevant chunks from a Supabase
   `pgvector` store.
4. **Assemble** a tightly scoped prompt: a system message that only answers questions about
   me and refuses everything else, plus the retrieved context and a little chat history.
5. **Stream** the answer back token by token over SSE, then a list of the sources it used.

Answers are grounded in the `knowledge/` folder — hand-written markdown about my background
and projects. If something isn't in there, the assistant is told to say so and point you to
my email rather than invent an answer.

## Stack

TypeScript on Cloudflare Workers (no framework — one route doesn't need one), Workers KV for
counters, Supabase Postgres + `pgvector` for retrieval, and the OpenAI API for embeddings and
generation. Tested with Vitest on `@cloudflare/vitest-pool-workers`.

Generation uses `gpt-5.4-mini` (streamed); embeddings use `text-embedding-3-small` at 1536
dimensions, which is what the `vector(1536)` column in `supabase/schema.sql` expects. If you
swap the embedding model, the dimension has to match.

## Project layout

```
src/
  index.ts     Worker entry — routing + CORS
  chat.ts      the RAG pipeline and SSE stream
  retrieve.ts  OpenAI embeddings + Supabase match_documents
  prompt.ts    system prompt + message assembly
  openai.ts    streaming chat client
  turnstile.ts Cloudflare Turnstile verification
  ratelimit.ts KV rate limit + daily budget
  sse.ts       SSE framing helpers
scripts/       markdown chunker + ingest script (Node)
knowledge/     the source of truth the answers are grounded in
supabase/      schema.sql: documents table + match_documents() + HNSW index
```

## Running it locally

```bash
npm install
npm test          # unit + eval suites
npm run typecheck
npm run dev       # wrangler dev
```

Copy `.dev.vars.example` to `.dev.vars` (git-ignored) and fill in real values. This single
file is used by both `wrangler dev` and `npm run ingest`, so you only keep one set of local
secrets:

```
OPENAI_API_KEY=...
TURNSTILE_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

Use the Supabase **service_role** key (it bypasses RLS to write documents).

## Configuration

Behaviour is tuned through `vars` in `wrangler.jsonc` — no code changes needed:

- `RATE_PER_MIN` (5) — requests per IP per minute
- `DAILY_TOKEN_BUDGET` (200000) — tokens per day before the graceful fallback kicks in
- `HISTORY_WINDOW` (4) — recent messages kept for context
- `TOP_K` (5) — chunks retrieved per question
- `MAX_OUTPUT_TOKENS` (400) — cap per answer
- `ALLOWED_ORIGIN` — the site allowed to call the API (localhost is always allowed in dev)

Whenever the `knowledge/` files change, re-run `npm run ingest` to re-embed them.

## Deploying

1. Create a Supabase project and run `supabase/schema.sql`. Create a KV namespace
   (`npx wrangler kv namespace create KV`) and drop its id into `wrangler.jsonc`. The
   `api.sergiocuellar.dev` route is already configured.
2. Set the secrets: `npx wrangler secret put OPENAI_API_KEY` (and the same for
   `TURNSTILE_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).
3. Ingest the knowledge base: fill in `.dev.vars` (see above) and run `npm run ingest`.
4. `npm test && npm run typecheck`, then `npx wrangler deploy`.

Quick smoke test once it's live:

```bash
curl -N https://api.sergiocuellar.dev/api/chat \
  -H 'Content-Type: application/json' -H 'Origin: https://sergiocuellar.dev' \
  -d '{"messages":[{"role":"user","content":"What is Sergio'\''s RAG experience?"}],"turnstileToken":"<token>"}'
```

You should see a stream of `token` events, then `sources`, then `done`.

## Testing

The suite covers each module plus an eval set (`test/eval.test.ts`) that checks the assembled
prompt actually carries the retrieved context, keeps the refusal guard, and holds prompt
injections beneath the system message — all deterministic, no live API calls.

Before deploying I also run a quick manual pass against the real services: a few grounded
questions (should cite a source), a few off-topic ones (should politely decline and hand out
my email), and a couple of injection attempts (should stay in scope and never leak the
prompt).
