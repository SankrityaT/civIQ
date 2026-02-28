"use client";
import RecruitTable from "@/components/dashboard/RecruitTable";
import { Users, Download } from "lucide-react";
import { useRecruitCandidates } from "@/lib/hooks";
import { exportToCSV } from "@/lib/csv-export";

export default function RecruitPage() {
  const { candidates, totalScanned, totalMatched } = useRecruitCandidates();

  const bilingualCount = candidates.filter((c) => c.languages.length > 1).length;
  const experiencedCount = candidates.filter((c) => c.aiReason.includes("prior experience")).length;

  function handleExportAll() {
    const data = candidates.map((c) => ({
      ID: c.id,
      Name: c.name,
      Age: c.age,
      City: c.location,
      Precinct: c.precinct,
      Languages: c.languages.join(", "),
      "AI Score": c.aiScore,
      Reason: c.aiReason,
    }));
    exportToCSV(data, `civiq-all-candidates-${new Date().toISOString().slice(0, 10)}`);
  }

  return (
    <div className="space-y-7 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Poll Worker Recruitment</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            AI-scored candidates from your voter registration database. Filter, select, and export a shortlist.
          </p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={candidates.length === 0}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{totalScanned}</span>
          <span className="ml-1.5 text-sm text-slate-500">records scanned</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-emerald-600">{totalMatched}</span>
          <span className="ml-1.5 text-sm text-slate-500">eligible candidates</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-amber-600">{bilingualCount}</span>
          <span className="ml-1.5 text-sm text-slate-500">bilingual</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-blue-600">{experiencedCount}</span>
          <span className="ml-1.5 text-sm text-slate-500">experienced</span>
        </div>
      </div>

      <RecruitTable />
    </div>
  );
}
