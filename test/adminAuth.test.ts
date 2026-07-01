import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { extractBearer, constantTimeEqual, checkAdminAuth } from '../src/adminAuth';

function req(auth?: string): Request {
  return new Request('https://api.sergiocuellar.dev/api/admin/conversations', {
    headers: auth ? { Authorization: auth } : {},
  });
}

describe('admin auth', () => {
  it('extracts a bearer token', () => {
    expect(extractBearer(req('Bearer abc'))).toBe('abc');
    expect(extractBearer(req('Basic abc'))).toBeNull();
    expect(extractBearer(req())).toBeNull();
  });

  it('constantTimeEqual compares by value and length', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });

  it('checkAdminAuth accepts the configured key and rejects others', () => {
    // vitest.config.ts binds ADMIN_KEY = 'test-admin-key'
    expect(checkAdminAuth(req('Bearer test-admin-key'), env)).toBe(true);
    expect(checkAdminAuth(req('Bearer wrong'), env)).toBe(false);
    expect(checkAdminAuth(req(), env)).toBe(false);
  });
});
