import { handleChat } from './chat';
import type { Env } from './types';

const DEV_ORIGIN = 'http://localhost:4321';

function allowedOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin');
  if (origin === env.ALLOWED_ORIGIN || origin === DEV_ORIGIN) return origin;
  return null;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const origin = allowedOrigin(req, env);
  if (origin) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });
    if (url.pathname !== '/api/chat') return new Response('Not Found', { status: 404, headers: cors });

    const res = await handleChat(req, env, ctx);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  },
};
