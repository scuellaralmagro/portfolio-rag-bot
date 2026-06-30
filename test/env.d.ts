import type { Env } from '../src/types';

declare module 'cloudflare:test' {
  // Make `env` from `cloudflare:test` carry our Worker's Env shape.
  interface ProvidedEnv extends Env {}
}
