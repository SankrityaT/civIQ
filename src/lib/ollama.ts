const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b-instruct-q4_K_M";

export { OLLAMA_MODEL };

let _ollamaAvailable: boolean | null = null;

export async function isOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) { _ollamaAvailable = false; return false; }
    const data = await res.json();
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
    const base = OLLAMA_MODEL.split(":")[0];
    _ollamaAvailable = models.some(m => m.includes(base));
    return _ollamaAvailable;
  } catch {
    _ollamaAvailable = false;
    return false;
  }
}

// Reset cache so next request re-checks (call after model pull)
export function resetOllamaCache() {
  _ollamaAvailable = null;
}

/**
 * Non-streaming Ollama call — returns full text or null.
 */
export async function ollamaComplete(
  messages: Array<{ role: string; content: string }>,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.1,
          num_predict: opts.maxTokens ?? 512,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Streaming Ollama call — yields text deltas.
 * Uses native ReadableStream from fetch + newline-delimited JSON.
 */
export async function ollamaStream(
  messages: Array<{ role: string; content: string }>,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<ReadableStream<string> | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        options: {
          temperature: opts.temperature ?? 0.1,
          num_predict: opts.maxTokens ?? 512,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const lines = decoder.decode(value).split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const delta = obj.message?.content ?? "";
            if (delta) controller.enqueue(delta);
            if (obj.done) { controller.close(); return; }
          } catch { /* skip malformed lines */ }
        }
      },
      cancel() { reader.cancel(); },
    });
  } catch {
    return null;
  }
}
