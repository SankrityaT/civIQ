"use client";
// TODO (Kinjal): Split-screen layout — question input + AI response panel
// Add approve ✅ / flag ⚠️ / edit ✏️ actions; call POST /api/test
export default function TestChat() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Question panel */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Test Question
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none"
          rows={4}
          placeholder="Type a question a poll worker might ask…"
        />
        <button className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Ask Sam
        </button>
      </div>

      {/* Response panel */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">Sam's Response</p>
        <div className="min-h-[120px] text-sm text-slate-500">
          {/* TODO: render AI response here */}
          Response will appear here…
        </div>
        {/* TODO: approve / flag / edit action buttons */}
      </div>
    </div>
  );
}
