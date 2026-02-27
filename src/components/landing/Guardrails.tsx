// TODO (Mohan): Polish card design, add hover effects
const CARDS = [
  {
    icon: "🔒",
    title: "Local & Private",
    desc: "Data never leaves the building. Fully on-device in production.",
  },
  {
    icon: "✅",
    title: "Human in the Loop",
    desc: "Officials control what the AI knows and can review every response.",
  },
  {
    icon: "🌐",
    title: "Bilingual",
    desc: "English & Spanish from day one, with equal quality.",
  },
  {
    icon: "📋",
    title: "Audit Trail",
    desc: "Every interaction is logged and reviewable by officials.",
  },
];

export default function Guardrails() {
  return (
    <section className="bg-white px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-slate-800">
        Built for Trust
      </h2>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {CARDS.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl border bg-slate-50 p-5 text-center"
          >
            <div className="mb-3 text-3xl">{icon}</div>
            <p className="font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
