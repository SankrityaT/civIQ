"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Language, Message } from "@/types";
import {
  PaperPlaneRight,
  SealCheck,
  Globe,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Database,
  MagnifyingGlass,
  Cpu,
  BookOpen,
  CaretRight,
  Sparkle,
  Graph,
  Clock,
  IdentificationCard,
  ClipboardText,
  Lightning,
  Wheelchair,
  Prohibit,
} from "@phosphor-icons/react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToolStep = {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "pending" | "active" | "done";
};

// ── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_EN = [
  { q: "What time should poll workers arrive?", icon: Clock, category: "Procedures" },
  { q: "What ID do voters need to show?", icon: IdentificationCard, category: "Voter ID" },
  { q: "How do I handle a provisional ballot?", icon: ClipboardText, category: "Ballots" },
  { q: "What if voting equipment breaks?", icon: Lightning, category: "Emergency" },
  { q: "How do I assist a voter with a disability?", icon: Wheelchair, category: "Accessibility" },
  { q: "What are the electioneering rules?", icon: Prohibit, category: "Rules" },
];

const SUGGESTED_ES = [
  { q: "¿A qué hora deben llegar los trabajadores?", icon: Clock, category: "Procedimientos" },
  { q: "¿Qué ID necesitan los votantes?", icon: IdentificationCard, category: "ID" },
  { q: "¿Cómo manejo una boleta provisional?", icon: ClipboardText, category: "Boletas" },
  { q: "¿Qué pasa si el equipo falla?", icon: Lightning, category: "Emergencia" },
  { q: "¿Cómo ayudo a un votante con discapacidad?", icon: Wheelchair, category: "Accesibilidad" },
  { q: "¿Cuáles son las reglas de campaña?", icon: Prohibit, category: "Reglas" },
];

const TOOL_STEPS_EN: Omit<ToolStep, "status">[] = [
  { id: "search", label: "Searching knowledge base…", icon: MagnifyingGlass },
  { id: "retrieve", label: "Retrieving relevant sections…", icon: Database },
  { id: "read", label: "Reading training documents…", icon: BookOpen },
  { id: "generate", label: "Generating response…", icon: Cpu },
];

const TOOL_STEPS_ES: Omit<ToolStep, "status">[] = [
  { id: "search", label: "Buscando en la base de conocimiento…", icon: MagnifyingGlass },
  { id: "retrieve", label: "Recuperando secciones relevantes…", icon: Database },
  { id: "read", label: "Leyendo documentos de capacitación…", icon: BookOpen },
  { id: "generate", label: "Generando respuesta…", icon: Cpu },
];

const SECTION_LINKS: Record<string, string> = {
  "Opening the Polls": "#section-1",
  "Voter Check-In Procedures": "#section-2",
  "Voter ID Requirements": "#section-3",
  "Provisional Ballots": "#section-4",
  "Accessible Voting": "#section-5",
  "Closing the Polls": "#section-6",
  "Emergency Procedures": "#section-7",
  "Electioneering Rules": "#section-8",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolCallPanel({ steps, language }: { steps: ToolStep[]; language: Language }) {
  return (
    <div className="mb-6 ml-14 flex flex-col gap-1.5">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <div
            key={step.id}
            className={`flex items-center gap-2.5 text-sm transition-all duration-500 ${
              step.status === "pending"
                ? "opacity-25"
                : step.status === "active"
                ? "opacity-100"
                : "opacity-60"
            }`}
          >
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
                step.status === "active"
                  ? "bg-amber-100 text-amber-600"
                  : step.status === "done"
                  ? "bg-emerald-50 text-emerald-500"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.status === "active" ? (
                <Icon className="h-3.5 w-3.5 animate-pulse" />
              ) : step.status === "done" ? (
                <SealCheck className="h-2.5 w-2.5" weight="fill" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>
            <span
              className={`text-xs ${
                step.status === "active"
                  ? "font-medium text-amber-700"
                  : step.status === "done"
                  ? "text-slate-500 line-through decoration-slate-300"
                  : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
            {step.status === "active" && (
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KnowledgePanel({ isActive, query }: { isActive: boolean; query: string }) {
  const [tick, setTick] = useState(0);
  const [nodePositions, setNodePositions] = useState([
    { x: 50, y: 48 }, // hub
    { x: 50, y: 14 }, { x: 78, y: 28 }, { x: 84, y: 58 }, { x: 68, y: 80 },
    { x: 36, y: 84 }, { x: 18, y: 65 }, { x: 14, y: 36 }, { x: 30, y: 18 },
    { x: 66, y: 16 }, { x: 88, y: 42 },
  ]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setTick((t) => t + 1), 700);
    return () => clearInterval(id);
  }, [isActive]);

  const nodes = [
    { label: "Training\nManual", r: 6, type: "hub", color: "#3C3B6E" },
    { label: "Check-In", r: 3.5, type: "red", color: "#ef4444" },
    { label: "Voter ID", r: 3.5, type: "blue", color: "#3b82f6" },
    { label: "Ballots", r: 3, type: "red", color: "#dc2626" },
    { label: "Provisional", r: 3, type: "blue", color: "#2563eb" },
    { label: "Emergency", r: 3, type: "red", color: "#B22234" },
    { label: "Closing", r: 3, type: "blue", color: "#1d4ed8" },
    { label: "Accessible", r: 3, type: "red", color: "#f87171" },
    { label: "Signage", r: 2.5, type: "blue", color: "#60a5fa" },
    { label: "Hotline", r: 2.5, type: "red", color: "#fca5a5" },
    { label: "AVU", r: 2.5, type: "blue", color: "#93c5fd" },
  ];

  const crossEdges = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1],
    [1, 9], [2, 10], [3, 10], [9, 10],
  ];

  const activeLeafIdx = isActive ? (tick % (nodes.length - 1)) + 1 : -1;

  const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>, idx: number) => {
    e.preventDefault();
    setDragging(idx);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNodePositions((prev) =>
      prev.map((pos, i) => (i === dragging ? { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : pos))
    );
  };

  const handleMouseUp = () => setDragging(null);

  const nodeColor = (n: typeof nodes[0], i: number) => {
    if (i === 0) return isActive ? "#3C3B6E" : "#94a3b8";
    if (i === activeLeafIdx && isActive) return n.color;
    if (hoveredNode === i) return n.color;
    if (!isActive) return "#e2e8f0";
    return n.type === "red" ? "#fca5a5" : "#a5b4fc";
  };

  const edgeColor = (fromIdx: number, toIdx: number) => {
    if (!isActive) return "#e2e8f0";
    if (fromIdx === 0 || toIdx === 0) {
      if (activeLeafIdx === fromIdx || activeLeafIdx === toIdx) return "#fbbf24";
      if (hoveredNode === fromIdx || hoveredNode === toIdx) return "#fcd34d";
      return "#c7d2fe";
    }
    if (hoveredNode === fromIdx || hoveredNode === toIdx) return "#a5b4fc";
    return "#e0e7ff";
  };

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-l border-slate-100 bg-gradient-to-b from-slate-50 to-white transition-all duration-500">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
            isActive ? "bg-blue-900" : "bg-slate-200"
          }`}>
            <Graph className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} weight="bold" />
          </div>
          <p className="text-xs font-bold tracking-tight text-slate-800">Knowledge Graph</p>
          {isActive && (
            <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <p className={`mt-1 text-[10px] font-medium ${
          isActive ? "text-blue-700" : "text-slate-400"
        }`}>
          {isActive ? "Traversing nodes…" : "Idle — ready"}
        </p>
      </div>

      {/* Interactive Draggable Graph */}
      <div className="relative flex-1 overflow-hidden px-1 py-2 select-none" style={{ minHeight: 220 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isActive ? "#4f46e5" : "#94a3b8"} />
              <stop offset="100%" stopColor={isActive ? "#3C3B6E" : "#cbd5e1"} />
            </radialGradient>
            {/* Glowing filters */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Hub spokes */}
          {nodes.slice(1).map((node, i) => (
            <line
              key={`spoke-${i}`}
              x1={nodePositions[0].x}
              y1={nodePositions[0].y}
              x2={nodePositions[i + 1].x}
              y2={nodePositions[i + 1].y}
              stroke={edgeColor(0, i + 1)}
              strokeWidth={activeLeafIdx === i + 1 && isActive ? "1.5" : "0.6"}
              strokeDasharray={isActive ? "3 2" : "0"}
              opacity={activeLeafIdx === i + 1 && isActive ? 1 : isActive ? 0.7 : 0.4}
              style={{ transition: "all 0.3s ease-out" }}
              filter={activeLeafIdx === i + 1 && isActive ? "url(#glow)" : "none"}
            />
          ))}

          {/* Cross edges */}
          {crossEdges.map(([a, b], i) => (
            <line
              key={`cross-${i}`}
              x1={nodePositions[a].x}
              y1={nodePositions[a].y}
              x2={nodePositions[b].x}
              y2={nodePositions[b].y}
              stroke={edgeColor(a, b)}
              strokeWidth="0.5"
              opacity={hoveredNode === a || hoveredNode === b ? 0.8 : isActive ? 0.5 : 0.25}
              style={{ transition: "all 0.4s ease-out" }}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const pos = nodePositions[i];
            const isActiveNode = i === activeLeafIdx && isActive;
            const isHovered = hoveredNode === i;
            
            return (
              <g key={i}>
                {/* Outer breathing glow for active node */}
                {isActiveNode && (
                  <>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={node.r + 4}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1.5"
                      opacity="0.4"
                      filter="url(#strongGlow)"
                      className="animate-[breathing_1.5s_ease-in-out_infinite]"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={node.r + 2}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1"
                      opacity="0.6"
                      className="animate-[breathing_1.5s_ease-in-out_infinite_0.3s]"
                    />
                  </>
                )}
                
                {/* Hover glow */}
                {isHovered && !isActiveNode && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={node.r + 2.5}
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1"
                    opacity="0.5"
                    filter="url(#glow)"
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={node.r}
                  fill={i === 0 ? "url(#hubGrad)" : nodeColor(node, i)}
                  stroke={isActiveNode ? node.color : i === 0 ? (isActive ? "#f59e0b" : "#94a3b8") : "white"}
                  strokeWidth={isActiveNode ? "1.5" : i === 0 ? "1.2" : "0.8"}
                  style={{ 
                    transition: "all 0.3s ease-out",
                    cursor: dragging === i ? "grabbing" : "grab"
                  }}
                  filter={isActiveNode ? "url(#strongGlow)" : isHovered ? "url(#glow)" : "none"}
                  onMouseDown={(e) => handleMouseDown(e, i)}
                  onMouseEnter={() => setHoveredNode(i)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={isActiveNode ? "animate-pulse" : ""}
                />

                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y + node.r + 4.5}
                  textAnchor="middle"
                  fontSize={i === 0 ? "4.2" : "3"}
                  fontWeight={i === 0 ? "bold" : isActiveNode ? "600" : "normal"}
                  fill={isActiveNode ? node.color : isActive ? (i === 0 ? "#1e1b4b" : "#475569") : "#94a3b8"}
                  style={{ 
                    transition: "all 0.3s ease-out",
                    pointerEvents: "none",
                    userSelect: "none"
                  }}
                  className={isActiveNode ? "animate-pulse" : ""}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Active query */}
      {query && (
        <div className="mx-3 mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">Query</p>
          <p className="text-xs text-blue-900 line-clamp-2 leading-relaxed">{query}</p>
        </div>
      )}

      {/* Sections */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Sections Loaded</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: "Voter Check-In", color: "bg-red-400" },
            { label: "Voter ID", color: "bg-blue-700" },
            { label: "Provisional Ballots", color: "bg-red-400" },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-2 text-[10px] transition-all duration-300 ${
              isActive ? "text-slate-700" : "text-slate-400"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.color} ${
                isActive ? "opacity-100 animate-pulse" : "opacity-30"
              }`} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: string }) {
  const sectionName = source.replace(/^Poll Worker Training Manual 2026,\s*/, "").trim();
  const anchor = SECTION_LINKS[sectionName] ?? "#";

  return (
    <a
      href={anchor}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm transition-all hover:border-amber-400 hover:bg-amber-100 group"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-700">
        <BookOpen className="h-4 w-4" weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Source Document</p>
        <p className="text-xs font-medium text-amber-900 truncate">Poll Worker Training Manual 2026</p>
        {sectionName && <p className="text-[10px] text-amber-700 truncate">§ {sectionName}</p>}
      </div>
      <CaretRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-0.5" weight="bold" />
    </a>
  );
}

function AIMessage({
  message,
  isStreaming,
  toolSteps,
  fontSize,
}: {
  message: Message;
  isStreaming: boolean;
  toolSteps: ToolStep[];
  fontSize: number;
}) {
  const sourceIdx = message.content.indexOf("📄 Source:");
  const mainText = sourceIdx > -1 ? message.content.slice(0, sourceIdx).trimEnd() : message.content;
  const inlineSource = sourceIdx > -1 ? message.content.slice(sourceIdx + 10).trim() : message.source;
  const showTools = isStreaming && toolSteps.some((s) => s.status !== "pending");

  return (
    <div className="mb-8">
      {/* Sam header row */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full shadow ring-2 ring-amber-200">
          <Image
            src={isStreaming ? "/sam.gif" : "/logo.png"}
            alt="Sam"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">Sam</span>
        {message.cached && !isStreaming && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            <SealCheck className="h-2.5 w-2.5" weight="fill" />
            Verified
          </span>
        )}
      </div>

      {/* Tool-call steps */}
      {showTools && <ToolCallPanel steps={toolSteps} language="en" />}

      {/* Free-flow response text */}
      {mainText && (
        <div className="pl-0">
          <p
            className={`leading-relaxed text-slate-800 whitespace-pre-wrap ${
              isStreaming ? "animate-[breathing_2s_ease-in-out_infinite]" : ""
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {mainText}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-500 align-middle" />
            )}
          </p>

          {/* Source card — show once done */}
          {!isStreaming && inlineSource && <SourceCard source={inlineSource} />}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [toolSteps, setToolSteps] = useState<ToolStep[]>([]);
  const [fontSize, setFontSize] = useState(15);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Animate tool steps sequentially
  const runToolSteps = useCallback(async () => {
    const base = language === "es" ? TOOL_STEPS_ES : TOOL_STEPS_EN;
    const steps: ToolStep[] = base.map((s) => ({ ...s, status: "pending" as const }));
    setToolSteps(steps);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 320));
      setToolSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx < i ? "done" : idx === i ? "active" : "pending",
        }))
      );
      await new Promise((r) => setTimeout(r, 600));
    }
  }, [language]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/ Source:[\s\S]*/, "").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = language === "es" ? "es-ES" : "en-US";
    utt.rate = 0.95;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [language]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    type AnySR = { new(): { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null } };
    const w = window as unknown as { SpeechRecognition?: AnySR; webkitSpeechRecognition?: AnySR };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = language === "es" ? "es-ES" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: Object.keys(e.results).length })
        .map((_, i) => e.results[i][0].transcript)
        .join("");
      setInput(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, [isListening, language]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setCurrentQuery(trimmed);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsLoading(true);
      setStreamingId(assistantId);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // Run tool steps while waiting for first token
      runToolSteps();

      try {
        console.log("🚀 [Client] Sending message:", trimmed);
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, language, conversationHistory: history }),
        });

        console.log("📡 [Client] Response received, status:", res.status);
        if (!res.body) throw new Error("No body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let finalSource = "";
        let finalCached = false;
        let chunkCount = 0;

        console.log("🌊 [Client] Starting to read stream...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("✅ [Client] Stream done");
            break;
          }
          const lines = decoder.decode(value, { stream: true }).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.delta) {
                chunkCount++;
                accumulated += parsed.delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
                );
                if (chunkCount % 20 === 0) {
                  console.log(`📦 [Client] ${chunkCount} chunks, ${accumulated.length} chars`);
                }
              }
              if (parsed.done) {
                finalSource = parsed.source ?? "";
                finalCached = parsed.cached ?? false;
                if (parsed.content) accumulated = parsed.content;
                console.log("🏁 [Client] Done event received, source:", finalSource);
              }
            } catch (e) {
              console.warn("⚠️ [Client] Failed to parse line:", line, e);
            }
          }
        }

        console.log(`✅ [Client] Final accumulated: ${accumulated.length} chars`);
        console.log("📄 [Client] Final source:", finalSource);

        // Mark all tool steps done
        setToolSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: accumulated, source: finalSource, cached: finalCached }
              : m
          )
        );

        // Auto-speak if TTS was active
        const clean = accumulated.replace(/📄 Source:[\s\S]*/, "").trim();
        if (isSpeaking) speak(clean);
      } catch (err) {
        console.error("❌ [Client] Error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
        setToolSteps([]);
      } finally {
        setIsLoading(false);
        setStreamingId(null);
        setCurrentQuery("");
      }
    },
    [isLoading, language, messages, runToolSteps, isSpeaking, speak]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const suggested = language === "es" ? SUGGESTED_ES : SUGGESTED_EN;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full font-[family-name:var(--font-inter)]">
      {/* ── Main Chat Column ── */}
      <div className="flex flex-1 flex-col bg-[#f8f7f5] min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full shadow-md ring-2 ring-amber-300">
              <Image src="/logo.png" alt="CivIQ" fill className="object-contain" unoptimized />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Ask Sam</p>
              <p className="text-xs text-slate-500">Poll Worker AI Assistant · {language === "en" ? "English" : "Español"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size */}
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-800 transition"
              title="Decrease font size"
            >
              <MagnifyingGlassMinus className="h-4 w-4" weight="bold" />
            </button>
            <span className="text-xs text-slate-400 w-7 text-center">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-800 transition"
              title="Increase font size"
            >
              <MagnifyingGlassPlus className="h-4 w-4" weight="bold" />
            </button>

            {/* TTS */}
            <button
              onClick={isSpeaking ? stopSpeaking : () => {
                const last = [...messages].reverse().find((m) => m.role === "assistant");
                if (last) speak(last.content);
              }}
              className={`rounded-xl border p-1.5 transition ${
                isSpeaking
                  ? "border-amber-300 bg-amber-50 text-amber-600"
                  : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
              }`}
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <SpeakerSlash className="h-4 w-4" weight="fill" /> : <SpeakerHigh className="h-4 w-4" weight="fill" />}
            </button>

            {/* Language */}
            <button
              onClick={() => setLanguage((l) => (l === "en" ? "es" : "en"))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-amber-300 hover:text-amber-700"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === "en" ? "" : ""}
            </button>
          </div>
        </div>

        {/* Messages canvas */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center">
              {/* Hero avatar */}
              <div className="relative mb-6 h-28 w-28 overflow-hidden rounded-full shadow-xl ring-4 ring-amber-100">
                <Image src="/sam.gif" alt="Sam" fill className="object-contain" unoptimized />
              </div>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-medium text-slate-900">
                {language === "en" ? "Hi, I'm Sam." : "Hola, soy Sam."}
              </h2>
              <p className="mt-3 max-w-md text-center leading-relaxed text-slate-500" style={{ fontSize: `${fontSize - 1}px` }}>
                {language === "en"
                  ? "Your AI-powered poll worker assistant. Ask me anything about election day procedures."
                  : "Tu asistente electoral con IA. Pregúntame sobre procedimientos electorales."}
              </p>

              {/* Quick question cards */}
              <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                {suggested.map(({ q, icon: Icon, category }) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="group flex flex-col items-start gap-2 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-blue-800 hover:shadow-lg"
                  >
                    <Icon className="h-5 w-5 text-slate-500 group-hover:text-[#B22234] transition-colors" weight="duotone" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#3C3B6E] group-hover:text-[#B22234] transition-colors">{category}</span>
                    <span className="text-xs leading-snug text-slate-700 group-hover:text-slate-900" style={{ fontSize: `${fontSize - 3}px` }}>
                      {q}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="mb-8 flex justify-end">
                      <div
                        className="max-w-[70%] rounded-3xl rounded-tr-md bg-[#3C3B6E] px-5 py-3.5 text-white shadow-md"
                        style={{ fontSize: `${fontSize}px`, lineHeight: "1.6" }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <AIMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={msg.id === streamingId}
                    toolSteps={msg.id === streamingId ? toolSteps : []}
                    fontSize={fontSize}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-3 rounded-3xl border-2 border-slate-200 bg-white px-5 py-3.5 shadow-md transition-all focus-within:border-blue-800 focus-within:ring-4 focus-within:ring-blue-900/10">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? "🎙 Listening…"
                    : language === "en"
                    ? "Ask about election procedures…"
                    : "Pregunta sobre procedimientos electorales…"
                }
                className="flex-1 resize-none bg-transparent leading-relaxed text-slate-800 placeholder-slate-400 outline-none"
                style={{ maxHeight: "160px", fontSize: `${fontSize}px` }}
                disabled={isLoading}
              />
              <div className="flex items-center gap-2">
                {/* STT */}
                <button
                  onClick={toggleListening}
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl transition ${
                    isListening
                      ? "bg-red-100 text-red-500 animate-pulse"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title={isListening ? "Stop listening" : "Speak your question"}
                >
                  {isListening ? <MicrophoneSlash className="h-4 w-4" weight="fill" /> : <Microphone className="h-4 w-4" weight="fill" />}
                </button>

                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#3C3B6E] text-white shadow-sm transition hover:bg-[#2d2c58] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <PaperPlaneRight className="h-4 w-4" weight="fill" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              {language === "en"
                ? "Sam answers only from official poll worker training documents. · Enter to send, Shift+Enter for new line."
                : "Sam responde solo desde documentos oficiales. · Enter para enviar."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Knowledge Panel ── */}
      <KnowledgePanel isActive={isLoading} query={currentQuery} />
    </div>
  );
}
