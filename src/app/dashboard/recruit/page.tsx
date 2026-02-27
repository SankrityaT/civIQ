import RecruitTable from "@/components/dashboard/RecruitTable";
import { Users, Download } from "lucide-react";

export default function RecruitPage() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">Poll Worker Recruitment</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            AI-scored candidates from your voter registration database. Filter, select, and export a shortlist.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div>
          <span className="text-sm font-semibold text-slate-900">50</span>
          <span className="ml-1.5 text-sm text-slate-400">records scanned</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-emerald-600">18</span>
          <span className="ml-1.5 text-sm text-slate-400">eligible candidates</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-amber-600">7</span>
          <span className="ml-1.5 text-sm text-slate-400">bilingual candidates</span>
        </div>
        <div className="h-4 w-px bg-slate-100" />
        <div>
          <span className="text-sm font-semibold text-blue-600">5</span>
          <span className="ml-1.5 text-sm text-slate-400">with prior experience</span>
        </div>
      </div>

      <RecruitTable />
    </div>
  );
}
