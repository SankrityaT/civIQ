"use client";
import { useState, useEffect } from "react";
import TestChat from "@/components/dashboard/TestChat";
import AuditLog from "@/components/dashboard/AuditLog";
import KnowledgeGraph from "@/components/dashboard/KnowledgeGraph";
import {
  Flask,
  ChartLineUp,
  Brain,
  Database,
  Lightning,
  ShieldCheck,
  Warning,
  Globe,
  TrendUp,
  Graph,
  ClipboardText,
  Info,
} from "@phosphor-icons/react";
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
  const [activeTab, setActiveTab] = useState<"chat" | "audit" | "graph">("chat");

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
            <Flask size={22} weight="duotone" className="text-amber-500" />
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
          { label: "Queries Today", value: stats.totalToday, icon: ChartLineUp, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Queries", value: stats.totalAll, icon: TrendUp, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "Cache Rate", value: `${cacheRate}%`, icon: Lightning, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Flagged", value: stats.flaggedCount, icon: Warning, color: "text-red-500", bg: "bg-red-50" },
          { label: "Spanish", value: stats.spanishCount, icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Cached", value: stats.cachedCount, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.bg}`}>
                  <Icon size={18} weight="duotone" className={m.color} />
                </div>
              </div>
              <p className="text-[22px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{m.value}</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ Knowledge Graph Visualization + Stats ═══ */}
      {kbStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Graph visualization — takes 2/3 */}
          <div className="lg:col-span-2 h-[340px]">
            <KnowledgeGraph
              className="h-full"
              stats={{
                documents: kbStats.documents,
                sections: kbStats.sections,
                chunks: kbStats.totalChunks,
                nodes: kbStats.totalNodes,
                edges: kbStats.totalEdges,
                concepts: kbStats.concepts,
              }}
              animate={true}
            />
          </div>

          {/* Stats panel — takes 1/3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Brain size={18} weight="duotone" className="text-amber-600" />
                <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">
                  Knowledge Base
                </h2>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Documents", value: kbStats.documents, icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Sections", value: kbStats.sections, icon: ClipboardText, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Chunks", value: kbStats.totalChunks, icon: Lightning, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Graph Nodes", value: kbStats.totalNodes, icon: Graph, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Graph Edges", value: kbStats.totalEdges, icon: Graph, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Concepts", value: kbStats.concepts, icon: Brain, color: "text-pink-600", bg: "bg-pink-50" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}>
                          <Icon size={14} weight="duotone" className={s.color} />
                        </div>
                        <span className="text-sm text-slate-600">{s.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{s.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                <strong>RAG-powered.</strong> Every query searches the knowledge graph for relevant context before generating a response.
              </p>
            </div>
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
          <Flask size={15} weight="duotone" />
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
          <ClipboardText size={15} weight="duotone" />
          Audit Log
        </button>
      </div>

      {/* Info banner */}
      {activeTab === "chat" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info size={18} weight="fill" className="mt-0.5 flex-shrink-0" />
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
