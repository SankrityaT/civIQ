// Created by Kinjal
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Bot,
  Shield,
  RefreshCw,
  User,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION WRAPPER
═══════════════════════════════════════════════════════════════════════════ */
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
          <Icon className="h-4.5 w-4.5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-[15px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-[12px] text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS DOT
═══════════════════════════════════════════════════════════════════════════ */
function StatusDot({ status }: { status: "checking" | "online" | "offline" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "online" && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </>
      )}
      {status === "offline" && <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />}
      {status === "checking" && <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />}
    </span>
  );
}

function statusLabel(status: "checking" | "online" | "offline") {
  return status === "online" ? "Connected" : status === "offline" ? "Offline" : "Checking…";
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  // ─── Live service health checks ────────────────────────────────────────────
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [sidecarStatus, setSidecarStatus] = useState<"checking" | "online" | "offline">("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const OLLAMA_URL = "http://127.0.0.1:11434";
  const OLLAMA_MODEL = "llama3.2:3b-instruct-q4_K_M";
  const GROQ_MODEL = "llama-3.3-70b-versatile";

  const checkServices = useCallback(async () => {
    setRefreshing(true);
    // Ollama
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setOllamaStatus("online");
        const data = await res.json();
        setOllamaModels((data.models ?? []).map((m: { name: string }) => m.name));
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
      setOllamaModels([]);
    }
    // Sidecar
    try {
      const res = await fetch("http://127.0.0.1:8000/health", { signal: AbortSignal.timeout(3000) });
      setSidecarStatus(res.ok ? "online" : "offline");
    } catch {
      setSidecarStatus("offline");
    }
    setRefreshing(false);
  }, []);

  useEffect(() => { checkServices(); }, [checkServices]);

  // ─── Document & audit stats (live from actual APIs) ────────────────────────
  const [docCount, setDocCount] = useState<number | null>(null);
  const [auditTotal, setAuditTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/documents").then(r => r.json()).then(d => {
      const active = (d.documents ?? []).filter((doc: { status: string }) => doc.status === "active").length;
      setDocCount(active);
    }).catch(() => {});
    fetch("/api/audit").then(r => r.json()).then(d => {
      setAuditTotal(d.stats?.totalAll ?? 0);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-7 pt-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
            Settings
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          Service status and system configuration overview.
        </p>
      </div>

      {/* ═══════════ SERVICE STATUS ═══════════ */}
      <Section icon={Bot} title="Service Status" description="Live connection status for all backend services">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-slate-400">Refresh to check current status</span>
          <button
            onClick={checkServices}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Ollama */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusDot status={ollamaStatus} />
              <span className="text-[13px] font-semibold text-slate-700">Ollama (Local LLM)</span>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${ollamaStatus === "online" ? "text-emerald-600" : "text-red-500"}`}>
                  {statusLabel(ollamaStatus)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">URL</span>
                <span className="text-slate-700 font-mono text-[11px]">{OLLAMA_URL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model</span>
                <span className="text-slate-700 font-mono text-[11px]">{OLLAMA_MODEL.split(":")[0]}</span>
              </div>
              {ollamaStatus === "online" && ollamaModels.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Installed</span>
                  <span className="text-slate-700 font-medium">{ollamaModels.length} model{ollamaModels.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidecar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusDot status={sidecarStatus} />
              <span className="text-[13px] font-semibold text-slate-700">RAG Sidecar</span>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${sidecarStatus === "online" ? "text-emerald-600" : "text-red-500"}`}>
                  {statusLabel(sidecarStatus)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">URL</span>
                <span className="text-slate-700 font-mono text-[11px]">http://127.0.0.1:8000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purpose</span>
                <span className="text-slate-700 font-medium">PDF parsing, vector search, scoring</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════ AI CONFIGURATION (read-only) ═══════════ */}
      <Section icon={Shield} title="AI Configuration" description="Current model and provider settings (configured via .env.local)">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-[12px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Provider</span>
              <span className="text-slate-700 font-medium">Ollama (Local)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fallback Provider</span>
              <span className="text-slate-700 font-medium">Groq (Cloud)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ollama Model</span>
              <span className="text-slate-700 font-mono text-[11px]">{OLLAMA_MODEL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Groq Model</span>
              <span className="text-slate-700 font-mono text-[11px]">{GROQ_MODEL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ollama URL</span>
              <span className="text-slate-700 font-mono text-[11px]">{OLLAMA_URL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sidecar URL</span>
              <span className="text-slate-700 font-mono text-[11px]">http://127.0.0.1:8000</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          To change these settings, update the <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-700">.env.local</code> file and restart the dev server.
        </p>
      </Section>

      {/* ═══════════ SYSTEM INFORMATION ═══════════ */}
      <Section icon={User} title="System Information" description="Current environment and usage overview">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-[12px]">
            <div className="flex justify-between">
              <span className="text-slate-400">App Version</span>
              <span className="text-slate-700 font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Environment</span>
              <span className="text-slate-700 font-medium">Development</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Framework</span>
              <span className="text-slate-700 font-medium">Next.js 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Language</span>
              <span className="text-slate-700 font-medium">English / Español</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Documents</span>
              <span className="text-slate-700 font-medium">{docCount ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Audit Queries</span>
              <span className="text-slate-700 font-medium">{auditTotal ?? "—"}</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
