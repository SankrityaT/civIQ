import TestChat from "@/components/dashboard/TestChat";
import { FlaskConical } from "lucide-react";

export default function TestPage() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Test AI Responses</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Ask Sam a question and review the answer before it reaches poll workers. Approve, flag, or refine responses.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <span className="mt-0.5 text-base">ℹ️</span>
        <p>
          Approved responses are cached — identical questions from poll workers will get the same answer instantly without an AI call.
        </p>
      </div>

      <TestChat />
    </div>
  );
}
