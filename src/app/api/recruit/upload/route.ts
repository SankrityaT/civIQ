// Created by Kinjal
// Proxy CSV upload to RAG sidecar /upload-voters endpoint

import { NextRequest, NextResponse } from "next/server";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    // Forward the file to the sidecar as multipart/form-data
    const sidecarForm = new FormData();
    sidecarForm.append("file", file);

    const res = await fetch(`${SIDECAR_URL}/upload-voters`, {
      method: "POST",
      body: sidecarForm,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Sidecar error" }));
      return NextResponse.json(
        { error: err.detail ?? "Upload failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API] recruit/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
