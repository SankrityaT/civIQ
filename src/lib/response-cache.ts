// In-memory response cache (keyed by normalized question)
// Production: swap Map for Redis or SQLite

import { SourceMeta } from "@/types";

interface CachedEntry {
  response: string;
  source: string;
  sourceMeta?: SourceMeta[];
  cachedAt: number;
  version: number;
}

const cache = new Map<string, CachedEntry>();
const CACHE_VERSION = 7;

/** Normalize a question for consistent cache keys */
function normalizeKey(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, " ");
}

export function getCachedResponse(question: string): CachedEntry | null {
  const entry = cache.get(normalizeKey(question));
  if (!entry) return null;
  if (entry.version !== CACHE_VERSION) return null;
  return entry;
}

export function setCachedResponse(
  question: string,
  response: string,
  source: string,
  sourceMeta?: SourceMeta[]
): void {
  cache.set(normalizeKey(question), {
    response,
    source,
    sourceMeta,
    cachedAt: Date.now(),
    version: CACHE_VERSION,
  });
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
    response: entry.response,
    source: entry.source,
    cachedAt: entry.cachedAt,
  }));
}

export function deleteCachedResponse(question: string): boolean {
  return cache.delete(normalizeKey(question));
}
