"use client";
// TODO (Sanki): Implement full chat UI
// - Message history with scroll
// - Typing indicator
// - Input bar + send button
// - Call /api/chat on submit
// - Render MessageBubble for each message
// - Show SourceCitation below each AI message
import LanguageToggle from "./LanguageToggle";

export default function ChatWindow() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {/* TODO: Sam eagle avatar */}
          <div className="h-8 w-8 rounded-full bg-slate-700" />
          <span className="font-semibold text-slate-800">Ask Sam</span>
        </div>
        <LanguageToggle />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TODO: render MessageBubble list */}
        <p className="text-center text-sm text-slate-400">
          Ask Sam a question about election day procedures.
        </p>
      </div>

      {/* Input bar */}
      <div className="border-t bg-white px-4 py-3">
        {/* TODO: textarea + send button */}
        <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
          Type a question…
        </div>
      </div>
    </div>
  );
}
