import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIDECAR_DOCS_DIR = path.join(process.cwd(), "rag-sidecar", "docs");
const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Save PDF to rag-sidecar/docs/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(SIDECAR_DOCS_DIR, safeName);
    await writeFile(filePath, buffer);
    console.log(`📄 Saved PDF to sidecar docs: ${filePath}`);

    // Trigger sidecar re-ingestion (non-blocking — sidecar processes in background)
    let sidecarTriggered = false;
    try {
      const ingestRes = await fetch(`${SIDECAR_URL}/ingest`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      sidecarTriggered = ingestRes.ok;
      console.log(`🐍 Sidecar /ingest triggered: ${ingestRes.status}`);
    } catch (err) {
      console.warn("⚠️  Sidecar not reachable — PDF saved, will be picked up on next start:", err);
    }

    return NextResponse.json({
      success: true,
      fileName: safeName,
      sidecarTriggered,
      message: sidecarTriggered
        ? "PDF saved and sidecar ingestion started"
        : "PDF saved — sidecar will index on next start",
    });
  } catch (error) {
    console.error("❌ Upload to sidecar error:", error);
    return NextResponse.json(
      { error: "Failed to save PDF", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
