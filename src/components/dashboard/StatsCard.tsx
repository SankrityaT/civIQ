// TODO (Kinjal): Add icons, trend arrows, click-through links
interface Props {
  label: string;
  value: string | number;
}

export default function StatsCard({ label, value }: Props) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
