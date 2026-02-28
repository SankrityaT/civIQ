// Created by Kinjal
// In-memory document store — Single Responsibility: document CRUD only
// Production: swap for SQLite or local file store

import { TrainingDocument, DocumentStatus } from "@/types";

const documents: TrainingDocument[] = [
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

export function getDocuments(): TrainingDocument[] {
  return [...documents];
}

export function getDocumentById(id: string): TrainingDocument | undefined {
  return documents.find((d) => d.id === id);
}

export function getActiveDocumentCount(): number {
  return documents.filter((d) => d.status === "active").length;
}

export function toggleDocumentStatus(id: string): TrainingDocument | null {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return null;
  doc.status = doc.status === "active" ? "inactive" : "active";
  doc.lastUpdated = new Date().toISOString();
  return { ...doc };
}

export function addDocument(params: {
  name: string;
  wordCount: number;
  sections: number;
}): TrainingDocument {
  const doc: TrainingDocument = {
    id: `doc-${String(documents.length + 1).padStart(3, "0")}`,
    name: params.name,
    status: "active" as DocumentStatus,
    wordCount: params.wordCount,
    sections: params.sections,
    uploadedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  documents.push(doc);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const idx = documents.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  documents.splice(idx, 1);
  return true;
}
