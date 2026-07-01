import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chunkMarkdown, type Chunk } from './chunk';
import { embed } from '../src/retrieve';

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY in the env before running ingest.');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

async function supabase(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
}

async function main(): Promise<void> {
  const files = walk(KNOWLEDGE_DIR);
  const allChunks: Chunk[] = files.flatMap((file) => {
    const ref = relative(KNOWLEDGE_DIR, file).replace(/\.md$/, '').replace(/\\/g, '/');
    return chunkMarkdown(readFileSync(file, 'utf8'), ref);
  });
  console.log(`Read ${files.length} files → ${allChunks.length} chunks`);

  // Truncate then reload (DELETE all rows; id > 0 matches every row).
  const del = await supabase('documents?id=gt.0', { method: 'DELETE' });
  if (!del.ok) throw new Error(`truncate failed: ${del.status} ${await del.text()}`);

  for (const [i, c] of allChunks.entries()) {
    const embedding = await embed(c.content, OPENAI_API_KEY!);
    const row = { content: c.content, metadata: { title: c.title, ref: c.ref, chunk: i }, embedding };
    const ins = await supabase('documents', { method: 'POST', body: JSON.stringify(row) });
    if (!ins.ok) throw new Error(`insert ${i} failed: ${ins.status} ${await ins.text()}`);
    console.log(`  upserted ${i + 1}/${allChunks.length} (${c.ref} — ${c.title})`);
  }
  console.log('Ingest complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
