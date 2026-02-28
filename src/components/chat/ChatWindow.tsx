"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Language, Message, SourceMeta } from "@/types";
const SourceViewer = dynamic(() => import("./SourceViewer"), { ssr: false });
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

// Icon mapping from string name to component
const iconMap: Record<string, React.ElementType> = {
  Clock,
  IdentificationCard,
  ClipboardText,
  Lightning,
  Wheelchair,
  Prohibit,
  Question: Clock,
};

// Fallback defaults if API fails
const SUGGESTED_EN_DEFAULT = [
  { q: "What time should poll workers arrive?", icon: Clock, category: "Procedures" },
  { q: "What ID do voters need to show?", icon: IdentificationCard, category: "Voter ID" },
  { q: "How do I handle a provisional ballot?", icon: ClipboardText, category: "Ballots" },
  { q: "What if voting equipment breaks?", icon: Lightning, category: "Emergency" },
  { q: "How do I assist a voter with a disability?", icon: Wheelchair, category: "Accessibility" },
  { q: "What are the electioneering rules?", icon: Prohibit, category: "Rules" },
];

const SUGGESTED_ES_DEFAULT = [
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

const FOLLOW_UP_SUGGESTIONS_EN = [
  "Can you explain that in even simpler terms?",
  "What should I do if I'm not sure?",
  "What happens if I make a mistake?",
  "Who should I call for help?",
  "Can you give me an example?",
];

const FOLLOW_UP_SUGGESTIONS_ES = [
  "¿Puedes explicarlo de forma más sencilla?",
  "¿Qué hago si no estoy seguro/a?",
  "¿Qué pasa si cometo un error?",
  "¿A quién llamo para ayuda?",
  "¿Puedes darme un ejemplo?",
];

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

  const SECTIONS = [
    { label: "Welcome & Overview", page: 3 },
    { label: "Before Election Day", page: 4 },
    { label: "Opening the Polls", page: 5 },
    { label: "Voter Check-In", page: 7 },
    { label: "Voter ID Requirements", page: 9 },
    { label: "Ballot Procedures", page: 11 },
    { label: "Provisional Ballots", page: 13 },
    { label: "Accessible Voting", page: 15 },
    { label: "Electioneering Rules", page: 17 },
    { label: "Troubleshooting", page: 18 },
    { label: "Emergency Procedures", page: 20 },
    { label: "Closing the Polls", page: 22 },
    { label: "Post-Election", page: 24 },
  ];

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-all ${
            isActive ? "bg-gradient-to-br from-[#3C3B6E] to-indigo-700" : "bg-slate-200"
          }`}>
            <Graph className={`h-5 w-5 ${isActive ? "text-amber-300" : "text-slate-400"}`} weight="bold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Knowledge Graph</p>
            <p className={`text-xs font-medium flex items-center gap-1.5 ${
              isActive ? "text-emerald-600" : "text-slate-400"
            }`}>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {isActive ? "Traversing nodes…" : "Idle — ready"}
            </p>
          </div>
        </div>
      </div>

      {/* Active query */}
      {query && (
        <div className="mx-4 mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-2.5 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Searching</p>
          <p className="text-xs text-indigo-900 font-medium line-clamp-2 leading-relaxed">&ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Interactive Graph — takes most of the space */}
      <div className="relative flex-1 min-h-0 overflow-hidden px-3 py-3 select-none">
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
          {nodes.slice(1).map((_, i) => (
            <line
              key={`spoke-${i}`}
              x1={nodePositions[0].x} y1={nodePositions[0].y}
              x2={nodePositions[i + 1].x} y2={nodePositions[i + 1].y}
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
              x1={nodePositions[a].x} y1={nodePositions[a].y}
              x2={nodePositions[b].x} y2={nodePositions[b].y}
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
                {isActiveNode && (
                  <circle cx={pos.x} cy={pos.y} r={node.r + 3} fill="none" stroke={node.color} strokeWidth="1.5" opacity="0.4" filter="url(#strongGlow)" className="animate-pulse" />
                )}
                {isHovered && !isActiveNode && (
                  <circle cx={pos.x} cy={pos.y} r={node.r + 2.5} fill="none" stroke={node.color} strokeWidth="1" opacity="0.5" filter="url(#glow)" />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={node.r}
                  fill={i === 0 ? "url(#hubGrad)" : nodeColor(node, i)}
                  stroke={isActiveNode ? node.color : i === 0 ? (isActive ? "#f59e0b" : "#94a3b8") : "white"}
                  strokeWidth={isActiveNode ? "1.5" : i === 0 ? "1.2" : "0.8"}
                  style={{ transition: "all 0.3s ease-out", cursor: dragging === i ? "grabbing" : "grab" }}
                  filter={isActiveNode ? "url(#strongGlow)" : isHovered ? "url(#glow)" : "none"}
                  onMouseDown={(e) => handleMouseDown(e, i)}
                  onMouseEnter={() => setHoveredNode(i)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={isActiveNode ? "animate-pulse" : ""}
                />
                <text
                  x={pos.x} y={pos.y + node.r + 4.5}
                  textAnchor="middle"
                  fontSize={i === 0 ? "4.2" : "3"}
                  fontWeight={i === 0 ? "bold" : isActiveNode ? "600" : "normal"}
                  fill={isActiveNode ? node.color : isActive ? (i === 0 ? "#1e1b4b" : "#475569") : "#94a3b8"}
                  style={{ transition: "all 0.3s ease-out", pointerEvents: "none", userSelect: "none" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sections list — scrollable bottom */}
      <div className="border-t border-slate-200 flex-shrink-0 max-h-[40%] overflow-y-auto">
        <div className="px-4 py-3 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {SECTIONS.length} Sections · 19 Pages
          </p>
        </div>
        <div className="px-4 pb-3 flex flex-col gap-0.5">
          {SECTIONS.map((s, i) => (
            <div key={s.label} className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
              isActive ? "hover:bg-indigo-50" : "hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`text-[10px] font-bold w-5 text-center ${
                  isActive ? "text-indigo-500" : "text-slate-300"
                }`}>{i + 1}</span>
                <span className={`text-[11px] font-medium truncate ${
                  isActive ? "text-slate-700" : "text-slate-400"
                }`}>{s.label}</span>
              </div>
              <span className={`text-[10px] flex-shrink-0 ${
                isActive ? "text-slate-400" : "text-slate-300"
              }`}>p.{s.page}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  source,
  sourceMeta,
  onOpenSource,
}: {
  source: string;
  sourceMeta?: SourceMeta[];
  onOpenSource?: (meta: SourceMeta[], index: number) => void;
}) {
  const primaryMeta = sourceMeta?.[0];
  const sectionName = primaryMeta?.sectionTitle ?? source.replace(/^[^,]+,\s*/, "").trim();
  const docName = primaryMeta?.documentName ?? source.split(",")[0]?.trim() ?? "Training Document";
  const pageNum = primaryMeta?.pageNumber;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (sourceMeta && sourceMeta.length > 0 && onOpenSource) {
      onOpenSource(sourceMeta, 0);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="mt-6 w-full text-left inline-flex items-center gap-4 rounded-2xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/80 px-5 py-4 transition-all hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100 hover:-translate-y-1 hover:scale-[1.02] group cursor-pointer backdrop-blur-sm"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
        <BookOpen className="h-6 w-6" weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">📄 View in PDF</p>
        <p className="text-sm font-bold text-amber-900 truncate mb-1">{docName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sectionName && (
            <p className="text-[11px] text-amber-700 truncate max-w-[300px] bg-amber-100/50 px-2 py-0.5 rounded-md">
              § {sectionName.length > 60 ? sectionName.substring(0, 60) + '...' : sectionName}
            </p>
          )}
          {pageNum && (
            <span className="text-[11px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full px-3 py-1 shadow-sm">
              Page {pageNum}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 px-2">
        <CaretRight className="h-5 w-5 text-amber-500 transition-transform group-hover:translate-x-2 group-hover:scale-125" weight="bold" />
        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wide">Open</span>
      </div>
    </button>
  );
}

function AIMessage({
  message,
  isStreaming,
  toolSteps,
  fontSize,
  language,
  onOpenSource,
  onSuggest,
  isLastAssistant,
}: {
  message: Message;
  isStreaming: boolean;
  toolSteps: ToolStep[];
  fontSize: number;
  language: Language;
  onOpenSource: (meta: SourceMeta[], index: number) => void;
  onSuggest: (q: string) => void;
  isLastAssistant: boolean;
}) {
  const sourceIdx = message.content.indexOf("📄 Source:");
  const mainText = sourceIdx > -1 ? message.content.slice(0, sourceIdx).trimEnd() : message.content;
  const inlineSource = sourceIdx > -1 ? message.content.slice(sourceIdx + 10).trim() : message.source;
  const showTools = isStreaming && toolSteps.some((s) => s.status !== "pending");
  const suggestions = language === "es" ? FOLLOW_UP_SUGGESTIONS_ES : FOLLOW_UP_SUGGESTIONS_EN;

  return (
    <div className="mb-8">
      {/* Sam header row */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-amber-200">
          <Image
            src="/logo.jpeg"
            alt="Sam"
            fill
            className="object-cover"
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
      {showTools && <ToolCallPanel steps={toolSteps} language={language} />}

      {/* Free-flow response — no bubble, transparent, like Claude/ChatGPT */}
      {mainText && (
        <div>
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
          {!isStreaming && inlineSource && (
            <SourceCard
              source={inlineSource}
              sourceMeta={message.sourceMeta}
              onOpenSource={onOpenSource}
            />
          )}

          {/* Inline follow-up suggestion chips — subtle, no bubble */}
          {!isStreaming && isLastAssistant && (
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => onSuggest(q)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
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
  const [sourceViewerExpanded, setSourceViewerExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  // Source viewer state
  const [activeSourceMeta, setActiveSourceMeta] = useState<SourceMeta[] | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const [suggestions, setSuggestions] = useState<{ q: string; icon: React.ElementType; category: string }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Fetch dynamic suggestions from API
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("/api/suggestions");
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        const mapped = data.suggestions.map((s: { q: string; category: string; icon: string }) => ({
          q: s.q,
          category: s.category,
          icon: iconMap[s.icon] || Clock,
        }));
        setSuggestions(mapped);
      } catch (err) {
        console.warn("Failed to load dynamic suggestions, using defaults:", err);
        setSuggestions(language === "es" ? SUGGESTED_ES_DEFAULT : SUGGESTED_EN_DEFAULT);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
  }, [language]);

  const handleOpenSource = useCallback((meta: SourceMeta[], index: number) => {
    setActiveSourceMeta(meta);
    setActiveSourceIndex(index);
    setSourceViewerExpanded(true);
  }, []);

  const handleCloseSource = useCallback(() => {
    setActiveSourceMeta(null);
    setActiveSourceIndex(0);
    setSourceViewerExpanded(false);
  }, []);

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
      // Close source viewer so knowledge graph animates during search
      setActiveSourceMeta(null);
      setActiveSourceIndex(0);
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
        let finalSourceMeta: SourceMeta[] | undefined;
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
                finalSourceMeta = parsed.sourceMeta ?? undefined;
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
              ? { ...m, content: accumulated, source: finalSource, cached: finalCached, sourceMeta: finalSourceMeta }
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

  const rawSuggested = suggestions.length > 0 ? suggestions : (language === "es" ? SUGGESTED_ES_DEFAULT : SUGGESTED_EN_DEFAULT);
  const suggested = rawSuggested.filter((s, i, arr) => arr.findIndex(x => x.q === s.q) === i);
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full font-[family-name:var(--font-inter)]">
      {/* ── Main Chat Column ── */}
      <div className="flex flex-1 flex-col bg-[#f8f7f5] min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full shadow-md ring-2 ring-amber-300">
              <Image src="/logo.jpeg" alt="CivIQ" fill className="object-cover" unoptimized />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                Ask Sam
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Poll Worker AI Assistant · {language === "en" ? "English" : "Español"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Font size */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              <button
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="text-slate-500 transition hover:text-slate-800 hover:scale-110"
                title="Decrease font size"
              >
                <MagnifyingGlassMinus className="h-4 w-4" weight="bold" />
              </button>
              <span className="text-xs font-semibold text-slate-700 min-w-[32px] text-center">{fontSize}px</span>
              <button
                onClick={() => setFontSize((s) => Math.min(20, s + 1))}
                className="text-slate-500 transition hover:text-slate-800 hover:scale-110"
                title="Increase font size"
              >
                <MagnifyingGlassPlus className="h-4 w-4" weight="bold" />
              </button>
            </div>

            {/* TTS */}
            <button
              onClick={isSpeaking ? stopSpeaking : () => {
                const last = [...messages].reverse().find((m) => m.role === "assistant");
                if (last) speak(last.content);
              }}
              className={`rounded-xl border p-2 transition-all shadow-sm ${
                isSpeaking
                  ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 shadow-md scale-105"
                  : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:shadow-md hover:scale-105"
              }`}
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <SpeakerSlash className="h-4 w-4" weight="fill" /> : <SpeakerHigh className="h-4 w-4" weight="fill" />}
            </button>

            {/* Language */}
            <button
              onClick={() => setLanguage((l) => (l === "en" ? "es" : "en"))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all shadow-sm hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 hover:shadow-md hover:scale-105"
            >
              <Globe className="h-4 w-4" weight="bold" />
              {language === "en" ? "EN" : "ES"}
            </button>
          </div>
        </div>

        {/* Messages canvas */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center">
              {/* Hero avatar */}
              <div className="relative mb-6 h-28 w-28 overflow-hidden rounded-full shadow-xl ring-4 ring-amber-100">
                <Image src="/sam.gif" alt="Sam" fill className="object-cover" unoptimized />
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
                {suggested.map(({ q, icon: Icon, category }, idx) => (
                  <button
                    key={`${idx}-${q}`}
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
                    <div key={msg.id} className="mb-8 flex justify-end animate-in slide-in-from-right duration-300">
                      <div
                        className="max-w-[75%] rounded-3xl rounded-tr-md bg-gradient-to-br from-[#3C3B6E] to-[#2a2952] px-6 py-4 text-white shadow-lg hover:shadow-xl transition-shadow"
                        style={{ fontSize: `${fontSize}px`, lineHeight: "1.7" }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                const assistantMessages = messages.filter((m) => m.role === "assistant");
                const isLastAssistant = msg === assistantMessages[assistantMessages.length - 1];
                return (
                  <AIMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={msg.id === streamingId}
                    toolSteps={msg.id === streamingId ? toolSteps : []}
                    fontSize={fontSize}
                    language={language}
                    onOpenSource={handleOpenSource}
                    onSuggest={(q) => sendMessage(q)}
                    isLastAssistant={isLastAssistant}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50/50 px-6 py-5 sm:px-10 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-3 rounded-3xl border-2 border-slate-300/50 bg-white px-6 py-4 shadow-lg transition-all focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/20 focus-within:shadow-xl hover:border-slate-400/70">
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
                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      if (isListening) {
                        setIsListening(false);
                        recognitionRef.current?.stop();
                      } else {
                        setIsListening(true);
                      }
                    }}
                    className={`rounded-xl p-2.5 transition-all shadow-sm ${
                      isListening
                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-md hover:scale-105 animate-pulse"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-md hover:scale-105"
                    }`}
                    title={isListening ? "Stop listening" : "Speak your question"}
                  >
                    {isListening ? <MicrophoneSlash className="h-5 w-5" weight="fill" /> : <Microphone className="h-5 w-5" weight="fill" />}
                  </button>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="rounded-xl bg-gradient-to-br from-[#3C3B6E] to-[#2a2952] p-2.5 text-white transition-all hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 shadow-md"
                    title="Send message"
                  >
                    <PaperPlaneRight className="h-5 w-5" weight="fill" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              {language === "en"
                ? "Sam answers only from official poll worker training documents. · Enter to send, Shift+Enter for new line."
                : "Sam responde solo desde documentos oficiales. · Enter para enviar."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Knowledge Graph + Expandable Source Viewer ── */}
      <div className={`relative transition-all duration-500 ease-in-out ${
        sourceViewerExpanded ? 'w-[55%]' : 'w-[380px]'
      } border-l border-slate-200 bg-white shadow-2xl flex flex-col`}>
        {activeSourceMeta ? (
          <>
            {/* Collapse/Expand Toggle */}
            <button
              onClick={() => setSourceViewerExpanded(!sourceViewerExpanded)}
              className="absolute -left-10 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
              title={sourceViewerExpanded ? "Collapse viewer" : "Expand viewer"}
            >
              <CaretRight className={`h-5 w-5 transition-transform duration-300 ${
                sourceViewerExpanded ? 'rotate-180' : ''
              }`} weight="bold" />
            </button>
            <SourceViewer
              sourceMeta={activeSourceMeta}
              activeIndex={activeSourceIndex}
              onClose={handleCloseSource}
              onSelectSource={setActiveSourceIndex}
            />
          </>
        ) : (
          <KnowledgePanel isActive={isLoading} query={currentQuery} />
        )}
      </div>
    </div>
  );
}
