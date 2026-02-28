// Created by Kinjal
// Design: HR Recruiter BI Dashboard - Light Mode
// Font: Playfair Display (headings) + Inter (body)
// Theme: White/Cream background + Navy (#0f172a) + Amber (#d97706, #f59e0b) accents
"use client";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  Target,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Calendar,
  Zap,
  FileText,
  UserPlus,
  Search,
  PieChart,
  Globe,
  Star,
} from "lucide-react";
import Link from "next/link";
import { TrainingDocument, AuditEntry, VoterStats } from "@/types";

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════════════════════════════════ */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER
═══════════════════════════════════════════════════════════════════════════ */
function AnimNum({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI SPARKLINE
═══════════════════════════════════════════════════════════════════════════ */
function Sparkline({ data, color = "#14b8a6" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-60 group-hover:opacity-100 transition-opacity">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE BAR
═══════════════════════════════════════════════════════════════════════════ */
function SourceBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW((value / max) * 100), 200); }, [value, max]);
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className="text-[12px] font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [docCount, setDocCount] = useState(0);
  const [auditStats, setAuditStats] = useState({ totalToday: 0, cachedCount: 0, totalAll: 0, spanishCount: 0, flaggedCount: 0 });
  const [recentEntries, setRecentEntries] = useState<AuditEntry[]>([]);
  const [voterStats, setVoterStats] = useState<VoterStats | null>(null);

  useEffect(() => {
    fetch("/api/documents").then(r => r.json()).then(d => {
      const active = (d.documents as TrainingDocument[]).filter(doc => doc.status === "active").length;
      setDocCount(active);
    }).catch(() => {});
    fetch("/api/audit").then(r => r.json()).then(d => {
      setAuditStats(d.stats ?? { totalToday: 0, cachedCount: 0, totalAll: 0, spanishCount: 0, flaggedCount: 0 });
      setRecentEntries((d.entries as AuditEntry[])?.slice(0, 6) ?? []);
    }).catch(() => {});
    fetch("/api/recruit")
      .then(r => r.json()).then((d: VoterStats) => { if (d.loaded) setVoterStats(d); }).catch(() => {});
  }, []);

  // ─── Derived recruit data ──────────────────────────────────────────────────
  const totalRecords   = voterStats?.totalRecords ?? 0;
  const totalScored    = voterStats?.totalScored ?? 0;
  const bilingualCount = voterStats?.bilingualCount ?? 0;
  const experiencedCount = voterStats?.experiencedCount ?? 0;
  const avgScore       = voterStats?.avgScore ?? 0;
  const cityCounts     = voterStats?.cityCounts ?? {};
  const languages      = voterStats?.languages ?? [];

  // Eligibility rate as percentage
  const eligibilityRate = totalRecords > 0 ? Math.round((totalScored / totalRecords) * 100) : 0;

  // KPI cards — real recruit data
  const kpis = [
    { label: "Voter Records", value: totalRecords, suffix: "", icon: Users, trend: 0, trendLabel: "uploaded", bg: "bg-slate-100", iconColor: "text-slate-600", sparkColor: "#475569", spark: [0, 0, 0, 0, 0, 0, totalRecords] },
    { label: "Candidates Found", value: totalScored, suffix: "", icon: UserPlus, trend: eligibilityRate, trendLabel: "eligibility rate", bg: "bg-amber-50", iconColor: "text-amber-600", sparkColor: "#d97706", spark: [0, 0, 0, 0, 0, 0, totalScored] },
    { label: "Avg Score", value: avgScore, suffix: "", icon: Star, trend: 0, trendLabel: "out of 100", bg: "bg-emerald-50", iconColor: "text-emerald-600", sparkColor: "#059669", spark: [0, 0, 0, 0, 0, 0, avgScore] },
    { label: "Bilingual", value: bilingualCount, suffix: "", icon: Globe, trend: totalScored > 0 ? Math.round((bilingualCount / totalScored) * 100) : 0, trendLabel: "of candidates", bg: "bg-amber-50", iconColor: "text-amber-600", sparkColor: "#d97706", spark: [0, 0, 0, 0, 0, 0, bilingualCount] },
  ];

  // Pipeline — real recruit funnel
  const pipeline = [
    { stage: "Uploaded", count: totalRecords, color: "bg-slate-300" },
    { stage: "Eligible", count: totalScored, color: "bg-amber-400" },
    { stage: "Experienced", count: experiencedCount, color: "bg-amber-500" },
    { stage: "Bilingual", count: bilingualCount, color: "bg-slate-600" },
  ];

  // Language distribution from real data
  const langCounts: Record<string, number> = {};
  if (voterStats?.cityCounts) {
    // We don't have per-language counts from the API, so derive from languages list
    // Each candidate has languages[] — we know bilingual vs monolingual
    const monoCount = totalScored - bilingualCount;
    if (bilingualCount > 0) langCounts["Bilingual"] = bilingualCount;
    if (monoCount > 0) langCounts["Monolingual"] = monoCount;
  }
  const langTotal = Object.values(langCounts).reduce((a, b) => a + b, 0) || 1;
  const sources = Object.entries(langCounts).map(([label, count], i) => ({
    label,
    value: Math.round((count / langTotal) * 100),
    color: i === 0 ? "bg-amber-500" : "bg-slate-500",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-slate-50">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f172a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      
      <div className="relative pt-8">
        {/* ═══════════ HEADER ═══════════ */}
        <Reveal>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Live</span>
                </div>
                <span className="text-[12px] text-slate-500">Last updated 2 min ago</span>
              </div>
              <h1 className="font-[family-name:var(--font-playfair)] text-[32px] font-medium tracking-tight text-slate-900">
                Talent Acquisition Hub
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">Poll Worker Recruitment Analytics • Maricopa County</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
                <Calendar className="h-3.5 w-3.5" />
                Last 30 days
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
              <Link href="/dashboard/recruit" className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-slate-800">
                <UserPlus className="h-3.5 w-3.5" />
                Find Candidates
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ═══════════ KPI CARDS ═══════════ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Reveal key={kpi.label} delay={i * 80}>
                <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}>
                      <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                    </div>
                    <Sparkline data={kpi.spark} color={kpi.sparkColor} />
                  </div>
                  <p className="font-[family-name:var(--font-playfair)] text-[28px] font-medium tracking-tight text-slate-900 leading-none">
                    <AnimNum value={kpi.value} suffix={kpi.suffix} />
                  </p>
                  <p className="mt-1.5 text-[12px] font-medium text-slate-500">{kpi.label}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    {kpi.trend > 0 && (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-600">{kpi.trend}%</span>
                      </>
                    )}
                    <span className="text-[11px] text-slate-400">{kpi.trendLabel}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* ═══════════ MAIN GRID ═══════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* ─── CANDIDATES BY CITY ─── */}
          <Reveal delay={100} className="lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Candidates by City</h2>
                </div>
                <span className="text-[16px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{totalScored} <span className="text-[11px] text-slate-400 font-sans">total</span></span>
              </div>
              
              {/* City list from real data */}
              <div className="space-y-4">
                {(() => {
                  const sortedCities = Object.entries(cityCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8);
                  const maxCount = sortedCities.length > 0 ? sortedCities[0][1] : 1;
                  
                  if (sortedCities.length === 0) {
                    return (
                      <div className="py-8 text-center">
                        <Users className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-[12px] text-slate-400">Upload a CSV in Recruit to see city data</p>
                      </div>
                    );
                  }

                  return sortedCities.map(([city, count], i) => {
                    const pct = (count / maxCount) * 100;
                    const barColor = i < 2 ? "bg-amber-500" : i < 5 ? "bg-slate-500" : "bg-slate-300";
                    return (
                      <div key={city} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-slate-600">{city}</span>
                          <span className="text-[12px] font-semibold text-slate-900">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Top cities by candidate count</span>
                <span className="text-[11px] text-slate-500">{Object.keys(cityCounts).length} cities</span>
              </div>
            </div>
          </Reveal>

          {/* ─── PIPELINE + SOURCE ─── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Recruit funnel */}
            <Reveal delay={150}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-600" />
                    <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Recruit Funnel</h2>
                  </div>
                  <span className="text-[16px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{totalRecords > 0 ? totalRecords.toLocaleString() : "—"} <span className="text-[11px] text-slate-400 font-sans">uploaded</span></span>
                </div>
                {totalRecords > 0 ? (
                  <>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4 bg-slate-100">
                      {pipeline.map(p => (
                        <div key={p.stage} className={`${p.color} transition-all duration-700`} style={{ width: `${totalRecords > 0 ? (p.count / totalRecords) * 100 : 0}%` }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {pipeline.map(p => (
                        <div key={p.stage} className="text-center">
                          <div className={`w-2 h-2 rounded-full ${p.color} mx-auto mb-1`} />
                          <p className="text-[14px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{p.count.toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400 uppercase">{p.stage}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-slate-400">No recruit data yet</p>
                  </div>
                )}
              </div>
            </Reveal>

            {/* Language split */}
            <Reveal delay={200}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-amber-600" />
                    <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Language Split</h2>
                  </div>
                </div>
                {sources.length > 0 ? (
                  <div className="space-y-4">
                    {sources.map(s => (
                      <SourceBar key={s.label} {...s} max={100} />
                    ))}
                    {languages.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400">
                          Languages represented: <span className="font-medium text-slate-600">{languages.join(", ")}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-slate-400">No recruit data yet</p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick stats */}
            <Reveal delay={250}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Quick Stats</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Active Documents", value: docCount, href: "/dashboard/documents", icon: FileText },
                    { label: "Candidates Found", value: totalScored, href: "/dashboard/recruit", icon: Users },
                    { label: "Experienced Workers", value: experiencedCount, href: "/dashboard/recruit", icon: Star },
                    { label: "Queries Today", value: auditStats.totalToday, href: "/dashboard/audit", icon: Search },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <Link key={stat.label} href={stat.href} className="flex items-center justify-between group py-2 border-b border-slate-100 last:border-0 transition hover:border-slate-200">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition" />
                          <span className="text-[12px] text-slate-600 group-hover:text-slate-900 transition">{stat.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{stat.value}</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-amber-500 transition" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* AI Status */}
            <Reveal delay={300}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[13px] font-semibold text-emerald-600">Sam AI Online</span>
                  </div>
                  <Link href="/dashboard/test" className="text-[11px] font-medium text-amber-600 hover:text-amber-700 transition flex items-center gap-1">
                    Test <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Response", value: "1.2s" },
                    { label: "Cache", value: `${auditStats.totalAll > 0 ? Math.round((auditStats.cachedCount / auditStats.totalAll) * 100) : 66}%` },
                    { label: "Flagged", value: String(auditStats.flaggedCount), alert: auditStats.flaggedCount > 0 },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`text-[16px] font-semibold ${s.alert ? "text-red-500" : "text-slate-900"}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ═══════════ RECENT ACTIVITY ═══════════ */}
        <Reveal delay={350} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-[13px] font-semibold text-slate-900 uppercase tracking-wide">Recent Activity</h2>
              <Link href="/dashboard/audit" className="text-[11px] font-medium text-amber-600 hover:text-amber-700 transition flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {recentEntries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-[13px] text-slate-500">No recent activity</p>
                <p className="mt-1 text-[12px] text-slate-400">
                  Use <Link href="/dashboard/test" className="font-semibold text-amber-600 hover:text-amber-700">Test AI</Link> to generate queries
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-3 transition hover:bg-slate-50">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${entry.cached ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600"}`}>
                      {entry.cached ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-900 truncate">{entry.question}</p>
                      <p className="text-[11px] text-slate-400 truncate">{entry.sourceDoc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${entry.language === "es" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {entry.language}
                      </span>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{timeAgo(entry.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
