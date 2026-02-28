// Created by Sankritya on Feb 27, 2026
// Knowledge Base API — stats, search, and graph info

import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeBase, ensureKnowledgeBaseIngested } from "@/lib/knowledge-base";

export async function GET() {
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
