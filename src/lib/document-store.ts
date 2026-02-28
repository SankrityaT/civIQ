// Created by Kinjal
// In-memory document store — Single Responsibility: document CRUD only
// Production: swap for SQLite or local file store

import { TrainingDocument, DocumentStatus } from "@/types";

const documents: TrainingDocument[] = [];
const deletedSidecarNames = new Set<string>();

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

export function isSidecarDocDeleted(name: string): boolean {
  return deletedSidecarNames.has(name);
}

export function upsertSidecarDocument(name: string, sectionCount: number, pageCount: number): TrainingDocument {
  if (deletedSidecarNames.has(name)) return { id: "", name, status: "inactive" as DocumentStatus, wordCount: 0, sections: 0, uploadedAt: "", lastUpdated: "" };
  const existing = documents.find((d) => d.name === name);
  if (existing) {
    existing.sections = sectionCount;
    existing.lastUpdated = existing.lastUpdated;
    return { ...existing };
  }
  const doc: TrainingDocument = {
    id: `sidecar-${name.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 20)}`,
    name,
    status: "active" as DocumentStatus,
    wordCount: pageCount * 200,
    sections: sectionCount,
    uploadedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  documents.push(doc);
  return doc;
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
  const [removed] = documents.splice(idx, 1);
  // Mark sidecar-synced docs as deleted so they won't re-appear on next GET
  if (removed.id.startsWith("sidecar-")) {
    deletedSidecarNames.add(removed.name);
  }
  return true;
}
