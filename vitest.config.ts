import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            OPENAI_API_KEY: 'test-openai-key',
            TURNSTILE_SECRET: 'test-turnstile-secret',
            SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_SERVICE_KEY: 'test-service-key',
            ADMIN_KEY: 'test-admin-key',
            IP_HASH_SALT: 'test-salt',
          },
        },
      },
    },
  },
});
