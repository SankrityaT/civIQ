"use client";
import { useState, useMemo } from "react";
import { SlidersHorizontal, MapPin, Star, Globe, Download, Loader2 } from "lucide-react";
import { useRecruitCandidates } from "@/lib/hooks";
import { exportToCSV } from "@/lib/csv-export";
import { Candidate } from "@/types";

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 85 ? "bg-emerald-100 text-emerald-700" :
    score >= 70 ? "bg-amber-100 text-amber-700"    :
                  "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Star className="h-3 w-3" />
      {score}
    </span>
  );
}

export default function RecruitTable() {
  const [cityFilter, setCityFilter] = useState("All");
  const [langFilter, setLangFilter] = useState("All");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(100);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Build API filters
  const apiFilters = useMemo(() => ({
    ageRange: [minAge, maxAge] as [number, number],
    location: cityFilter === "All" ? undefined : cityFilter,
    languages: langFilter === "All" ? undefined
      : langFilter === "Bilingual" ? ["Spanish"]
      : [langFilter],
  }), [cityFilter, langFilter, minAge, maxAge]);

  const { candidates, totalScanned, totalMatched, loading } = useRecruitCandidates(apiFilters);

  // Derive cities from candidates for filter dropdown
  const cities = useMemo(() => {
    const set = new Set(candidates.map((c) => c.location));
    return ["All", ...Array.from(set).sort()];
  }, [candidates]);

  // Bilingual count
  const bilingualCount = candidates.filter((c) => c.languages.length > 1).length;

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

  function handleExport() {
    const data = candidates
      .filter((c) => selected.size === 0 || selected.has(c.id))
      .map((c: Candidate) => ({
        ID: c.id,
        Name: c.name,
        Age: c.age,
        City: c.location,
        Precinct: c.precinct,
        Languages: c.languages.join(", "),
        "AI Score": c.aiScore,
        Reason: c.aiReason,
      }));
    exportToCSV(data, `civiq-recruit-shortlist-${new Date().toISOString().slice(0, 10)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Scanning voter records…</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </div>

        {/* City */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Language */}
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            <option>All</option>
            <option>English</option>
            <option>Spanish</option>
            <option>Bilingual</option>
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
            onChange={(e) => setMinAge(Number(e.target.value))}
            className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline-none"
          />
          <span>–</span>
          <input
            type="number"
            min={18}
            max={100}
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline-none"
          />
        </div>

        {/* Stats + export */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-700">{totalMatched}</span>
            <span className="mx-0.5">/</span>
            <span>{totalScanned}</span> matched
            {bilingualCount > 0 && (
              <span className="ml-2 text-blue-600">· {bilingualCount} bilingual</span>
            )}
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleExport}
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
              <th className="px-5 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selected.size === candidates.length && candidates.length > 0}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                />
              </th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Age</th>
              <th className="px-5 py-3">City / Precinct</th>
              <th className="px-5 py-3">Languages</th>
              <th className="px-5 py-3">AI Score</th>
              <th className="px-5 py-3">Reason</th>
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
                <td className="px-5 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm tabular-nums text-slate-600">{c.age}</td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-slate-700">{c.location}</p>
                  <p className="text-[11px] text-slate-400">{c.precinct}</p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {c.languages.map((l) => (
                      <span
                        key={l}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          l === "Spanish" ? "bg-blue-50 text-blue-600"
                          : l === "Arabic" ? "bg-purple-50 text-purple-600"
                          : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <ScorePill score={c.aiScore} />
                </td>
                <td className="max-w-[180px] truncate px-5 py-3.5 text-xs text-slate-400">
                  {c.aiReason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {candidates.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          No candidates match the current filters. Try adjusting your criteria.
        </div>
      )}
    </div>
  );
}
