import { NextResponse } from "next/server";
import { TrainingDocument } from "@/types";

// Sample documents — in production, read from SQLite / local file store
const SAMPLE_DOCUMENTS: TrainingDocument[] = [
  {
    id: "doc-001",
    name: "Poll Worker Training Manual 2026",
    status: "active",
    wordCount: 1240,
    sections: 8,
    uploadedAt: "2026-01-15T09:00:00Z",
    lastUpdated: "2026-02-01T14:30:00Z",
  },
  {
    id: "doc-002",
    name: "Election Day Procedures Guide",
    status: "active",
    wordCount: 820,
    sections: 5,
    uploadedAt: "2026-01-20T10:00:00Z",
    lastUpdated: "2026-01-20T10:00:00Z",
  },
  {
    id: "doc-003",
    name: "Voter ID Requirements by State",
    status: "inactive",
    wordCount: 490,
    sections: 3,
    uploadedAt: "2026-01-22T11:00:00Z",
    lastUpdated: "2026-01-22T11:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json({ documents: SAMPLE_DOCUMENTS });
}

export async function POST() {
  // TODO: handle real document upload + text extraction
  return NextResponse.json({ message: "Upload not yet implemented" }, { status: 501 });
}
