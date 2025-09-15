// Minimal SSE reader using fetch Response.body
// Supports lines like: "event: name" and "data: {...}"

export type SSEMessage = {
  event?: string;
  data?: string;
};

export async function* readSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const msg = parseSSEChunk(chunk);
      if (msg) yield msg;
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim().length) {
    const msg = parseSSEChunk(buffer);
    if (msg) yield msg;
  }
}

function parseSSEChunk(chunk: string): SSEMessage | null {
  const lines = chunk.split('\n').map((l) => l.trim());
  let event: string | undefined;
  let data: string | undefined;
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      const v = line.slice(5).trim();
      data = data ? data + '\n' + v : v;
    }
  }
  if (!event && !data) return null;
  return { event, data };
}
