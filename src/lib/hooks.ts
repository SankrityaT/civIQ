// Created by Kinjal
// Client-side data fetching hooks — Single Responsibility: fetch + state only
"use client";

import { useState, useEffect, useCallback } from "react";
import { TrainingDocument, AuditEntry, Candidate, RecruitFilters, UploadResponse, VoterStats, Language, UserType } from "@/types";

// ─── Documents ──────────────────────────────────────────────────────────────

export function useDocuments() {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      console.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleStatus = async (id: string) => {
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle" }),
    });
    await refresh();
  };

  const addDocument = async (name: string, wordCount: number, sections: number) => {
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wordCount, sections }),
    });
    await refresh();
  };

  const deleteDocument = async (id: string) => {
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    await refresh();
  };

  return { documents, loading, refresh, toggleStatus, addDocument, deleteDocument };
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

interface AuditFilters {
  userType?: UserType;
  language?: Language;
  flagged?: boolean;
}

interface AuditStats {
  totalToday: number;
  totalAll: number;
  cachedCount: number;
  flaggedCount: number;
  spanishCount: number;
  topTopics: string[];
  avgResponseTime: number;
}

export function useAuditLog(filters?: AuditFilters) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalToday: 0,
    totalAll: 0,
    cachedCount: 0,
    flaggedCount: 0,
    spanishCount: 0,
    topTopics: [],
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.userType) params.set("userType", filters.userType);
      if (filters?.language) params.set("language", filters.language);
      if (filters?.flagged !== undefined) params.set("flagged", String(filters.flagged));

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setStats(data.stats ?? stats);
    } catch {
      console.error("Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.userType, filters?.language, filters?.flagged]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, stats, loading, refresh };
}

// ─── Recruitment ─────────────────────────────────────────────────────────────

export function useRecruitCandidates(filters?: RecruitFilters) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalScored, setTotalScored] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [noData, setNoData] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters ?? {}),
      });
      const data = await res.json();
      setCandidates(data.candidates ?? []);
      setTotalScored(data.totalScored ?? 0);
      setTotalFiltered(data.totalFiltered ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.totalPages ?? 0);
      setScoring(data.scoring ?? false);
      setNoData(data.noData ?? false);
    } catch {
      console.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidates, totalScored, totalFiltered, page, totalPages, scoring, noData, loading, refresh };
}

// ─── Voter Upload ───────────────────────────────────────────────────────────

export function useVoterUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/recruit/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return null;
      }
      setResult(data);
      return data as UploadResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, result };
}

// ─── Voter Stats ────────────────────────────────────────────────────────────

export function useVoterStats() {
  const [stats, setStats] = useState<VoterStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruit");
      const data = await res.json();
      setStats(data as VoterStats);
    } catch {
      console.error("Failed to fetch voter stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
