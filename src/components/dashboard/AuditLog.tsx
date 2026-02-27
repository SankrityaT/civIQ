"use client";
import { Filter } from "lucide-react";

const SAMPLE_ENTRIES = [
  { id: "a1", time: "2:47 PM", user: "Poll Worker", question: "What time must polls close?",                             source: "Section 6", lang: "EN", cached: true,  flagged: false },
  { id: "a2", time: "2:34 PM", user: "Poll Worker", question: "¿Cuáles son las formas de identificación aceptables?",   source: "Section 3", lang: "ES", cached: false, flagged: false },
  { id: "a3", time: "2:21 PM", user: "Official",    question: "How do I handle a power outage?",                        source: "Section 7", lang: "EN", cached: true,  flagged: false },
  { id: "a4", time: "2:10 PM", user: "Poll Worker", question: "What do I do if a voter's name isn't in the poll book?", source: "Section 2", lang: "EN", cached: true,  flagged: false },
  { id: "a5", time: "1:58 PM", user: "Poll Worker", question: "Can voters wear campaign buttons inside the polls?",     source: "Section 8", lang: "EN", cached: false, flagged: false },
];

export default function AuditLog() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Filter bar */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </div>
        <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none">
          <option>All users</option>
          <option>Poll Worker</option>
          <option>Official</option>
        </select>
        <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none">
          <option>All languages</option>
          <option>EN</option>
          <option>ES</option>
        </select>
        <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none">
          <option>All statuses</option>
          <option>Flagged</option>
          <option>Cached</option>
        </select>
        <div className="ml-auto text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{SAMPLE_ENTRIES.length}</span> entries
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Question</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Lang</th>
              <th className="px-5 py-3">Cached</th>
              <th className="px-5 py-3">Flagged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {SAMPLE_ENTRIES.map((e) => (
              <tr key={e.id} className="transition hover:bg-slate-50/60">
                <td className="px-5 py-3.5 text-xs tabular-nums text-slate-400">{e.time}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      e.user === "Official"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {e.user}
                  </span>
                </td>
                <td className="max-w-[280px] px-5 py-3.5">
                  <p className="truncate text-sm text-slate-700">{e.question}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-blue-600">{e.source}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      e.lang === "ES" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {e.lang}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs">
                  {e.cached ? (
                    <span className="text-emerald-600">✓ Yes</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-xs">
                  {e.flagged ? (
                    <span className="text-red-500">⚠ Yes</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
