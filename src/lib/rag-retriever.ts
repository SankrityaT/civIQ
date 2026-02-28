// Created by Sankritya on Feb 27, 2026
// RAG Retriever — calls the Python sidecar for hybrid BM25 + dense retrieval.
// Falls back to the TypeScript knowledge-base if the sidecar is unavailable.

import { SourceMeta } from "@/types";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";
const SIDECAR_TIMEOUT_MS = 15_000;

// ─── Types matching the Python sidecar response ──────────────────────────────

interface SidecarChunk {
  chunk_id: string;
  page_number: number;
  section_title: string;
  chunk_content: string;
  score: number;
  document_id: string;
  document_name: string;
}

interface SidecarResponse {
  results: SidecarChunk[];
  query: string;
}

// ─── Health check (cached per process) ───────────────────────────────────────

let sidecarAvailable: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL_MS = 30_000;

async function isSidecarUp(): Promise<boolean> {
  const now = Date.now();
  if (sidecarAvailable !== null && now - lastCheck < CHECK_INTERVAL_MS) {
    return sidecarAvailable;
  }
  try {
    const res = await fetch(`${SIDECAR_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    sidecarAvailable = res.ok;
  } catch {
    sidecarAvailable = false;
  }
  lastCheck = now;
  return sidecarAvailable;
}

// ─── Primary: Python sidecar ─────────────────────────────────────────────────

async function retrieveFromSidecar(query: string, topK = 15): Promise<SourceMeta[]> {
  const res = await fetch(`${SIDECAR_URL}/retrieve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
    signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Sidecar responded ${res.status}: ${await res.text()}`);
  }

  const data: SidecarResponse = await res.json();

  return data.results.map((r, i) => ({
    documentId: r.document_id,
    documentName: r.document_name,
    sectionTitle: r.section_title,
    sectionIndex: i,
    pageNumber: r.page_number,
    chunkContent: r.chunk_content,
    score: r.score,
  }));
}

// ─── Fallback: TypeScript knowledge-base ─────────────────────────────────────

async function retrieveFromTS(query: string, topK = 5): Promise<SourceMeta[]> {
  const { getKnowledgeBase, ensureKnowledgeBaseIngested } = await import("./knowledge-base");
  await ensureKnowledgeBaseIngested();
  const kb = getKnowledgeBase();
  const results = await kb.search(query, topK, 0.0);
  return results.map((r, i) => ({
    documentId: r.chunk.documentId,
    documentName: r.chunk.documentName,
    sectionTitle: r.chunk.sectionTitle,
    sectionIndex: r.chunk.sectionIndex ?? i,
    pageNumber: r.chunk.pageNumber ?? 1,
    chunkContent: r.chunk.rawContent ?? r.chunk.content,
    score: r.score,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RetrievalResult {
  sourceMeta: SourceMeta[];
  context: string;
  usedSidecar: boolean;
}

export async function retrieve(query: string, topK = 15): Promise<RetrievalResult> {
  const up = await isSidecarUp();

  let sourceMeta: SourceMeta[];
  let usedSidecar = false;

  if (up) {
    try {
      sourceMeta = await retrieveFromSidecar(query, topK);
      usedSidecar = true;
      console.log(`🐍 [RAG] Sidecar returned ${sourceMeta.length} chunks for "${query}"`);
    } catch (err) {
      console.warn("⚠️  [RAG] Sidecar failed, falling back to TS KB:", err);
      sourceMeta = await retrieveFromTS(query, topK);
    }
  } else {
    console.log("📚 [RAG] Sidecar offline — using TS knowledge base");
    sourceMeta = await retrieveFromTS(query, topK);
  }

  // Build RAG context — page number shown first so the model anchors to specific source
  const context = sourceMeta
    .map(
      (m, i) =>
        `[Passage ${i + 1} | Page ${m.pageNumber} | ${m.documentName} — ${m.sectionTitle}]\n${m.chunkContent}`
    )
    .join("\n\n");

  return { sourceMeta, context, usedSidecar };
}
