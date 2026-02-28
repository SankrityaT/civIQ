// Created by Kinjal
"use client";
import { useSyncExternalStore } from "react";
import { Send, CheckCircle, AlertTriangle, Pencil, Zap, RotateCcw, ShieldCheck, Clock, Globe, User } from "lucide-react";
import {
  subscribe, getState, setState,
  askSam, approveSam, flagSam, resetTestAI,
} from "@/lib/test-ai-store";

export default function TestChat() {
  // Subscribe to global store — re-renders when store changes
  const s = useSyncExternalStore(subscribe, getState, getState);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Question panel */}
      <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="mb-1 text-sm font-semibold text-slate-800">Test Question</label>
        <p className="mb-3 text-xs text-slate-400">
          Simulate what a poll worker might ask Sam on election day.
        </p>

        {/* Simulation controls */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={s.userType}
              onChange={(e) => setState({ userType: e.target.value as "poll_worker" | "official" })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="poll_worker">Poll Worker</option>
              <option value="official">Official</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={s.language}
              onChange={(e) => setState({ language: e.target.value as "en" | "es" })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <textarea
          value={s.question}
          onChange={(e) => setState({ question: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askSam(); } }}
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          rows={6}
          placeholder={s.language === "es" ? "ej. ¿Qué hago si el nombre del votante no está en el libro?" : "e.g. What do I do if a voter's name isn't in the poll book?"}
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => askSam()}
            disabled={s.loading || !s.question.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {s.loading ? (
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
          {s.response && (
            <button
              onClick={() => resetTestAI()}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Response panel */}
      <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Sam&apos;s Response</p>
            <p className="text-xs text-slate-400">Review before approving</p>
          </div>
          <div className="flex items-center gap-2">
            {s.responseTime !== null && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="h-3 w-3" />
                {s.responseTime < 1000 ? `${s.responseTime}ms` : `${(s.responseTime / 1000).toFixed(1)}s`}
              </span>
            )}
            {s.response && (
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  s.wasCached
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {s.wasCached ? (
                  <><ShieldCheck className="h-3 w-3" /> Cached</>
                ) : (
                  <><Zap className="h-3 w-3" /> AI Generated</>
                )}
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex-1 rounded-xl border p-4 text-sm leading-relaxed transition-all ${
            s.error
              ? "border-red-200 bg-red-50 text-red-700"
              : !s.response
              ? "border-dashed border-slate-200 bg-slate-50"
              : s.status === "approved"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : s.status === "flagged"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {s.error ? (
            <p>{s.error}</p>
          ) : s.editing ? (
            <textarea
              value={s.editedResponse}
              onChange={(e) => setState({ editedResponse: e.target.value })}
              className="min-h-[120px] w-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 focus:outline-none"
              autoFocus
            />
          ) : s.response ? (
            <p className="whitespace-pre-wrap">{s.response}</p>
          ) : s.loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              Sam is thinking…
            </div>
          ) : (
            <p className="text-slate-400">Response will appear here…</p>
          )}
        </div>

        {s.source && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
            <span>📄</span>
            {s.source}
          </p>
        )}

        {/* Action buttons */}
        {s.response && s.status === "idle" && !s.error && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => approveSam()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {s.editing ? "Save & Approve" : "Approve"}
            </button>
            {!s.editing && (
              <button
                onClick={() => flagSam()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Flag
              </button>
            )}
            <button
              onClick={() => s.editing ? setState({ editing: false }) : setState({ editing: true, editedResponse: s.response ?? "" })}
              className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {s.editing ? "Cancel" : "Edit"}
            </button>
          </div>
        )}

        {s.status !== "idle" && (
          <div
            className={`mt-4 rounded-full px-4 py-2 text-center text-xs font-semibold ${
              s.status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {s.status === "approved"
              ? "✓ Approved and cached — poll workers will get this exact answer"
              : "⚠ Flagged for review — response will not be cached"}
          </div>
        )}
      </div>
    </div>
  );
}
