"use client";
import { useState } from "react";
import { SlidersHorizontal, MapPin, Star } from "lucide-react";

const SAMPLE_CANDIDATES = [
  { id: "VR002", name: "James Wilson",    age: 67, precinct: "PCT-08", languages: ["English"],            score: 90, reason: "prior experience · 22 yrs registered", city: "Tempe" },
  { id: "VR004", name: "Carlos Martinez", age: 52, precinct: "PCT-17", languages: ["English", "Spanish"], score: 85, reason: "bilingual · prior experience · 15 yrs",  city: "Mesa" },
  { id: "VR021", name: "Dorothy Harris",  age: 74, precinct: "PCT-14", languages: ["English"],            score: 85, reason: "prior experience · 28 yrs registered",    city: "Mesa" },
  { id: "VR017", name: "Michelle Taylor", age: 49, precinct: "PCT-15", languages: ["English", "Spanish"], score: 80, reason: "bilingual · prior experience · 16 yrs",  city: "Mesa" },
  { id: "VR010", name: "Michael Brown",   age: 55, precinct: "PCT-02", languages: ["English"],            score: 80, reason: "prior experience · 20 yrs registered",    city: "Scottsdale" },
  { id: "VR044", name: "Samuel Parker",   age: 47, precinct: "PCT-04", languages: ["English", "Spanish"], score: 75, reason: "bilingual · prior experience",            city: "Chandler" },
  { id: "VR001", name: "Maria Garcia",    age: 34, precinct: "PCT-12", languages: ["English", "Spanish"], score: 60, reason: "bilingual · 8 yrs registered",            city: "Phoenix" },
];

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
  const cities = ["All", ...Array.from(new Set(SAMPLE_CANDIDATES.map((c) => c.city)))];
  const filtered = cityFilter === "All" ? SAMPLE_CANDIDATES : SAMPLE_CANDIDATES.filter((c) => c.city === cityFilter);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Filter bar */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs text-slate-400">
          <span className="font-semibold text-slate-700">{filtered.length}</span> candidates
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Age</th>
              <th className="px-5 py-3">City / Precinct</th>
              <th className="px-5 py-3">Languages</th>
              <th className="px-5 py-3">AI Score</th>
              <th className="px-5 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50/60">
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
                  <p className="text-sm text-slate-700">{c.city}</p>
                  <p className="text-[11px] text-slate-400">{c.precinct}</p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {c.languages.map((l) => (
                      <span
                        key={l}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          l === "Spanish" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <ScorePill score={c.score} />
                </td>
                <td className="max-w-[180px] truncate px-5 py-3.5 text-xs text-slate-400">
                  {c.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
