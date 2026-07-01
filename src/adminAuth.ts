import type { Env } from './types';

export function extractBearer(request: Request): string | null {
  const h = request.headers.get('Authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice('Bearer '.length);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function checkAdminAuth(request: Request, env: Env): boolean {
  const token = extractBearer(request);
  if (!token || !env.ADMIN_KEY) return false;
  return constantTimeEqual(token, env.ADMIN_KEY);
}
