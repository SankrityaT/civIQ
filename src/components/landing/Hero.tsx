// TODO (Mohan): Add Sam eagle illustration, animations, polished CTAs
import Link from "next/link";

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 bg-slate-900 px-6 py-24 text-center text-white">
      {/* TODO: Sam mascot image */}
      <div className="h-24 w-24 rounded-full bg-amber-400" />
      <h1 className="text-5xl font-bold tracking-tight">Civiq</h1>
      <p className="text-xl font-medium text-amber-400">
        AI-Powered Election Workforce Assistant
      </p>
      <p className="max-w-xl text-slate-300">
        Recruit smarter. Train better. Support always.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-amber-400 px-6 py-3 font-semibold text-slate-900 hover:bg-amber-300"
        >
          Election Official Dashboard
        </Link>
        <Link
          href="/chat"
          className="rounded-lg border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-slate-900"
        >
          Poll Worker Chat
        </Link>
      </div>
    </section>
  );
}
