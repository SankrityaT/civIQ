// TODO (Mohan): Add animated counters, icons, polish
const STATS = [
  { stat: "48%", desc: "of jurisdictions can't recruit enough poll workers" },
  { stat: "1",   desc: "person runs over half of local election offices" },
  { stat: "36%", desc: "turnover rate in election leadership since 2020" },
  { stat: "34%", desc: "of jurisdictions have zero full-time administrators" },
];

export default function Problem() {
  return (
    <section className="bg-white px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-slate-800">
        The Problem
      </h2>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
        {STATS.map(({ stat, desc }) => (
          <div key={stat} className="rounded-xl border bg-slate-50 p-5 text-center">
            <p className="text-4xl font-bold text-slate-800">{stat}</p>
            <p className="mt-2 text-sm text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
