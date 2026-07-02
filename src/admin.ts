import type { Env, ListParams } from './types';
import { checkAdminAuth } from './adminAuth';
import { listConversations, getConversation } from './conversations';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clampInt(v: string | null, dflt: number, max: number): number {
  if (v === null || v.trim() === '') return dflt;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : dflt;
}

function parseListParams(url: URL): ListParams {
  return {
    q: url.searchParams.get('q')?.trim() || undefined,
    from: url.searchParams.get('from')?.trim() || undefined,
    to: url.searchParams.get('to')?.trim() || undefined,
    limit: clampInt(url.searchParams.get('limit'), 50, 100),
    offset: clampInt(url.searchParams.get('offset'), 0, 1_000_000),
  };
}

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  if (!checkAdminAuth(request, env)) return json({ error: 'unauthorized' }, 401);
  try {
    if (url.pathname === '/api/admin/conversations') {
      return json(await listConversations(parseListParams(url), env));
    }
    const m = url.pathname.match(/^\/api\/admin\/conversations\/(\d+)$/);
    if (m) {
      const detail = await getConversation(Number(m[1]), env);
      return detail ? json(detail) : json({ error: 'not_found' }, 404);
    }
    return json({ error: 'not_found' }, 404);
  } catch {
    return json({ error: 'server_error' }, 500);
  }
}
