import type { Env } from './types';

export async function handleChat(
  _request: Request,
  _env: Env,
  _ctx: ExecutionContext,
): Promise<Response> {
  return new Response('data: {"type":"done","usage":{"input":0,"output":0}}\n\n', {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
