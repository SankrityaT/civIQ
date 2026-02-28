import { NextRequest, NextResponse } from "next/server";
import {
  getDocuments,
  addDocument,
  toggleDocumentStatus,
  deleteDocument,
} from "@/lib/document-store";
import { getKnowledgeBase } from "@/lib/knowledge-base";

export async function GET() {
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
