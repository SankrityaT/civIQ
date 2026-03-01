// Created by Sankritya on Feb 27, 2026
// Knowledge Base API — stats, search, and graph info

import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeBase, ensureKnowledgeBaseIngested } from "@/lib/knowledge-base";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  // Try sidecar first for live stats
  try {
    const res = await fetch(`${SIDECAR_URL}/chunks`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const chunks: Array<{ doc: string; title: string; ctx: string }> = await res.json();
      const docs = new Set(chunks.map(c => c.doc)).size;
      const sections = new Set(chunks.map(c => c.title)).size;
      
      // Estimate concepts from unique capitalized terms
      const allText = chunks.map(c => c.ctx).join(" ");
      const concepts = new Set(
        (allText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) ?? [])
          .filter(m => m.length > 4)
      ).size;
      
      return NextResponse.json({
        stats: {
          totalChunks: chunks.length,
          totalNodes: docs + sections + Math.min(concepts, 50),
          totalEdges: sections + Math.min(concepts, 50),
          documents: docs,
          sections,
          concepts: Math.min(concepts, 50),
        },
      });
    }
  } catch {
    // Fall through to local KB
  }

  // Fallback to local KB
  await ensureKnowledgeBaseIngested();
  const kb = getKnowledgeBase();
  const stats = kb.getGraphStats();
  return NextResponse.json({ stats });
}

export async function POST(req: NextRequest) {
  await ensureKnowledgeBaseIngested();
  const kb = getKnowledgeBase();
  const body = await req.json();
  const { query, topK = 5 } = body as { query: string; topK?: number };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const results = await kb.search(query, topK);
  return NextResponse.json({
    results: results.map((r) => ({
      id: r.chunk.id,
      documentName: r.chunk.documentName,
      sectionTitle: r.chunk.sectionTitle,
      content: r.chunk.content,
      score: Math.round(r.score * 100) / 100,
      concepts: kb.getRelatedConcepts(r.chunk.id),
    })),
  });
}
