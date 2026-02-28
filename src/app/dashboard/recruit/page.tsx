// Created by Kinjal
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import RecruitTable from "@/components/dashboard/RecruitTable";
import { Users, Download, Upload, FileSpreadsheet, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { useVoterUpload, useVoterStats, useRecruitCandidates } from "@/lib/hooks";
import { exportToCSV } from "@/lib/csv-export";
import { RecruitFilters, Candidate } from "@/types";

export default function RecruitPage() {
  const { upload, uploading, error: uploadError } = useVoterUpload();
  const { stats, loading: statsLoading, refresh: refreshStats } = useVoterStats();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);

  // Filters state — passed down to RecruitTable and used by the hook
  const [filters, setFilters] = useState<RecruitFilters>({ page: 1, pageSize: 50 });
  const { candidates, totalScored, totalFiltered, page, totalPages, scoring, noData, loading, refresh } = useRecruitCandidates(filters);

  // Poll for scoring completion
  useEffect(() => {
    if (!scoring) return;
    const interval = setInterval(() => {
      refresh();
      refreshStats();
    }, 3000);
    return () => clearInterval(interval);
  }, [scoring, refresh, refreshStats]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) {
      setShowUpload(false);
      // Start polling — scoring is in background
      setTimeout(() => {
        refresh();
        refreshStats();
      }, 1000);
    }
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  }, [upload, refresh, refreshStats]);

  function handleExportAll() {
    const data = candidates.map((c: Candidate) => ({
      ID: c.id,
      "First Name": c.firstName,
      "Last Name": c.lastName,
      Age: c.age,
      City: c.city,
      Precinct: c.precinct,
      Languages: c.languages.join(", "),
      Email: c.email,
      Phone: c.phone,
      "Previous Poll Worker": c.previousPollWorker ? "Yes" : "No",
      "Score": c.aiScore,
      "Reason": c.aiReason,
    }));
    exportToCSV(data, `civiq-candidates-${new Date().toISOString().slice(0, 10)}`);
  }

  const hasData = stats?.loaded && !noData && totalScored > 0;

  // ─── Upload screen (no data OR user clicked Re-upload) ─────────────────────
  if (showUpload || (!statsLoading && !hasData && !scoring && !uploading)) {
    return (
      <div className="space-y-7 pt-8">
        <div className="flex items-start justify-between w-full">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Poll Worker Recruitment</h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              {hasData ? "Start fresh — upload a new CSV to replace the current dataset." : "Upload your voter registration data to find and score the best poll worker candidates."}
            </p>
          </div>
          {hasData && (
            <button
              onClick={() => setShowUpload(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Results
            </button>
          )}
        </div>

        {/* Upload CTA */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 shadow-sm transition hover:border-amber-400 hover:bg-amber-50/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 mb-5">
            <FileSpreadsheet className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-[family-name:var(--font-playfair)] font-semibold text-slate-900 mb-2">
            Upload Voter Registration CSV
          </h2>
          <p className="max-w-md text-center text-sm text-slate-500 mb-6">
            Upload a CSV with voter records to identify and rank the best poll worker candidates based on experience, language skills, civic engagement, and availability.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Choose CSV File
          </button>
          {uploadError && (
            <p className="mt-4 text-sm text-red-500">{uploadError}</p>
          )}

          {/* Required format hint */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 max-w-lg">
            <p className="font-semibold text-slate-700 mb-1">Required CSV columns:</p>
            <p className="font-mono">id, first_name, last_name, age, city, precinct, languages, registered_since, previous_poll_worker, availability</p>
            <p className="mt-2">Optional: address, zip, party, email, phone</p>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: FileSpreadsheet, title: "Upload CSV", desc: "Import your voter registration database (up to 50K+ records)" },
            { icon: Users, title: "Smart Scoring", desc: "Candidates are scored on experience, language skills, civic engagement, and availability" },
            { icon: Download, title: "Export Shortlist", desc: "Filter, select, and export your top candidates as CSV" },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <step.icon className="h-4.5 w-4.5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Scoring in progress ──────────────────────────────────────────────────
  if (scoring && totalScored === 0) {
    return (
      <div className="space-y-7 pt-8">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Poll Worker Recruitment</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-20 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
          <h2 className="text-lg font-[family-name:var(--font-playfair)] font-semibold text-slate-900 mb-2">
            Processing Candidates...
          </h2>
          <p className="max-w-md text-center text-sm text-slate-500">
            Analyzing {stats?.totalRecords?.toLocaleString() ?? "your"} voter records. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main view with data ──────────────────────────────────────────────────
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
            Scored candidates from your voter registration database. Filter, select, and export a shortlist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => setShowUpload(true)}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-upload CSV
          </button>
          <button
            onClick={handleExportAll}
            disabled={candidates.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export All
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{uploadError}</div>
      )}

      {scoring && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scoring in progress — results updating live...
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{(stats?.totalRecords ?? totalScored).toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-slate-500">records scanned</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-emerald-600">{totalFiltered.toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-slate-500">matching</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-amber-600">{(stats?.bilingualCount ?? 0).toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-slate-500">bilingual</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-blue-600">{(stats?.experiencedCount ?? 0).toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-slate-500">experienced</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-700">{stats?.avgScore ?? 0}</span>
          <span className="ml-1.5 text-sm text-slate-500">avg score</span>
        </div>
      </div>

      <RecruitTable
        candidates={candidates}
        totalFiltered={totalFiltered}
        totalScored={totalScored}
        page={page}
        totalPages={totalPages}
        loading={loading}
        scoring={scoring}
        filters={filters}
        onFiltersChange={setFilters}
        stats={stats}
      />
    </div>
  );
}
