// TODO (Mohan): Add step icons, connector lines, animation
const STEPS = [
  {
    number: "1",
    title: "Officials upload training docs & set criteria",
    icon: "📄",
  },
  {
    number: "2",
    title: "AI scans voter data & identifies candidates",
    icon: "🔍",
  },
  {
    number: "3",
    title: "Poll workers get instant, vetted answers from Sam",
    icon: "💬",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-slate-800">
        How It Works
      </h2>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 md:grid-cols-3">
        {STEPS.map(({ number, title, icon }) => (
          <div key={number} className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl">
              {icon}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Step {number}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">{title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
