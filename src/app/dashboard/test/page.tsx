"use client";
import { useState, useEffect } from "react";
import TestChat from "@/components/dashboard/TestChat";
import AuditLog from "@/components/dashboard/AuditLog";
import {
  FlaskConical,
  Activity,
  Brain,
  Database,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Globe,
  TrendingUp,
  Network,
  ClipboardList,
} from "lucide-react";
import { useAuditLog } from "@/lib/hooks";

interface KBStats {
  totalChunks: number;
  totalNodes: number;
  totalEdges: number;
  documents: number;
  sections: number;
  concepts: number;
}

export default function TestPage() {
  const { stats } = useAuditLog();
  const [kbStats, setKbStats] = useState<KBStats | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "audit">("chat");

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((d) => setKbStats(d.stats))
      .catch(() => {});
  }, []);

  const cacheRate = stats.totalAll > 0 ? Math.round((stats.cachedCount / stats.totalAll) * 100) : 0;

  return (
    <div className="space-y-6 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
              AI Command Center
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Test, monitor, and audit Sam&apos;s AI responses — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[13px] font-semibold text-emerald-600">Sam Online</span>
        </div>
      </div>

      {/* ═══ Metrics Row ═══ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Queries Today", value: stats.totalToday, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Queries", value: stats.totalAll, icon: TrendingUp, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "Cache Rate", value: `${cacheRate}%`, icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Flagged", value: stats.flaggedCount, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Spanish", value: stats.spanishCount, icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Cached", value: stats.cachedCount, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.bg}`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
              <p className="text-[22px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{m.value}</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ Knowledge Base Stats ═══ */}
      {kbStats && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-amber-600" />
            <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">
              Knowledge Base &amp; Embedding Graph
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Documents", value: kbStats.documents, icon: Database, color: "text-amber-600" },
              { label: "Sections", value: kbStats.sections, icon: ClipboardList, color: "text-blue-600" },
              { label: "Chunks", value: kbStats.totalChunks, icon: Zap, color: "text-emerald-600" },
              { label: "Graph Nodes", value: kbStats.totalNodes, icon: Network, color: "text-purple-600" },
              { label: "Graph Edges", value: kbStats.totalEdges, icon: Network, color: "text-indigo-600" },
              { label: "Concepts", value: kbStats.concepts, icon: Brain, color: "text-pink-600" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                  <p className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Tab Switcher ═══ */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "chat"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Test AI
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "audit"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Audit Log
        </button>
      </div>

      {/* Info banner */}
      {activeTab === "chat" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="mt-0.5 text-base">&#8505;&#65039;</span>
          <p>
            Approved responses are cached — identical questions from poll workers will get the same answer instantly without an AI call. RAG-enhanced with knowledge base embeddings.
          </p>
        </div>
      )}

      {/* ═══ Content ═══ */}
      {activeTab === "chat" ? <TestChat /> : <AuditLog />}
    </div>
  );
}
