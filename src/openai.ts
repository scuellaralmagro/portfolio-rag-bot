import type { ChatMessage, Env, Usage } from './types';

export async function* streamChat(
  messages: ChatMessage[],
  env: Env,
): AsyncGenerator<{ token?: string; usage?: Usage }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: Number(env.MAX_OUTPUT_TOKENS),
    }),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      if (!data) continue;
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      const token = json.choices?.[0]?.delta?.content;
      if (token) yield { token };
      if (json.usage) yield { usage: { input: json.usage.prompt_tokens, output: json.usage.completion_tokens } };
    }
  }
}
