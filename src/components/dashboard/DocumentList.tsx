"use client";
// TODO (Kinjal): Fetch from /api/documents, add active/inactive toggle, show metadata
export default function DocumentList() {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-3 text-sm font-semibold text-slate-700">
        Uploaded Documents
      </div>
      <ul className="divide-y">
        {["Poll Worker Training Manual 2026", "Election Day Procedures Guide", "Voter ID Requirements by State"].map(
          (name, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-slate-800">{name}</span>
              {/* TODO: word count, sections, status toggle */}
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Active
              </span>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
