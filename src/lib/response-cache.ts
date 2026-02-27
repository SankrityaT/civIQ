// In-memory response cache (keyed by normalized question)
// Production: swap Map for Redis or SQLite

interface CachedEntry {
  response: string;
  source: string;
  cachedAt: number;
}

const cache = new Map<string, CachedEntry>();

/** Normalize a question for consistent cache keys */
function normalizeKey(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, " ");
}

export function getCachedResponse(question: string): CachedEntry | null {
  return cache.get(normalizeKey(question)) ?? null;
}

export function setCachedResponse(
  question: string,
  response: string,
  source: string
): void {
  cache.set(normalizeKey(question), { response, source, cachedAt: Date.now() });
}

export function getCacheSize(): number {
  return cache.size;
}

export function getAllCachedResponses(): {
  question: string;
  response: string;
  source: string;
  cachedAt: number;
}[] {
  return Array.from(cache.entries()).map(([question, entry]) => ({
    question,
    ...entry,
  }));
}

export function deleteCachedResponse(question: string): boolean {
  return cache.delete(normalizeKey(question));
}
