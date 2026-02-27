// TODO (Sanki): Build full Sam Chat interface
// Components needed: ChatWindow, MessageBubble, SourceCitation, LanguageToggle
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col bg-slate-50">
      <ChatWindow />
    </main>
  );
}
