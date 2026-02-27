"use client";
// TODO (Kinjal + Sanki): Fetch from /api/recruit, add filter controls, row selection + CSV export
export default function RecruitTable() {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {/* TODO: Filter bar — age range, location, language */}
      <div className="border-b px-5 py-3 text-sm text-slate-500">
        Filters: age range · location · language ← TODO
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-semibold uppercase text-slate-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Age</th>
            <th className="px-4 py-3">Precinct</th>
            <th className="px-4 py-3">Languages</th>
            <th className="px-4 py-3">AI Score</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-slate-400">
            <td className="px-4 py-4" colSpan={5}>
              Load voter data to see candidates — call POST /api/recruit
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
