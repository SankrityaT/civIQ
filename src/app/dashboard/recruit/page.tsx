// TODO (Kinjal + Sanki): Build recruitment table with filters + export
import RecruitTable from "@/components/dashboard/RecruitTable";

export default function RecruitPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Poll Worker Recruitment</h1>
      <RecruitTable />
    </div>
  );
}
