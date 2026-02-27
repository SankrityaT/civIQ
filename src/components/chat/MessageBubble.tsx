"use client";
// TODO (Sanki): Style user vs. Sam bubbles, add Sam avatar, handle markdown
import { Message } from "@/types";
import SourceCitation from "./SourceCitation";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      {/* TODO: Sam avatar on left for assistant messages */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-amber-100 text-slate-900"
            : "bg-slate-100 text-slate-800"
        }`}
      >
        <p>{message.content}</p>
        {message.source && !isUser && (
          <SourceCitation source={message.source} cached={message.cached} />
        )}
      </div>
    </div>
  );
}
