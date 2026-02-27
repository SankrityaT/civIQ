// Created by Kinjal
// Design: Liquid Glass Sidebar - Light Mode
// Font: Playfair Display (logo) + Inter (nav)
// Theme: Frosted glass with amber/slate accents
"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/60 text-slate-700 shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar - Deep Silver Glassmorphism */}
      <aside
        className={`hidden flex-shrink-0 flex-col transition-[width] duration-300 ease-out lg:flex ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
        style={{
          background: "linear-gradient(180deg, rgba(241, 245, 249, 0.85) 0%, rgba(226, 232, 240, 0.75) 50%, rgba(203, 213, 225, 0.7) 100%)",
          backdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          borderRight: "1px solid rgba(148, 163, 184, 0.3)",
          boxShadow: "8px 0 32px -4px rgba(100, 116, 139, 0.15), inset -1px 0 0 rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {/* Logo */}
        <div className={`flex items-center py-6 ${collapsed ? "justify-center px-3" : "justify-between px-5"}`} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/logo.jpeg"
                alt="Civiq Logo"
                fill
                className="object-cover"
              />
            </div>
            {!collapsed && (
              <span className="font-[family-name:var(--font-playfair)] text-[18px] font-medium tracking-tight text-slate-900">
                CivIQ
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all hover:text-slate-700 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)",
                backdropFilter: "blur(12px) saturate(180%)",
                WebkitBackdropFilter: "blur(12px) saturate(180%)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                boxShadow: "0 2px 8px -2px rgba(100, 116, 139, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-6 ${collapsed ? "px-2" : "px-3"}`}>
          {/* Ask Sam shortcut */}
          {!collapsed && (
            <Link
              href="/chat"
              className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2.5 transition-all hover:bg-amber-100/80"
            >
              <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-amber-400/50">
                <Image src="/logo.jpeg" alt="Sam" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-700">Ask Sam</p>
                <p className="text-[10px] text-amber-600/70">Poll worker chat</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link
              href="/chat"
              className="mb-4 flex justify-center"
              title="Ask Sam"
            >
              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-amber-400/50 transition-all hover:ring-amber-500">
                <Image src="/logo.jpeg" alt="Sam" fill className="object-cover" unoptimized />
              </div>
            </Link>
          )}

          {!collapsed && (
            <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Menu
            </p>
          )}
          <ul className="space-y-1">
            {MENU_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href} className="relative group">
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-500" />
                  )}
                  <Link
                    href={href}
                    className={`flex items-center rounded-xl transition-all duration-200 ${
                      collapsed
                        ? "justify-center p-3"
                        : "gap-3 px-3 py-2.5"
                    } ${
                      active
                        ? "bg-amber-50 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    title={collapsed ? label : undefined}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${
                        active ? "text-amber-600" : "text-slate-400"
                      }`}
                    />
                    {!collapsed && <span className="text-[13px] font-[family-name:var(--font-playfair)] font-medium tracking-wide">{label}</span>}
                  </Link>
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {!collapsed && (
            <p className="mb-3 mt-8 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              General
            </p>
          )}
          {collapsed && <div className="my-5 mx-2 h-px bg-slate-200/60" />}
          <ul className="space-y-1">
            {GENERAL_ITEMS.map(({ label, href, icon: Icon }) => (
              <li key={label} className="relative group">
                <Link
                  href={href}
                  className={`flex items-center rounded-xl text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 ${
                    collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  {!collapsed && <span className="text-[13px] font-[family-name:var(--font-playfair)] font-medium tracking-wide">{label}</span>}
                </Link>
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {label}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="px-2 py-3 flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:text-slate-700 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)",
                backdropFilter: "blur(12px) saturate(180%)",
                WebkitBackdropFilter: "blur(12px) saturate(180%)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                boxShadow: "0 2px 8px -2px rgba(100, 116, 139, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* User footer */}
        <div className={`py-4 ${collapsed ? "px-2" : "px-4"}`} style={{ borderTop: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200/50">
              EO
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-slate-900">Election Official</p>
                  <p className="truncate text-[10px] text-slate-400">Maricopa County</p>
                </div>
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-500" />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar - Deep Silver Glassmorphism */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, rgba(241, 245, 249, 0.92) 0%, rgba(226, 232, 240, 0.88) 50%, rgba(203, 213, 225, 0.85) 100%)",
          backdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          borderRight: "1px solid rgba(148, 163, 184, 0.3)",
          boxShadow: "8px 0 40px -4px rgba(100, 116, 139, 0.2), inset -1px 0 0 rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-6" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/logo.jpeg"
                alt="Civiq Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-[family-name:var(--font-playfair)] text-[18px] font-medium tracking-tight text-slate-900">
              CivIQ
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Menu
          </p>
          <ul className="space-y-1">
            {MENU_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href} className="relative">
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-500" />
                  )}
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-amber-50 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${
                        active ? "text-amber-600" : "text-slate-400"
                      }`}
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            General
          </p>
          <ul className="space-y-1">
            {GENERAL_ITEMS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200/50">
              EO
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-slate-900">Election Official</p>
              <p className="truncate text-[10px] text-slate-400">Maricopa County</p>
            </div>
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-500" />
          </div>
        </div>
      </aside>
    </>
  );
}
