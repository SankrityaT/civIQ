import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollReveal from "@/components/ScrollReveal";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <div className="font-[family-name:var(--font-dm)]">
        {/* ── NAVBAR ───────────────────────────────────────────────────── */}
        <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-6 pt-14 md:pt-20">
        {/* Red, blue, white shade orbs — distinct blended patches, not gradient */}
        <div className="hero-shade-red" style={{ width: 'min(500px, 80vw)', height: 'min(500px, 80vw)', top: '-10%', right: '-5%' }} />
        <div className="hero-shade-blue" style={{ width: 'min(600px, 90vw)', height: 'min(600px, 90vw)', top: '10%', left: '-8%' }} />
        <div className="hero-shade-white" style={{ width: 'min(400px, 70vw)', height: 'min(400px, 70vw)', top: '20%', left: '30%' }} />
        <div className="hero-shade-red" style={{ width: 'min(350px, 60vw)', height: 'min(350px, 60vw)', bottom: '5%', left: '10%', opacity: 0.05 }} />
        <div className="hero-shade-blue" style={{ width: 'min(400px, 70vw)', height: 'min(400px, 70vw)', bottom: '-5%', right: '5%', opacity: 0.05 }} />
        <div className="hero-shade-white" style={{ width: 'min(300px, 60vw)', height: 'min(300px, 60vw)', top: '50%', right: '20%' }} />

        {/* Decorative floating stars */}
        <div className="absolute top-32 left-[15%] float-slow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-usa-blue/20">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
          </svg>
        </div>
        <div className="absolute top-48 right-[12%] float-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-usa-red/20">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
          </svg>
        </div>
        <div className="absolute bottom-40 left-[20%] float-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-usa-blue/15">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
          </svg>
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-usa-blue/20 bg-usa-blue/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-usa-blue uppercase">
            <span className="relative h-1.5 w-1.5 rounded-full bg-usa-red pulse-ring" />
            AI-Powered Election Support
          </div>

          <h1 className="font-[family-name:var(--font-cormorant)] text-6xl font-light leading-[1.05] tracking-tight text-slate-900 sm:text-7xl md:text-8xl">
            <span className="text-usa-blue">Train</span> poll workers.
            <br />
            <span className="text-usa-red">Answer</span> every question.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Civiq gives election officials an AI assistant that knows your
            training manuals inside out &mdash; so every poll worker gets
            instant, accurate answers on election day.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/chat"
              className="rounded-full bg-usa-red px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-usa-red-light hover:shadow-lg hover:shadow-usa-red/25"
            >
              Try asking Sam
            </Link>
            <Link
              href="#meet-sam"
              className="rounded-full border-2 border-usa-blue/30 px-8 py-3.5 text-sm font-semibold text-usa-blue transition-all hover:border-usa-blue hover:bg-usa-blue/5"
            >
              Learn more
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 section-divider" />
      </section>

      {/* ── MEET SAM ────────────────────────────────────────────────────── */}
      <section
        id="meet-sam"
        className="relative bg-white px-6 py-32 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_top_right,_#002868_0%,_transparent_70%)] opacity-[0.04]" />
        
        <div className="relative mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-usa-red uppercase">
                Your AI Assistant
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light leading-tight tracking-tight text-usa-blue sm:text-5xl md:text-6xl">
                Meet Sam.
              </h2>
            </div>
          </ScrollReveal>

          {/* Sam Showcase Card — big rectangle */}
          <ScrollReveal delay={200}>
            <div className="sam-card p-6 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                {/* Left — Sam avatar box */}
                <div className="flex flex-col items-center gap-4">
                  <div className="sam-avatar-box w-36 h-44 sm:w-48 sm:h-56 md:w-52 md:h-60 p-4">
                    <div className="relative w-full h-full">
                      <Image
                        src="/sam.gif"
                        alt="Sam the Eagle AI Assistant"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                  <p className="text-sm font-mono text-slate-500 tracking-wide">Sam the Eagle</p>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/chat"
                      className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-usa-blue hover:text-usa-blue"
                    >
                      Talk to Sam
                    </Link>
                  </div>
                </div>

                {/* Right — Timeline activity */}
                <div className="flex-1 space-y-5 pt-2">
                  <h3 className="text-2xl font-bold text-slate-900 font-[family-name:var(--font-libre)]">
                    Sam the Eagle
                  </h3>

                  {/* Timeline entries */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="sam-timeline-dot mt-1.5" />
                      <span className="text-sm text-slate-700">Poll worker asks about provisional ballot procedures. Sam cites Section 4.2 of the training manual.</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="sam-timeline-dot mt-1.5" />
                      <span className="text-sm text-slate-700">Voter accessibility question answered in English and Spanish simultaneously.</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="sam-timeline-dot sam-timeline-dot-active mt-1.5" />
                      <span className="text-sm text-slate-800 font-medium">Sam recognizes a recurring question pattern. Flags it for the election official to review training gaps.</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="sam-timeline-dot sam-timeline-dot-red mt-1.5" />
                      <span className="text-sm text-slate-800 font-medium">Emergency protocol question detected. Sam surfaces the exact procedure from approved documents only.</span>
                    </div>
                  </div>

                  {/* Success bar */}
                  <div className="sam-success-bar">
                    <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-green-800">Every answer sourced from approved election documents. Zero hallucinations.</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div className="absolute bottom-0 left-0 right-0 section-divider" />
      </section>

      {/* ── COMMAND CENTER — DOTTED BENTO GRID ──────────────────── */}
      <section id="command-center" className="relative px-6 py-32 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F4FA 30%, #E8EEF8 70%, #F0F4FA 100%)' }}>
        {/* Subtle dot texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #002868 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        
        <div className="relative mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-usa-red uppercase">
                Election Officials
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light leading-tight tracking-tight text-usa-blue sm:text-5xl md:text-6xl">
                Your command center.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
                A dashboard built for the people who run elections &mdash; upload
                training documents, test AI accuracy, recruit workers, and
                monitor everything in real time.
              </p>
            </div>
          </ScrollReveal>

          {/* 4 horizontal cards with big letter headers */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1 — Document Management */}
            <ScrollReveal delay={100}>
              <div className="dotted-bento dotted-bento-red-border group h-full flex flex-col overflow-hidden !p-0">
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-usa-blue text-center">
                  <span className="font-[family-name:var(--font-cormorant)] text-6xl font-light text-white">D</span>
                  <div className="mt-2 h-px w-8 bg-white/40" />
                  <span className="mt-2 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">Documents</span>
                </div>
                <div className="relative z-10 flex flex-col flex-1 p-5">
                  <p className="text-sm leading-relaxed text-slate-500">
                    Upload training manuals, procedure guides, and policy documents. Sam learns from them automatically.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 2 — Test AI Accuracy */}
            <ScrollReveal delay={200}>
              <div className="dotted-bento group h-full flex flex-col overflow-hidden !p-0">
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-usa-red text-center">
                  <span className="font-[family-name:var(--font-cormorant)] text-6xl font-light text-white">T</span>
                  <div className="mt-2 h-px w-8 bg-white/40" />
                  <span className="mt-2 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">Testing</span>
                </div>
                <div className="relative z-10 flex flex-col flex-1 p-5">
                  <p className="text-sm leading-relaxed text-slate-500">
                    Ask Sam questions in a sandbox. Approve or flag responses and fine-tune answers before deployment.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 3 — Poll Worker Recruitment */}
            <ScrollReveal delay={300}>
              <div className="dotted-bento dotted-bento-red-border group h-full flex flex-col overflow-hidden !p-0">
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-usa-blue text-center">
                  <span className="font-[family-name:var(--font-cormorant)] text-6xl font-light text-white">R</span>
                  <div className="mt-2 h-px w-8 bg-white/40" />
                  <span className="mt-2 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">Recruitment</span>
                </div>
                <div className="relative z-10 flex flex-col flex-1 p-5">
                  <p className="text-sm leading-relaxed text-slate-500">
                    Track recruitment progress, manage sign-ups, and ensure every precinct is fully staffed.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 4 — Audit & Analytics */}
            <ScrollReveal delay={400}>
              <div className="dotted-bento group h-full flex flex-col overflow-hidden !p-0">
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-usa-red text-center">
                  <span className="font-[family-name:var(--font-cormorant)] text-6xl font-light text-white">A</span>
                  <div className="mt-2 h-px w-8 bg-white/40" />
                  <span className="mt-2 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">Audit</span>
                </div>
                <div className="relative z-10 flex flex-col flex-1 p-5">
                  <p className="text-sm leading-relaxed text-slate-500">
                    Full audit log of every AI interaction. See what questions are asked and measure response accuracy.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={500}>
            <div className="mt-14 text-center">
              <Link
                href="/dashboard"
                className="rounded-full bg-usa-blue px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-usa-blue-light hover:shadow-lg hover:shadow-usa-blue/20"
              >
                Open Dashboard
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── BUILT FOR TRUST ────────────────────────────────────────────── */}
      <section className="relative px-6 py-32 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FEF7F8 15%, #FDF0F2 50%, #FEF7F8 85%, #FFFFFF 100%)' }}>
        {/* Subtle red shade orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(191,10,48,0.04) 0%, transparent 60%)' }} />

        <div className="relative mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="mb-20 text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-usa-red uppercase">
                Trust &amp; Transparency
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light leading-tight tracking-tight text-usa-blue sm:text-5xl">
                Built for trust.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-slate-500">
                Every safeguard election officials need &mdash; baked into the system from day one.
              </p>
            </div>
          </ScrollReveal>

          {/* Trust pillars — stacked horizontal rows with connecting line */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-usa-red/10" />

            {/* Pillar 1 */}
            <ScrollReveal delay={100}>
              <div className="relative flex items-start gap-6 sm:gap-8 pb-12 group">
                <div className="relative z-10 flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-usa-red/10 shadow-sm transition-all group-hover:border-usa-red/25 group-hover:shadow-md">
                  <svg className="h-6 w-6 text-usa-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-lg font-bold text-usa-blue">Local &amp; Private</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Data never leaves the building. Fully on-device in production &mdash; no cloud, no internet required. Your election data stays yours.</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 2 */}
            <ScrollReveal delay={200}>
              <div className="relative flex items-start gap-6 sm:gap-8 pb-12 group">
                <div className="relative z-10 flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-usa-red/10 shadow-sm transition-all group-hover:border-usa-red/25 group-hover:shadow-md">
                  <svg className="h-6 w-6 text-usa-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-lg font-bold text-usa-blue">Human in the Loop</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Officials control the entire knowledge base. Every AI response can be reviewed, flagged, or edited before it reaches poll workers.</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 3 */}
            <ScrollReveal delay={300}>
              <div className="relative flex items-start gap-6 sm:gap-8 pb-12 group">
                <div className="relative z-10 flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-usa-red/10 shadow-sm transition-all group-hover:border-usa-red/25 group-hover:shadow-md">
                  <svg className="h-6 w-6 text-usa-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-lg font-bold text-usa-blue">Bilingual from Day One</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">English and Spanish support with equal quality. Every poll worker gets the same accurate answers, regardless of language preference.</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 4 */}
            <ScrollReveal delay={400}>
              <div className="relative flex items-start gap-6 sm:gap-8 group">
                <div className="relative z-10 flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-usa-red/10 shadow-sm transition-all group-hover:border-usa-red/25 group-hover:shadow-md">
                  <svg className="h-6 w-6 text-usa-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-lg font-bold text-usa-blue">Full Audit Trail</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Every interaction is logged and reviewable. Election officials get complete transparency into what questions are asked and how they&apos;re answered.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER — LIQUID GLASS BLUE ─────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="relative px-6 py-24"
          style={{
            background: 'linear-gradient(180deg, rgba(0,40,104,0.06) 0%, rgba(0,40,104,0.12) 50%, rgba(0,40,104,0.06) 100%)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
          }}
        >
          {/* Frosted glass inner glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(0,40,104,0.08) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 pointer-events-none border-y" style={{ borderColor: 'rgba(0,40,104,0.1)' }} />
          <div className="relative mx-auto max-w-3xl text-center">
            <ScrollReveal>
              <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-usa-blue sm:text-4xl md:text-5xl">
                Ready to modernize your election operations?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
                Join the growing number of election officials using AI to support their poll workers.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/chat"
                  className="rounded-full bg-usa-red px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-usa-red-light hover:shadow-lg hover:shadow-usa-red/30"
                >
                  Try asking Sam
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border-2 border-usa-blue/30 px-8 py-3.5 text-sm font-semibold text-usa-blue transition-all hover:border-usa-blue hover:bg-usa-blue/5"
                >
                  Open Dashboard
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="relative bg-usa-blue overflow-hidden">
        {/* Subtle radial glow at top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, rgba(100,140,220,0.15) 0%, transparent 70%)' }} />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-8">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <div className="relative h-14 w-40 p-3 bg-white rounded-xl shadow-lg">
              <Image
                src="/civiq-logo-transparent.png"
                alt="Civiq"
                fill
                className="object-contain"
              />
            </div>
            <p className="mt-1 text-xs text-white/40 tracking-wide">
              AI-Powered Election Workforce Assistant
            </p>
          </div>

          {/* Thin divider line */}
          <div className="mx-auto mt-10 mb-8 w-16 h-px bg-white/15" />

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10">
            <a href="#meet-sam" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors tracking-wide uppercase">
              Meet Sam
            </a>
            <a href="#command-center" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors tracking-wide uppercase">
              Features
            </a>
            <Link href="/chat" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors tracking-wide uppercase">
              Ask Sam
            </Link>
            <Link href="/dashboard" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors tracking-wide uppercase">
              Dashboard
            </Link>
          </div>

          {/* Copyright */}
          <p className="mt-10 text-center text-[11px] text-white/25 tracking-wider">
            &copy; {new Date().getFullYear()} Civiq. Built for election officials.
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}
