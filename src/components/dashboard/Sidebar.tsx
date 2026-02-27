"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  Users,
  ClipboardList,
  Settings,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

const MENU_ITEMS = [
  { label: "Dashboard",  href: "/dashboard",           icon: LayoutDashboard },
  { label: "Documents",  href: "/dashboard/documents", icon: FileText },
  { label: "Test AI",    href: "/dashboard/test",      icon: FlaskConical },
  { label: "Recruit",    href: "/dashboard/recruit",   icon: Users },
  { label: "Audit Log",  href: "/dashboard/audit",     icon: ClipboardList },
];

const GENERAL_ITEMS = [
  { label: "Settings", href: "#", icon: Settings },
  { label: "Help",     href: "#", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex w-60 flex-shrink-0 flex-col bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-white/5 px-5 py-[22px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-slate-950">
          C
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Civiq</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </p>
        <ul className="space-y-0.5">
          {MENU_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="relative">
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-amber-500" />
                )}
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      active ? "text-amber-400" : "text-slate-500"
                    }`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          General
        </p>
        <ul className="space-y-0.5">
          {GENERAL_ITEMS.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
            EO
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">Election Official</p>
            <p className="truncate text-[10px] text-slate-500">Maricopa County</p>
          </div>
          <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-500" />
        </div>
      </div>
    </aside>
  );
}
