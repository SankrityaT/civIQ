// TODO (Kinjal): Build dashboard overview with stat cards + recent activity feed
import StatsCard from "@/components/dashboard/StatsCard";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Dashboard Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Active Documents" value="3" />
        <StatsCard label="Poll Workers Recruited" value="0" />
        <StatsCard label="Questions Answered Today" value="0" />
        <StatsCard label="Response Accuracy" value="—" />
      </div>
      {/* TODO: Recent activity feed */}
    </div>
  );
}
