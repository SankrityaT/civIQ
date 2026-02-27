"use client";
import { FileText, ToggleLeft, ToggleRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const SAMPLE_DOCS = [
  {
    id: "doc-001",
    name: "Poll Worker Training Manual 2026",
    wordCount: 1240,
    sections: 8,
    lastUpdated: "Feb 1, 2026",
    active: true,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
  },
  {
    id: "doc-002",
    name: "Election Day Procedures Guide",
    wordCount: 820,
    sections: 5,
    lastUpdated: "Jan 20, 2026",
    active: true,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
  },
  {
    id: "doc-003",
    name: "Voter ID Requirements by State",
    wordCount: 490,
    sections: 3,
    lastUpdated: "Jan 22, 2026",
    active: false,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
];

export default function DocumentList() {
  const [docs, setDocs] = useState(SAMPLE_DOCS);

  function toggleActive(id: string) {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_80px_100px_120px] items-center gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Document</span>
        <span className="text-right">Words</span>
        <span className="text-right">Sections</span>
        <span className="text-right">Updated</span>
        <span className="text-right">Status</span>
      </div>

      <ul className="divide-y divide-slate-50">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="grid grid-cols-[1fr_80px_80px_100px_120px] items-center gap-4 px-5 py-4 transition hover:bg-slate-50/60"
          >
            {/* Name */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${doc.iconBg} ${doc.iconColor}`}
              >
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-medium ${
                    doc.active ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {doc.name}
                </p>
                <p className="text-[11px] text-slate-400">{doc.id}</p>
              </div>
            </div>

            <span className="text-right text-sm tabular-nums text-slate-600">
              {doc.wordCount.toLocaleString()}
            </span>
            <span className="text-right text-sm tabular-nums text-slate-600">{doc.sections}</span>
            <span className="text-right text-xs text-slate-400">{doc.lastUpdated}</span>

            {/* Status + toggle */}
            <div className="flex items-center justify-end gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  doc.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                {doc.active ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => toggleActive(doc.id)}
                title={doc.active ? "Deactivate" : "Activate"}
                className="transition hover:opacity-80"
              >
                {doc.active ? (
                  <ToggleRight className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-slate-300" />
                )}
              </button>
              <button className="text-slate-300 transition hover:text-slate-500">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
