import AuditLog from "@/components/dashboard/AuditLog";
import { ClipboardList, Download } from "lucide-react";

export default function AuditPage() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-500" />
            <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Every AI interaction, timestamped and reviewable. Full transparency into what Sam tells poll workers.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div>
          <span className="text-sm font-semibold text-slate-900">47</span>
          <span className="ml-1.5 text-sm text-slate-400">total today</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-blue-600">6</span>
          <span className="ml-1.5 text-sm text-slate-400">in Spanish</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-emerald-600">31</span>
          <span className="ml-1.5 text-sm text-slate-400">served from cache</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-red-500">0</span>
          <span className="ml-1.5 text-sm text-slate-400">flagged</span>
        </div>
      </div>

      <AuditLog />
    </div>
  );
}
