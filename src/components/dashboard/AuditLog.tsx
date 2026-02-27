"use client";
// TODO (Kinjal): Fetch from GET /api/audit, add date/type/flagged filters, CSV export
export default function AuditLog() {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-3 text-sm text-slate-500">
        Filters: date range · user type · flagged ← TODO
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-semibold uppercase text-slate-500">
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Question</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Lang</th>
            <th className="px-4 py-3">Cached</th>
            <th className="px-4 py-3">Flagged</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-slate-400">
            <td className="px-4 py-4" colSpan={7}>
              No audit entries yet — interactions will appear here.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
