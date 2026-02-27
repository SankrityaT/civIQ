import StatsCard from "@/components/dashboard/StatsCard";
import { FileText, Users, MessageSquare, CheckCircle, Plus, Download } from "lucide-react";
import Link from "next/link";

const RECENT_INTERACTIONS = [
  { question: "What do I do if a voter's name isn't in the poll book?", time: "2m ago",  source: "Section 2", lang: "EN" },
  { question: "¿Cuáles son las formas de identificación aceptables?",   time: "11m ago", source: "Section 3", lang: "ES" },
  { question: "What time must polls close?",                             time: "34m ago", source: "Section 6", lang: "EN" },
  { question: "How do I handle a power outage?",                        time: "1h ago",  source: "Section 7", lang: "EN" },
  { question: "Can voters wear campaign buttons inside the polls?",      time: "2h ago",  source: "Section 8", lang: "EN" },
];

const QUICK_ACTIONS = [
  { label: "Upload Document",  href: "/dashboard/documents", icon: FileText,      color: "bg-amber-50 text-amber-700 border-amber-100" },
  { label: "Test AI Response", href: "/dashboard/test",      icon: MessageSquare, color: "bg-blue-50 text-blue-700 border-blue-100" },
  { label: "Find Candidates",  href: "/dashboard/recruit",   icon: Users,         color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { label: "View Audit Log",   href: "/dashboard/audit",     icon: CheckCircle,   color: "bg-violet-50 text-violet-700 border-violet-100" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Plan, recruit, and support your election workforce.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/audit"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Link>
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Document
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Active Documents"
          value="3"
          icon={FileText}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: "+1", direction: "up", label: "this week" }}
          href="/dashboard/documents"
          accent
        />
        <StatsCard
          label="Workers Recruited"
          value="12"
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={{ value: "+3", direction: "up", label: "from last run" }}
          href="/dashboard/recruit"
        />
        <StatsCard
          label="Questions Today"
          value="47"
          icon={MessageSquare}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={{ value: "+18%", direction: "up", label: "vs. yesterday" }}
          href="/dashboard/audit"
        />
        <StatsCard
          label="Response Accuracy"
          value="98%"
          icon={CheckCircle}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          trend={{ value: "Stable", direction: "neutral", label: "last 7 days" }}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent interactions */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Interactions</h2>
                <p className="text-xs text-slate-400">Latest poll worker questions to Sam</p>
              </div>
              <Link href="/dashboard/audit" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-slate-50">
              {RECENT_INTERACTIONS.map(({ question, time, source, lang }) => (
                <li key={question} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-slate-700">{question}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{source} · Training Manual 2026</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        lang === "ES" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {lang}
                    </span>
                    <span className="text-xs text-slate-400">{time}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick actions + Sam status */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-400">Jump to common tasks</p>
          </div>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition hover:opacity-90 ${color}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Sam status */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-xs font-semibold text-emerald-800">Sam is online</p>
              <p className="text-[10px] text-emerald-600">Ready to answer poll worker questions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
