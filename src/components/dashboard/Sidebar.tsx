"use client";
// TODO (Kinjal): Add active link highlighting, collapse on mobile
import Link from "next/link";
import { DASHBOARD_NAV, APP_NAME } from "@/lib/constants";

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r bg-slate-900 text-white">
      <div className="px-6 py-5 text-lg font-bold tracking-wide text-amber-400">
        {APP_NAME}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {DASHBOARD_NAV.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 text-xs text-slate-500">
        Election Officials Only
      </div>
    </aside>
  );
}
