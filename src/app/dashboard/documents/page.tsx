import DocumentList from "@/components/dashboard/DocumentList";
import DocumentUpload from "@/components/dashboard/DocumentUpload";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Documents</h1>
          <p className="mt-1 text-sm text-slate-400">
            Everything Sam knows comes from these documents — nothing else.
          </p>
        </div>
        <DocumentUpload />
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-900">3</span>
          <span className="text-sm text-slate-400">documents</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div className="text-sm text-slate-400">
          <span className="font-semibold text-slate-700">2,550</span> total words indexed
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div className="text-sm text-slate-400">
          <span className="font-semibold text-slate-700">16</span> sections
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">AI knowledge up to date</span>
        </div>
      </div>

      <DocumentList />
    </div>
  );
}
