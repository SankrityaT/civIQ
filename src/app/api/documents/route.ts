import { NextRequest, NextResponse } from "next/server";
import {
  getDocuments,
  addDocument,
  toggleDocumentStatus,
  deleteDocument,
} from "@/lib/document-store";

export async function GET() {
  return NextResponse.json({ documents: getDocuments() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, wordCount, sections } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Document name is required" }, { status: 400 });
  }

  const doc = addDocument({
    name: name.trim(),
    wordCount: wordCount ?? 0,
    sections: sections ?? 0,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
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
