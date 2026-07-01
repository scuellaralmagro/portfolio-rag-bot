export interface Chunk {
  content: string;
  title: string;
  ref: string;
}

export function chunkMarkdown(
  markdown: string,
  ref: string,
  maxChars = 2800,
  overlap = 200,
): Chunk[] {
  const lines = markdown.split('\n');
  const sections: { title: string; body: string[] }[] = [];
  let current = { title: '', body: [] as string[] };
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) {
      if (current.body.length || current.title) sections.push(current);
      current = { title: h[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length || current.title) sections.push(current);

  const chunks: Chunk[] = [];
  for (const s of sections) {
    const text = s.body.join('\n').trim();
    if (!text) continue;
    const step = Math.max(1, maxChars - overlap);
    for (let i = 0; i < text.length; i += step) {
      chunks.push({ content: text.slice(i, i + maxChars), title: s.title, ref });
    }
  }
  return chunks;
}
