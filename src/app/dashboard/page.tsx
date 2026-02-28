// Created by Kinjal
// Design: HR Recruiter BI Dashboard - Light Mode
// Font: Playfair Display (headings) + Inter (body)
// Theme: White/Cream background + Navy (#0f172a) + Amber (#d97706, #f59e0b) accents
"use client";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  Clock,
  Target,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Zap,
  FileText,
  UserPlus,
  Search,
  BarChart3,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { TrainingDocument, AuditEntry } from "@/types";

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
   FUNNEL STAGE
═══════════════════════════════════════════════════════════════════════════ */
function FunnelStage({ label, count, pct, color, isLast = false }: { label: string; count: number; pct: number; color: string; isLast?: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { setTimeout(() => setWidth(pct), 100); }, [pct]);
  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-[13px] font-semibold text-slate-900">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${width}%` }} />
      </div>
      {!isLast && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-slate-300">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor"><path d="M6 8L0 0h12L6 8z"/></svg>
        </div>
      )}
    </div>
  );
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
  const [recruitCount, setRecruitCount] = useState(0);

  useEffect(() => {
    fetch("/api/documents").then(r => r.json()).then(d => {
      const active = (d.documents as TrainingDocument[]).filter(doc => doc.status === "active").length;
      setDocCount(active);
    }).catch(() => {});
    fetch("/api/audit").then(r => r.json()).then(d => {
      setAuditStats(d.stats ?? { totalToday: 0, cachedCount: 0, totalAll: 0, spanishCount: 0, flaggedCount: 0 });
      setRecentEntries((d.entries as AuditEntry[])?.slice(0, 6) ?? []);
    }).catch(() => {});
    fetch("/api/recruit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filters: {} }) })
      .then(r => r.json()).then(d => setRecruitCount(d.totalMatched ?? 0)).catch(() => {});
  }, []);

  // Simulated recruitment funnel data
  const funnel = [
    { label: "Applications", count: 847, pct: 100, color: "bg-amber-500" },
    { label: "Screened", count: 412, pct: 49, color: "bg-amber-400" },
    { label: "Interviewed", count: 156, pct: 18, color: "bg-slate-500" },
    { label: "Offered", count: 42, pct: 5, color: "bg-slate-600" },
    { label: "Hired", count: 28, pct: 3, color: "bg-slate-900" },
  ];

  // Source effectiveness
  const sources = [
    { label: "Employee Referrals", value: 34, color: "bg-amber-500" },
    { label: "LinkedIn", value: 28, color: "bg-slate-600" },
    { label: "Job Boards", value: 22, color: "bg-slate-400" },
    { label: "Direct Apply", value: 16, color: "bg-amber-300" },
  ];

  // KPI cards
  const kpis = [
    { label: "Time to Hire", value: 23, suffix: " days", icon: Clock, trend: -12, trendLabel: "vs last month", bg: "bg-amber-50", iconColor: "text-amber-600", sparkColor: "#d97706", spark: [28, 32, 26, 24, 23, 25, 23] },
    { label: "Open Positions", value: 18, suffix: "", icon: Briefcase, trend: 3, trendLabel: "new this week", bg: "bg-slate-100", iconColor: "text-slate-600", sparkColor: "#475569", spark: [12, 14, 15, 16, 18, 17, 18] },
    { label: "Offer Accept Rate", value: 67, suffix: "%", icon: Target, trend: 8, trendLabel: "improvement", bg: "bg-emerald-50", iconColor: "text-emerald-600", sparkColor: "#059669", spark: [58, 62, 59, 64, 65, 67, 67] },
    { label: "Cost per Hire", value: 4250, prefix: "$", suffix: "", icon: TrendingUp, trend: -5, trendLabel: "reduced", bg: "bg-amber-50", iconColor: "text-amber-600", sparkColor: "#d97706", spark: [4800, 4600, 4500, 4400, 4300, 4250, 4250] },
  ];

  // Pipeline stages
  const pipeline = [
    { stage: "New", count: 124, color: "bg-slate-300" },
    { stage: "Screening", count: 86, color: "bg-amber-400" },
    { stage: "Interview", count: 42, color: "bg-amber-500" },
    { stage: "Assessment", count: 18, color: "bg-slate-600" },
    { stage: "Offer", count: 8, color: "bg-slate-900" },
  ];

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
            const TrendIcon = kpi.label === "Cost per Hire" || kpi.label === "Time to Hire" 
              ? (kpi.trend < 0 ? ArrowDownRight : ArrowUpRight)
              : (kpi.trend > 0 ? ArrowUpRight : ArrowDownRight);
            const trendColor = kpi.label === "Cost per Hire" || kpi.label === "Time to Hire"
              ? (kpi.trend < 0 ? "text-emerald-600" : "text-red-500")
              : (kpi.trend > 0 ? "text-emerald-600" : "text-red-500");
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
                    <AnimNum value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
                  </p>
                  <p className="mt-1.5 text-[12px] font-medium text-slate-500">{kpi.label}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                    <span className={`text-[11px] font-semibold ${trendColor}`}>{Math.abs(kpi.trend)}%</span>
                    <span className="text-[11px] text-slate-400">{kpi.trendLabel}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* ═══════════ MAIN GRID ═══════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* ─── POLL WORKER COVERAGE ─── */}
          <Reveal delay={100} className="lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Coverage by Area</h2>
                </div>
                <span className="text-[16px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">138 <span className="text-[11px] text-slate-400 font-sans">workers</span></span>
              </div>
              
              {/* Location list with progress bars */}
              <div className="space-y-4">
                {[
                  { name: "Downtown Phoenix", workers: 24, target: 25, status: "full" },
                  { name: "Mesa", workers: 21, target: 22, status: "full" },
                  { name: "Scottsdale", workers: 18, target: 20, status: "good" },
                  { name: "Tempe", workers: 15, target: 18, status: "good" },
                  { name: "Gilbert", workers: 14, target: 16, status: "good" },
                  { name: "Glendale", workers: 12, target: 18, status: "low" },
                  { name: "North Phoenix", workers: 10, target: 15, status: "low" },
                  { name: "Peoria", workers: 8, target: 14, status: "critical" },
                ].map((loc, i) => {
                  const pct = Math.min((loc.workers / loc.target) * 100, 100);
                  const barColor = loc.status === "full" ? "bg-emerald-500" : loc.status === "good" ? "bg-amber-500" : loc.status === "low" ? "bg-orange-500" : "bg-red-500";
                  const bgColor = loc.status === "full" ? "bg-emerald-50" : loc.status === "good" ? "bg-amber-50" : loc.status === "low" ? "bg-orange-50" : "bg-red-50";
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-600">{loc.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-slate-900">{loc.workers}</span>
                          <span className="text-[10px] text-slate-400">/ {loc.target}</span>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full ${bgColor} overflow-hidden`}>
                        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-slate-400">Full</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[9px] text-slate-400">Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[9px] text-slate-400">Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[9px] text-slate-400">Critical</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">8 areas</span>
              </div>
            </div>
          </Reveal>

          {/* ─── PIPELINE + SOURCE ─── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pipeline stages */}
            <Reveal delay={150}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-600" />
                    <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Pipeline</h2>
                  </div>
                  <span className="text-[16px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{pipeline.reduce((a, b) => a + b.count, 0)} <span className="text-[11px] text-slate-400 font-sans">total</span></span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4 bg-slate-100">
                  {pipeline.map(p => (
                    <div key={p.stage} className={`${p.color} transition-all duration-700`} style={{ width: `${(p.count / pipeline.reduce((a, b) => a + b.count, 0)) * 100}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {pipeline.map(p => (
                    <div key={p.stage} className="text-center">
                      <div className={`w-2 h-2 rounded-full ${p.color} mx-auto mb-1`} />
                      <p className="text-[14px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{p.count}</p>
                      <p className="text-[9px] text-slate-400 uppercase">{p.stage}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Source effectiveness */}
            <Reveal delay={200}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-amber-600" />
                    <h2 className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900 tracking-wide">Source of Hire</h2>
                  </div>
                </div>
                <div className="space-y-4">
                  {sources.map(s => (
                    <SourceBar key={s.label} {...s} max={40} />
                  ))}
                </div>
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
                    { label: "Candidates Found", value: recruitCount, href: "/dashboard/recruit", icon: Users },
                    { label: "Queries Today", value: auditStats.totalToday, href: "/dashboard/audit", icon: Search },
                    { label: "Total Queries", value: auditStats.totalAll, href: "/dashboard/audit", icon: BarChart3 },
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
