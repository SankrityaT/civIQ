"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Desktop pill nav ─────────────────────────────────── */}
      <nav className="glass-nav hidden md:flex">
        <Link href="/" className="glass-nav-logo flex items-center gap-1.5">
          <div className="relative h-8 w-8">
            <Image
              src="/logo.png"
              alt="CivIQ"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[15px] font-medium tracking-tight text-usa-blue font-[family-name:var(--font-playfair)]">
            CivIQ
          </span>
        </Link>
        <a href="#meet-sam" className="glass-nav-item">Meet Sam</a>
        <a href="#command-center" className="glass-nav-item">Features</a>
        <Link href="/chat" className="glass-nav-item">Ask Sam</Link>
        <Link href="/dashboard" className="glass-nav-item glass-nav-item-active">Dashboard</Link>
      </nav>

      {/* ── Mobile top bar ───────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-7 w-7">
            <Image
              src="/logo.png"
              alt="CivIQ"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[15px] font-medium tracking-tight text-usa-blue font-[family-name:var(--font-playfair)]">CivIQ</span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="flex flex-col justify-center items-center gap-[5px] w-9 h-9"
        >
          <span className={`block h-0.5 w-5 bg-usa-blue rounded-full transition-all duration-300 ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`block h-0.5 w-5 bg-usa-blue rounded-full transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-usa-blue rounded-full transition-all duration-300 ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      <div
        className={`fixed top-[52px] left-0 right-0 z-40 md:hidden bg-white/98 backdrop-blur-xl border-b border-slate-100 overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col px-5 py-4 gap-1">
          <a
            href="#meet-sam"
            onClick={() => setOpen(false)}
            className="py-3 px-4 text-[14px] font-semibold text-slate-700 hover:text-usa-blue hover:bg-usa-blue/5 rounded-xl transition-all"
          >
            Meet Sam
          </a>
          <a
            href="#command-center"
            onClick={() => setOpen(false)}
            className="py-3 px-4 text-[14px] font-semibold text-slate-700 hover:text-usa-blue hover:bg-usa-blue/5 rounded-xl transition-all"
          >
            Features
          </a>
          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className="py-3 px-4 text-[14px] font-semibold text-slate-700 hover:text-usa-blue hover:bg-usa-blue/5 rounded-xl transition-all"
          >
            Ask Sam
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-1 py-3 px-4 text-[14px] font-semibold text-white bg-usa-blue rounded-xl text-center transition-all hover:bg-usa-blue-light"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
