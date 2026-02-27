// TODO (Kinjal): Build split-screen test interface with approve/flag/edit actions
import TestChat from "@/components/dashboard/TestChat";

export default function TestPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Test AI Responses</h1>
      <TestChat />
    </div>
  );
}
