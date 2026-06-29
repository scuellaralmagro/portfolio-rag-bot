import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('router', () => {
  it('returns 405 for GET', async () => {
    const res = await SELF.fetch('https://api.sergiocuellar.dev/api/chat', { method: 'GET' });
    expect(res.status).toBe(405);
  });

  it('answers OPTIONS preflight with 204 and CORS for the allowed origin', async () => {
    const res = await SELF.fetch('https://api.sergiocuellar.dev/api/chat', {
      method: 'OPTIONS',
      headers: { Origin: 'https://sergiocuellar.dev' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sergiocuellar.dev');
  });

  it('does not reflect a disallowed origin', async () => {
    const res = await SELF.fetch('https://api.sergiocuellar.dev/api/chat', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns 404 for an unknown path', async () => {
    const res = await SELF.fetch('https://api.sergiocuellar.dev/nope', { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('delegates POST /api/chat (200)', async () => {
    const res = await SELF.fetch('https://api.sergiocuellar.dev/api/chat', { method: 'POST' });
    expect(res.status).toBe(200);
  });
});
