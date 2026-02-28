// Created by Kinjal
"use client";
import { useState, useEffect, Fragment } from "react";
import { Filter, AlertCircle, CheckCircle, Download, Loader2, Inbox, ChevronDown, RefreshCw } from "lucide-react";
import { useAuditLog } from "@/lib/hooks";
import { exportToCSV } from "@/lib/csv-export";
import { Language, UserType } from "@/types";

interface AuditLogProps {
  refreshKey?: number;  // increment to trigger refresh from parent
}

export default function AuditLog({ refreshKey }: AuditLogProps) {
  const [userFilter, setUserFilter] = useState<UserType | "">("");
  const [langFilter, setLangFilter] = useState<Language | "">("");
  const [statusFilter, setStatusFilter] = useState<"flagged" | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = {
    userType: userFilter || undefined,
    language: langFilter || undefined,
    flagged: statusFilter === "flagged" ? true : undefined,
  };

  const { entries, stats, loading, refresh } = useAuditLog(filters);

  // Auto-refresh when refreshKey changes (triggered by TestChat actions)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function handleExport() {
    const data = entries.map((e) => ({
      Time: new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      User: e.userType === "poll_worker" ? "Poll Worker" : "Official",
      Question: e.question,
      Response: e.response,
      Source: e.sourceDoc,
      Language: e.language.toUpperCase(),
      Cached: e.cached ? "Yes" : "No",
      Flagged: e.flagged ? "Yes" : "No",
    }));
    exportToCSV(data, `civiq-audit-log-${new Date().toISOString().slice(0, 10)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading audit log…</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </div>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value as UserType | "")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All users</option>
          <option value="poll_worker">Poll Worker</option>
          <option value="official">Official</option>
        </select>
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value as Language | "")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All languages</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "flagged" | "")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="flagged">Flagged</option>
        </select>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-700">{entries.length}</span> entries
            {stats.totalAll > 0 && (
              <span className="ml-2">
                · <span className="text-emerald-600">{stats.cachedCount} cached</span>
                {stats.flaggedCount > 0 && (
                  <span className="ml-1 text-red-500">· {stats.flaggedCount} flagged</span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          {entries.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No audit entries yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Switch to the <strong>Test AI</strong> tab, ask Sam a question, then approve or flag the response.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 w-6"></th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Question</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Lang</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((e) => {
                const time = new Date(e.timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const userLabel = e.userType === "poll_worker" ? "Poll Worker" : "Official";
                const isExpanded = expandedId === e.id;

                return (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="cursor-pointer transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3">
                        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </td>
                      <td className="px-5 py-3 text-xs tabular-nums text-slate-500">{time}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            e.userType === "official"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {userLabel}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate px-5 py-3 text-sm text-slate-700">
                        {e.question}
                      </td>
                      <td className="px-5 py-3 text-xs text-blue-600">{e.sourceDoc}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            e.language === "es" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          {e.language.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {e.flagged && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                              <AlertCircle className="h-3 w-3" /> Flagged
                            </span>
                          )}
                          {e.cached && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                              <CheckCircle className="h-3 w-3" /> Cached
                            </span>
                          )}
                          {!e.flagged && !e.cached && (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${e.id}-detail`}>
                        <td colSpan={7} className="bg-slate-50/50 px-5 py-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sam&apos;s Response</p>
                            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{e.response}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
