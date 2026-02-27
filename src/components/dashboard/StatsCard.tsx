import { ArrowUpRight, LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface Trend {
  value: string;
  direction: "up" | "down" | "neutral";
  label: string;
}

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: Trend;
  href?: string;
  accent?: boolean;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  href,
  accent,
}: Props) {
  const content = (
    <>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            accent ? "bg-white/10" : iconBg
          }`}
        >
          <Icon className={`h-5 w-5 ${accent ? "text-white" : iconColor}`} />
        </div>
        <ArrowUpRight
          className={`h-4 w-4 transition-opacity ${
            href ? "opacity-0 group-hover:opacity-100" : "opacity-0"
          } ${accent ? "text-white/60" : "text-slate-400"}`}
        />
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className={`text-3xl font-bold tracking-tight ${accent ? "text-white" : "text-slate-900"}`}>
          {value}
        </p>
        <p className={`mt-1 text-sm ${accent ? "text-white/60" : "text-slate-500"}`}>{label}</p>
      </div>

      {/* Trend */}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend.direction === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          {trend.direction === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          <span
            className={`text-xs font-semibold ${
              trend.direction === "up"
                ? "text-emerald-500"
                : trend.direction === "down"
                ? "text-red-400"
                : accent ? "text-white/50" : "text-slate-400"
            }`}
          >
            {trend.value}
          </span>
          <span className={`text-xs ${accent ? "text-white/40" : "text-slate-400"}`}>
            {trend.label}
          </span>
        </div>
      )}
    </>
  );

  const className = `group relative flex flex-col rounded-2xl p-5 transition-all ${
    accent
      ? "bg-slate-900 shadow-lg shadow-slate-900/20"
      : "border border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
  }`;

  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}
