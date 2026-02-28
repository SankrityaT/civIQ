// Created by Kinjal
// Proxy scoring/filtering requests to RAG sidecar /score-voters endpoint

import { NextRequest, NextResponse } from "next/server";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${SIDECAR_URL}/score-voters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Sidecar error" }));
      // 404 means no data uploaded yet — return empty state
      if (res.status === 404) {
        return NextResponse.json({
          candidates: [],
          totalScored: 0,
          totalFiltered: 0,
          page: 1,
          pageSize: body.pageSize ?? 50,
          totalPages: 0,
          scoring: false,
          noData: true,
        });
      }
      return NextResponse.json(
        { error: err.detail ?? "Scoring failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API] recruit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${SIDECAR_URL}/voter-stats`);
    if (!res.ok) {
      return NextResponse.json({ loaded: false, totalRecords: 0 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ loaded: false, totalRecords: 0 });
  }
}
