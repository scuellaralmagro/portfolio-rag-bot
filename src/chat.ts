import type { ChatRequest, Env, Usage } from './types';
import { verifyTurnstile } from './turnstile';
import { checkRateLimit, checkBudget, recordUsage } from './ratelimit';
import { retrieve } from './retrieve';
import { buildMessages } from './prompt';
import { streamChat } from './openai';
import { logConversation, assembleTranscript, hashIp } from './conversations';
import { sseEncode, tokenEvent, sourcesEvent, doneEvent, errorEvent } from './sse';

const BUDGET_MSG =
  "The live demo has hit its daily limit. You can reach Sergio at info@sergiocuellar.dev.";

function bad(status: number, message: string): Response {
  return new Response(message, { status });
}

export async function handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return bad(400, 'Malformed JSON');
  }
  const userMsgs = (body.messages ?? []).filter((m) => m.role === 'user');
  if (userMsgs.length === 0) return bad(400, 'No user message');

  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';

  if (!(await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET, ip))) {
    return bad(403, 'Turnstile verification failed');
  }
  if (!(await checkRateLimit(ip, env))) {
    return bad(429, "You're going a bit fast — try again in a moment.");
  }

  const latest = userMsgs[userMsgs.length - 1].content;
  const sessionId = body.sessionId ?? crypto.randomUUID();
  const cf = (request as { cf?: { country?: string; city?: string } }).cf;
  const country = cf?.country ?? null;
  const city = cf?.city ?? null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (o: unknown) => controller.enqueue(sseEncode(o));
      try {
        if (!(await checkBudget(env))) {
          emit(errorEvent('budget_exceeded', BUDGET_MSG));
          return;
        }
        const chunks = await retrieve(latest, env);
        const messages = buildMessages(body.messages, chunks, Number(env.HISTORY_WINDOW));

        let usage: Usage = { input: 0, output: 0 };
        let assistantText = '';
        for await (const part of streamChat(messages, env)) {
          if (part.token) {
            assistantText += part.token;
            emit(tokenEvent(part.token));
          }
          if (part.usage) usage = part.usage;
        }
        const sources = chunks.map((c) => ({ title: c.title, ref: c.ref }));
        emit(sourcesEvent(sources));
        emit(doneEvent(usage));
        ctx.waitUntil(recordUsage(usage.input + usage.output, env));
        ctx.waitUntil(
          (async () => {
            try {
              const ipHash = await hashIp(ip, env.IP_HASH_SALT);
              await logConversation(
                {
                  sessionId,
                  messages: assembleTranscript(body.messages, assistantText),
                  sources,
                  usage,
                  country,
                  city,
                  ipHash,
                },
                env,
              );
            } catch {
              // Logging must never break or delay the visitor's chat.
            }
          })(),
        );
      } catch {
        emit(errorEvent('server_error', 'Something went wrong. Please try again.'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
