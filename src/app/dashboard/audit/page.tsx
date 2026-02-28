"use client";
import AuditLog from "@/components/dashboard/AuditLog";
import { ClipboardList, Download } from "lucide-react";
import { useAuditLog } from "@/lib/hooks";
import { exportToCSV } from "@/lib/csv-export";

export default function AuditPage() {
  const { entries, stats } = useAuditLog();

  function handleExportAll() {
    const data = entries.map((e) => ({
      Time: new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      User: e.userType === "poll_worker" ? "Poll Worker" : "Official",
      Question: e.question,
      Source: e.sourceDoc,
      Language: e.language.toUpperCase(),
      Cached: e.cached ? "Yes" : "No",
      Flagged: e.flagged ? "Yes" : "No",
    }));
    exportToCSV(data, `civiq-audit-log-${new Date().toISOString().slice(0, 10)}`);
  }

  return (
    <div className="space-y-7 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Audit Log</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Every AI interaction, timestamped and reviewable. Full transparency into what Sam tells poll workers.
          </p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={entries.length === 0}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{stats.totalToday}</span>
          <span className="ml-1.5 text-sm text-slate-500">total today</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-blue-600">{stats.spanishCount}</span>
          <span className="ml-1.5 text-sm text-slate-500">in Spanish</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-emerald-600">{stats.cachedCount}</span>
          <span className="ml-1.5 text-sm text-slate-500">cached</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-red-500">{stats.flaggedCount}</span>
          <span className="ml-1.5 text-sm text-slate-500">flagged</span>
        </div>
      </div>

      <AuditLog />
    </div>
  );
}
