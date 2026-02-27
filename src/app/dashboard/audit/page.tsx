// TODO (Kinjal): Build audit log table with date/type filters + CSV export
import AuditLog from "@/components/dashboard/AuditLog";

export default function AuditPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Audit Log</h1>
      <AuditLog />
    </div>
  );
}
