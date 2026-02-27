import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-8 py-5 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Civiq
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/chat"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Ask Sam
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-900 px-5 py-2 text-sm font-medium text-slate-900 transition-all hover:bg-slate-900 hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-amber-50/40 px-6 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100/30 via-transparent to-transparent" />

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-700 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            AI-Powered Election Support
          </div>

          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[1.1] tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
            Train poll workers.
            <br />
            Answer every question.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
            Civiq gives election officials an AI assistant that knows your
            training manuals inside out &mdash; so every poll worker gets
            instant, accurate answers on election day.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/chat"
              className="rounded-full bg-slate-900 px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
            >
              Try asking Sam
            </Link>
            <Link
              href="#meet-sam"
              className="rounded-full border border-slate-300 px-8 py-3.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              Learn more
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </section>

      {/* ── MEET SAM ────────────────────────────────────────────────────── */}
      <section
        id="meet-sam"
        className="relative bg-slate-900 px-6 py-28 text-white"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-16 md:grid-cols-2">
            {/* Left — Sam illustration area */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/20">
                <span className="text-7xl">🦅</span>
              </div>
              <div className="mt-6 text-center md:text-left">
                <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
                  Your AI Assistant
                </span>
              </div>
            </div>

            {/* Right — copy */}
            <div>
              <h2 className="font-[family-name:var(--font-playfair)] text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                Meet Sam.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-400">
                Sam is Civiq&apos;s AI assistant &mdash; a friendly eagle who has
                memorized every page of your poll worker training manual. Ask
                about voter check-in, provisional ballots, accessibility
                procedures, or emergency protocols.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-400">
                Every answer cites the exact section from your official
                documents. Sam supports English and Spanish, and never strays
                outside approved election content.
              </p>
              <Link
                href="/chat"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
              >
                Talk to Sam
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD FOR OFFICIALS ─────────────────────────────────────── */}
      <section className="bg-white px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-widest text-amber-600 uppercase">
              Election Officials
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-medium leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Your command center.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              A dashboard built for the people who run elections &mdash; upload
              training documents, test AI accuracy, recruit workers, and
              monitor everything in real time.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {/* Card 1 */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Document Management
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Upload and manage training manuals, procedure guides, and
                policy documents. Sam learns from them automatically.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Test AI Accuracy
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Ask Sam questions in a sandbox, approve or flag responses, and
                fine-tune answers before they reach poll workers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Poll Worker Recruitment
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Track recruitment progress, manage sign-ups, and ensure every
                precinct is fully staffed before election day.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Audit &amp; Analytics
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Full audit log of every AI interaction. See what questions poll
                workers are asking and measure response accuracy.
              </p>
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-900 px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Civiq
          </span>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Civiq. Built for election
            officials.
          </p>
        </div>
      </footer>
    </div>
  );
}
