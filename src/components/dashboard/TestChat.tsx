"use client";
import { useState } from "react";
import { Send, CheckCircle, AlertTriangle, Pencil, Zap } from "lucide-react";

export default function TestChat() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "approved" | "flagged">("idle");

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);
    setSource(null);
    setStatus("idle");
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language: "en" }),
      });
      const data = await res.json();
      setResponse(data.response ?? "No response.");
      setSource(data.source ?? null);
    } catch {
      setResponse("Error contacting Sam. Make sure GROQ_API_KEY is set in .env.local.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Question panel */}
      <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="mb-1 text-sm font-semibold text-slate-800">Test Question</label>
        <p className="mb-3 text-xs text-slate-400">
          Simulate what a poll worker might ask Sam on election day.
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          rows={6}
          placeholder="e.g. What do I do if a voter's name isn't in the poll book?"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Asking Sam…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Ask Sam
            </>
          )}
        </button>
      </div>

      {/* Response panel */}
      <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Sam&apos;s Response</p>
            <p className="text-xs text-slate-400">Review before approving</p>
          </div>
          {response && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              <Zap className="h-3 w-3" />
              AI Generated
            </span>
          )}
        </div>

        <div
          className={`flex-1 rounded-xl border p-4 text-sm leading-relaxed transition-all ${
            !response
              ? "border-dashed border-slate-200 bg-slate-50"
              : status === "approved"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : status === "flagged"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {response ? (
            <p className="whitespace-pre-wrap">{response}</p>
          ) : (
            <p className="text-slate-400">Response will appear here…</p>
          )}
        </div>

        {source && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
            <span>📄</span>
            {source}
          </p>
        )}

        {/* Action buttons */}
        {response && status === "idle" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStatus("approved")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={() => setStatus("flagged")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Flag
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        )}

        {status !== "idle" && (
          <div
            className={`mt-4 rounded-full px-4 py-2 text-center text-xs font-semibold ${
              status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status === "approved"
              ? "✓ Approved and cached for poll workers"
              : "⚠ Flagged for review"}
          </div>
        )}
      </div>
    </div>
  );
}
