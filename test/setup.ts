import { fetchMock } from 'cloudflare:test';
import { beforeAll, afterEach } from 'vitest';

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.assertNoPendingInterceptors());
