// Created by Sankritya on Feb 27, 2026
// Crow-like AI Assistant Widget — floating chat that navigates users, explains features, answers questions
"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  ArrowRight,
  Sparkles,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigation?: { path: string; label: string };
  timestamp: number;
}

const QUICK_ACTIONS = [
  { label: "Take me to recruitment", icon: "👥" },
  { label: "Show me training documents", icon: "📄" },
  { label: "Take me to the audit log", icon: "📋" },
  { label: "How does AI scoring work?", icon: "🤖" },
  { label: "Show the knowledge graph", icon: "🧠" },
];

export default function SamAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const [pageContext, setPageContext] = useState<Record<string, unknown>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: getWelcomeMessage(),
          timestamp: Date.now(),
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch live page context whenever pathname changes
  useEffect(() => {
    async function fetchContext() {
      try {
        const ctx: Record<string, unknown> = { path: pathname };
        if (pathname.includes("/documents")) {
          const r = await fetch("/api/documents");
          if (r.ok) { const d = await r.json(); ctx.documents = d.documents ?? []; }
        } else if (pathname.includes("/recruit")) {
          const r = await fetch("/api/voters/scored");
          if (r.ok) { const d = await r.json(); ctx.candidates = d.total ?? 0; ctx.eligible = d.eligible ?? 0; }
        } else if (pathname.includes("/audit")) {
          const r = await fetch("/api/audit");
          if (r.ok) { const d = await r.json(); ctx.auditCount = d.entries?.length ?? 0; }
        } else if (pathname === "/dashboard") {
          const [docs, scored] = await Promise.allSettled([
            fetch("/api/documents").then(r => r.json()),
            fetch("/api/voters/scored").then(r => r.json()),
          ]);
          if (docs.status === "fulfilled") ctx.docCount = docs.value.documents?.length ?? 0;
          if (scored.status === "fulfilled") ctx.candidateCount = scored.value.total ?? 0;
        }
        setPageContext(ctx);
      } catch { /* silent — context is best-effort */ }
    }
    fetchContext();
  }, [pathname]);

  function getWelcomeMessage(): string {
    const page = pathname;
    if (page === "/dashboard") {
      return "Hey there! 👋 I'm Sam, your CivIQ assistant. I can help you navigate the dashboard, explain any feature, or answer questions about poll worker training. What would you like to do?";
    }
    if (page.includes("/documents")) {
      return "You're on the Training Documents page! 📄 Here you can upload and manage the documents I learn from. Need help uploading a doc or understanding how the knowledge base works?";
    }
    if (page.includes("/ai-center") || page.includes("/test")) {
      return "You're viewing the Knowledge Graph! � This visualizes how all your training document concepts connect. Want to upload more docs or check recruitment?";
    }
    if (page.includes("/recruit")) {
      return "You're on the Recruitment page! 👥 I can help you understand how AI scoring works, or take you to other sections of the dashboard. What do you need?";
    }
    if (page.includes("/audit")) {
      return "You're viewing the Audit Log! 📋 Every AI interaction is tracked here for compliance. Need help filtering, exporting, or understanding the data?";
    }
    return "Hey! 👋 I'm Sam, your CivIQ assistant. I can navigate you anywhere in the dashboard, explain features, or answer poll worker training questions. How can I help?";
  }

  async function handleSend(text?: string) {
    const message = text ?? input.trim();
    if (!message || loading) return;
    setInput("");

    const userMsg: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // First check for local navigation/feature explanation
      const localResponse = handleLocalCommand(message);
      if (localResponse) {
        setMessages((prev) => [...prev, localResponse]);
        setLoading(false);
        return;
      }

      // Fall through to AI for knowledge-base questions
      const res = await fetch("/api/sam-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, currentPath: pathname, pageContext }),
      });
      const data = await res.json();

      const assistantMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response ?? "Sorry, I couldn't process that. Try again!",
        navigation: data.navigation ?? undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Oops, something went wrong. Try again or ask me something else!",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleLocalCommand(message: string): AssistantMessage | null {
    const lower = message.toLowerCase();

    // Navigation commands
    const navMap: { keywords: string[]; path: string; label: string; response: string }[] = [
      {
        keywords: ["dashboard", "home", "overview", "main"],
        path: "/dashboard",
        label: "Dashboard",
        response: "Taking you to the Dashboard! 🏠 Here you'll find all your KPIs, recruitment pipeline, and a quick overview of everything.",
      },
      {
        keywords: ["document", "training", "upload", "pdf", "docs", "knowledge"],
        path: "/dashboard/documents",
        label: "Training Documents",
        response: "Opening Training Documents! 📄 This is where you manage all the documents I learn from. You can upload new PDFs, toggle documents active/inactive, and see word counts.",
      },
      {
        keywords: ["knowledge", "graph", "ai center", "concepts", "visualization"],
        path: "/dashboard/ai-center",
        label: "Knowledge Graph",
        response: "Opening the Knowledge Graph! � This shows how all concepts in your training documents are connected. Great for understanding what Sam knows.",
      },
      {
        keywords: ["recruit", "candidate", "hire", "poll worker", "find"],
        path: "/dashboard/recruit",
        label: "Recruitment",
        response: "Opening Recruitment! 👥 I've AI-scored candidates from the voter registration database. You can filter by location, languages, and experience, then export a shortlist as CSV.",
      },
      {
        keywords: ["audit", "log", "history", "compliance", "interactions"],
        path: "/dashboard/audit",
        label: "Audit Log",
        response: "Going to the Audit Log! 📋 Every AI interaction is timestamped and logged here. You can filter by user type, language, or flagged status, and export everything to CSV for compliance.",
      },
    ];

    for (const nav of navMap) {
      if (nav.keywords.some((kw) => lower.includes(kw)) &&
          (lower.includes("take me") || lower.includes("go to") || lower.includes("show me") ||
           lower.includes("open") || lower.includes("navigate") || lower.includes("where"))) {
        if (pathname !== nav.path) {
          router.push(nav.path);
        }
        return {
          id: crypto.randomUUID(),
          role: "assistant",
          content: nav.response,
          navigation: { path: nav.path, label: nav.label },
          timestamp: Date.now(),
        };
      }
    }

    // Feature explanations
    if (lower.includes("how") && (lower.includes("recruit") || lower.includes("scoring"))) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Great question! 🎯 Our recruitment system scans the voter registration database and uses AI to score candidates based on:\n\n• **Prior poll worker experience** — biggest factor\n• **Language skills** — bilingual candidates score higher\n• **Location proximity** — closer to polling sites = better\n• **Registration history** — longer registration = more reliable\n\nWant me to take you to the Recruitment page to see it in action?",
        navigation: { path: "/dashboard/recruit", label: "Go to Recruitment" },
        timestamp: Date.now(),
      };
    }

    if (lower.includes("how") && (lower.includes("ai work") || lower.includes("sam work") || lower.includes("knowledge base"))) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Here's how I work! 🧠\n\n1. **Document Ingestion** — Training docs are chunked and embedded into a vector store\n2. **Knowledge Graph** — Concepts are extracted and linked in a graph for better retrieval\n3. **RAG Search** — When you ask a question, I find the most relevant chunks using cosine similarity\n4. **LLM Generation** — The relevant context is sent to Groq (LLaMA 3.3 70B) to generate a grounded answer\n5. **Caching** — Approved responses are cached for instant delivery to poll workers\n\nThis is model-agnostic — any LLM can plug into the same knowledge base!",
        timestamp: Date.now(),
      };
    }

    return null; // Fall through to AI
  }

  function handleNavigate(path: string) {
    router.push(path);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-amber-500/30 active:scale-95"
          aria-label="Open Sam Assistant"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <Image src="/logo.jpeg" alt="Sam" fill className="object-cover" unoptimized />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
          style={{ height: "min(580px, calc(100vh - 48px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-amber-400/50">
                <Image src="/logo.jpeg" alt="Sam" fill className="object-cover" unoptimized />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Sam Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Online • RAG-powered</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-700 rounded-bl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                  {msg.navigation && msg.role === "assistant" && (
                    <button
                      onClick={() => handleNavigate(msg.navigation!.path)}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-200"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {msg.navigation.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 rounded-bl-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span className="text-[12px] text-slate-400">Sam is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions — always visible, collapsible */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2">
            <button
              onClick={() => setQuickActionsOpen(p => !p)}
              className="flex w-full items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1 hover:text-slate-600"
            >
              <span>Quick Actions</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${quickActionsOpen ? "" : "-rotate-90"}`} />
            </button>
            {quickActionsOpen && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.label)}
                    className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <span>{action.icon}</span>
                    <span className="truncate max-w-[150px]">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-slate-400">
              Powered by Knowledge Graph + RAG
            </p>
          </div>
        </div>
      )}
    </>
  );
}
