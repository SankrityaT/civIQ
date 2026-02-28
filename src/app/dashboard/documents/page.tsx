"use client";
import DocumentList from "@/components/dashboard/DocumentList";
import DocumentUpload from "@/components/dashboard/DocumentUpload";
import { FileText } from "lucide-react";
import { useDocuments } from "@/lib/hooks";

export default function DocumentsPage() {
  const { documents } = useDocuments();

  const activeCount = documents.filter((d) => d.status === "active").length;
  const totalWords = documents.reduce((sum, d) => sum + d.wordCount, 0);
  const totalSections = documents.reduce((sum, d) => sum + d.sections, 0);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Training Documents</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Everything Sam knows comes from these documents — nothing else.
          </p>
        </div>
        <DocumentUpload />
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{documents.length}</span>
          <span className="text-sm text-slate-500">documents</span>
          {activeCount < documents.length && (
            <span className="text-xs text-slate-400">({activeCount} active)</span>
          )}
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="text-sm text-slate-500">
          <span className="font-[family-name:var(--font-playfair)] text-[16px] font-medium text-slate-900">{totalWords.toLocaleString()}</span> words indexed
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="text-sm text-slate-500">
          <span className="font-[family-name:var(--font-playfair)] text-[16px] font-medium text-slate-900">{totalSections}</span> sections
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500">AI knowledge up to date</span>
        </div>
      </div>

      <DocumentList />
    </div>
  );
}
