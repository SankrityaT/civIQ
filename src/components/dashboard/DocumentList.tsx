"use client";
import { FileText, ToggleLeft, ToggleRight, Trash2, Loader2 } from "lucide-react";
import { useDocuments } from "@/lib/hooks";

const ICON_STYLES: Record<number, { bg: string; color: string }> = {
  0: { bg: "bg-amber-100", color: "text-amber-700" },
  1: { bg: "bg-blue-100", color: "text-blue-700" },
  2: { bg: "bg-emerald-100", color: "text-emerald-700" },
};

export default function DocumentList() {
  const { documents, loading, toggleStatus, deleteDocument } = useDocuments();

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading documents…</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 shadow-sm">
        <FileText className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">No documents uploaded yet</p>
        <p className="mt-1 text-xs text-slate-400">Upload a training document to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_80px_80px_100px_140px] items-center gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Document</span>
        <span className="text-right">Words</span>
        <span className="text-right">Sections</span>
        <span className="text-right">Updated</span>
        <span className="text-right">Status</span>
      </div>

      <ul className="divide-y divide-slate-50">
        {documents.map((doc, idx) => {
          const isActive = doc.status === "active";
          const style = ICON_STYLES[idx % 3] ?? ICON_STYLES[0];
          const updatedDate = new Date(doc.lastUpdated).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <li
              key={doc.id}
              className="grid grid-cols-[1fr_80px_80px_100px_140px] items-center gap-4 px-5 py-4 transition hover:bg-slate-50/60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                    isActive ? style.bg : "bg-slate-100"
                  } ${isActive ? style.color : "text-slate-400"}`}
                >
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      isActive ? "text-slate-800" : "text-slate-400"
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
              <span className="text-right text-xs text-slate-400">{updatedDate}</span>

              <div className="flex items-center justify-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => toggleStatus(doc.id)}
                  title={isActive ? "Deactivate" : "Activate"}
                  className="transition hover:opacity-80"
                >
                  {isActive ? (
                    <ToggleRight className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-slate-300" />
                  )}
                </button>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  title="Delete document"
                  className="text-slate-300 transition hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
