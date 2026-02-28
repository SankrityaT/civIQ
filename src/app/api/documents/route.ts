import { NextRequest, NextResponse } from "next/server";
import {
  getDocuments,
  addDocument,
  upsertSidecarDocument,
  toggleDocumentStatus,
  deleteDocument,
} from "@/lib/document-store";
import { getKnowledgeBase } from "@/lib/knowledge-base";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  // Sync real documents from sidecar chunks
  try {
    const res = await fetch(`${SIDECAR_URL}/chunks`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const chunks: Array<{ id: string; doc: string; title: string; page: number }> = await res.json();
      // Aggregate by doc name
      const docMap = new Map<string, { sections: Set<string>; pages: Set<number> }>();
      for (const chunk of chunks) {
        if (!docMap.has(chunk.doc)) docMap.set(chunk.doc, { sections: new Set(), pages: new Set() });
        docMap.get(chunk.doc)!.sections.add(chunk.title);
        docMap.get(chunk.doc)!.pages.add(chunk.page);
      }
      for (const [docName, data] of docMap) {
        upsertSidecarDocument(docName, data.sections.size, data.pages.size);
      }
    }
  } catch {
    // Sidecar offline — return store as-is
  }
  return NextResponse.json({ documents: getDocuments() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, sections } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Document name is required" }, { status: 400 });
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "Sections array is required" }, { status: 400 });
  }

  // Calculate total word count
  const totalWords = sections.reduce((sum: number, s: { content: string }) => {
    return sum + s.content.split(/\s+/).length;
  }, 0);

  // Preserve pageStart/pageEnd from parsed PDF
  const sectionsWithPages = sections.map((s: { title: string; content: string; pageStart?: number; pageEnd?: number }) => ({
    title: s.title,
    content: s.content,
    pageStart: s.pageStart,
    pageEnd: s.pageEnd,
  }));

  // Add to document store
  const doc = addDocument({
    name: name.trim(),
    wordCount: totalWords,
    sections: sections.length,
  });

  // Ingest into knowledge base
  try {
    const kb = getKnowledgeBase();
    const chunksAdded = await kb.ingestDocument(doc, sectionsWithPages);
    console.log(`✅ Ingested ${chunksAdded} chunks from ${doc.name}`);
  } catch (error) {
    console.error("❌ Knowledge base ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to ingest into knowledge base", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }

  return NextResponse.json({ document: doc, message: "Document ingested successfully" }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, action } = body;

  if (!id) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  if (action === "toggle") {
    const doc = toggleDocumentStatus(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
  }

  if (action === "delete") {
    const deleted = deleteDocument(id);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
