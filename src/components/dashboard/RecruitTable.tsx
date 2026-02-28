// Created by Kinjal
"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, MapPin, Star, Globe, Download, Loader2, ChevronLeft, ChevronRight, Shield, Mail, Phone } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { Candidate, RecruitFilters, VoterStats } from "@/types";

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 85 ? "bg-emerald-100 text-emerald-700" :
    score >= 70 ? "bg-amber-100 text-amber-700"    :
    score >= 55 ? "bg-slate-100 text-slate-600"     :
                  "bg-slate-50 text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Star className="h-3 w-3" />
      {score}
    </span>
  );
}

interface RecruitTableProps {
  candidates: Candidate[];
  totalFiltered: number;
  totalScored: number;
  page: number;
  totalPages: number;
  loading: boolean;
  scoring: boolean;
  filters: RecruitFilters;
  onFiltersChange: (f: RecruitFilters) => void;
  stats: VoterStats | null;
}

export default function RecruitTable({
  candidates,
  totalFiltered,
  totalScored,
  page,
  totalPages,
  loading,
  scoring,
  filters,
  onFiltersChange,
  stats,
}: RecruitTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Local filter state that syncs to parent
  const cityFilter = filters.city ?? "All";
  const precinctFilter = filters.precinct ?? "All";
  const minAge = filters.minAge ?? 18;
  const maxAge = filters.maxAge ?? 100;
  const minScore = filters.minScore ?? 0;
  const experiencedOnly = filters.experiencedOnly ?? false;
  const bilingualOnly = filters.bilingualOnly ?? false;

  function updateFilter(patch: Partial<RecruitFilters>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  function setPage(p: number) {
    onFiltersChange({ ...filters, page: p });
  }

  // Derive dropdown options from stats
  const cities = useMemo(() => ["All", ...(stats?.cities ?? [])], [stats]);
  const precincts = useMemo(() => ["All", ...(stats?.precincts ?? [])], [stats]);
  const languages = useMemo(() => stats?.languages ?? [], [stats]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  }

  function handleExportSelected() {
    const data = candidates
      .filter((c) => selected.has(c.id))
      .map((c: Candidate) => ({
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
    exportToCSV(data, `civiq-shortlist-${new Date().toISOString().slice(0, 10)}`);
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading candidates…</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </div>

        {/* City */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={cityFilter}
            onChange={(e) => updateFilter({ city: e.target.value === "All" ? undefined : e.target.value })}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Precinct */}
        <select
          value={precinctFilter}
          onChange={(e) => updateFilter({ precinct: e.target.value === "All" ? undefined : e.target.value })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
        >
          {precincts.map((p) => <option key={p}>{p}</option>)}
        </select>

        {/* Language */}
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === "All") updateFilter({ languages: undefined, bilingualOnly: false });
              else if (val === "Bilingual") updateFilter({ languages: undefined, bilingualOnly: true });
              else updateFilter({ languages: [val], bilingualOnly: false });
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            <option>All</option>
            <option>Bilingual</option>
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Age range */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          Age
          <input
            type="number"
            min={18}
            max={100}
            value={minAge}
            onChange={(e) => updateFilter({ minAge: Number(e.target.value) || 18 })}
            className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline-none"
          />
          <span>–</span>
          <input
            type="number"
            min={18}
            max={100}
            value={maxAge}
            onChange={(e) => updateFilter({ maxAge: Number(e.target.value) || 100 })}
            className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline-none"
          />
        </div>

        {/* Min Score */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          Score ≥
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => updateFilter({ minScore: Number(e.target.value) || 0 })}
            className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline-none"
          />
        </div>

        {/* Experience toggle */}
        <button
          onClick={() => updateFilter({ experiencedOnly: !experiencedOnly })}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
            experiencedOnly
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Shield className="mr-1 inline h-3 w-3" />
          Experienced
        </button>

        {/* Export selected */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-slate-700">{totalFiltered.toLocaleString()}</span> / {totalScored.toLocaleString()}
          </span>
          {selected.size > 0 && (
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <Download className="h-3 w-3" />
              Export {selected.size}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={selected.size === candidates.length && candidates.length > 0}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                />
              </th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Languages</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {candidates.map((c) => (
              <tr
                key={c.id}
                className={`transition ${
                  selected.has(c.id) ? "bg-emerald-50/50" : "hover:bg-slate-50/60"
                }`}
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-slate-600">{c.age}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-slate-700">{c.city}</p>
                  <p className="text-[11px] text-slate-400">{c.precinct}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.languages.map((l) => (
                      <span
                        key={l}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          l === "Spanish" ? "bg-blue-50 text-blue-600"
                          : l === "Arabic" ? "bg-purple-50 text-purple-600"
                          : l === "Chinese" ? "bg-rose-50 text-rose-600"
                          : l === "Vietnamese" ? "bg-teal-50 text-teal-600"
                          : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.previousPollWorker ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      <Shield className="h-2.5 w-2.5" />
                      Veteran
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">New</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {c.email && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[140px]">
                        <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ScorePill score={c.aiScore} />
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-400">
                  {c.aiReason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {candidates.length === 0 && !loading && (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          No candidates match the current filters. Try adjusting your criteria.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages} · {totalFiltered.toLocaleString()} results
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            {/* Page number buttons — show up to 5 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition ${
                    p === page
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
