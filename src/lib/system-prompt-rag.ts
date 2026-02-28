// Created by Sankritya on Feb 27, 2026
// RAG-enhanced system prompt builder
// Pulls relevant context from the knowledge base before sending to the LLM

import { Language } from "@/types";
import { retrieve } from "./rag-retriever";
import { KBSearchResult } from "./knowledge-base";

// ─── Navigation Map (for Crow-like assistant) ───────────────────────────────

export const NAVIGATION_MAP = [
  {
    path: "/dashboard",
    label: "Dashboard",
    description: "Main overview with KPIs, recruitment funnel, pipeline, coverage maps, AI status, and recent activity.",
    keywords: ["dashboard", "overview", "home", "stats", "kpi", "metrics", "analytics"],
  },
  {
    path: "/dashboard/documents",
    label: "Training Documents",
    description: "Upload and manage training documents that Sam learns from. View active/inactive docs, word counts, and sections.",
    keywords: ["documents", "training", "upload", "manual", "knowledge", "pdf", "docs"],
  },
  {
    path: "/dashboard/test",
    label: "AI Command Center",
    description: "Test Sam's AI responses, review and approve/flag them, view audit metrics, and monitor AI performance all in one place.",
    keywords: ["test", "ai", "chat", "sam", "response", "approve", "flag", "audit", "command center"],
  },
  {
    path: "/dashboard/recruit",
    label: "Poll Worker Recruitment",
    description: "AI-scored candidate search from voter registration database. Filter by age, location, languages. Export shortlists as CSV.",
    keywords: ["recruit", "candidates", "poll worker", "hire", "search", "bilingual", "export"],
  },
  {
    path: "/dashboard/audit",
    label: "Audit Log",
    description: "Complete log of all AI interactions. Filter by user type, language, flagged status. Export to CSV for compliance.",
    keywords: ["audit", "log", "history", "interactions", "compliance", "export", "flagged"],
  },
  {
    path: "/chat",
    label: "Ask Sam (Poll Worker Chat)",
    description: "The poll worker-facing chat interface where Sam answers election day questions in real-time.",
    keywords: ["chat", "ask", "poll worker", "question", "sam"],
  },
];

// ─── Build RAG Context ──────────────────────────────────────────────────────

export interface SourceMeta {
  documentId: string;
  documentName: string;
  sectionTitle: string;
  sectionIndex: number;
  pageNumber: number;
  chunkContent: string;
  score: number;
}

export async function getRAGContext(query: string): Promise<{ context: string; sources: string[]; results: KBSearchResult[]; sourceMeta: SourceMeta[] }> {
  const { sourceMeta, context } = await retrieve(query, 10);

  if (sourceMeta.length === 0) {
    return { context: "", sources: [], results: [], sourceMeta: [] };
  }

  const sources = [...new Set(sourceMeta.map((m) => `${m.documentName}, ${m.sectionTitle}`))];

  // results kept as empty array — callers only use sourceMeta and context
  return { context, sources, results: [], sourceMeta };
}

// ─── Detect Navigation Intent ───────────────────────────────────────────────

export interface NavigationIntent {
  detected: boolean;
  path: string;
  label: string;
  description: string;
}

export function detectNavigationIntent(query: string): NavigationIntent | null {
  const lower = query.toLowerCase();

  // Direct navigation requests
  const navPhrases = ["take me to", "go to", "show me", "open", "navigate to", "where is", "how do i find", "where can i"];
  const isNavRequest = navPhrases.some((p) => lower.includes(p));

  if (!isNavRequest) return null;

  let bestMatch: (typeof NAVIGATION_MAP)[0] | null = null;
  let bestScore = 0;

  for (const entry of NAVIGATION_MAP) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      detected: true,
      path: bestMatch.path,
      label: bestMatch.label,
      description: bestMatch.description,
    };
  }

  return null;
}

// ─── Build Enhanced System Prompt ───────────────────────────────────────────

export function buildRAGSystemPrompt(language: Language, ragContext: string, isRecruiterDashboard: boolean): string {
  const outOfScope = language === "es"
    ? "Solo puedo ayudar con procedimientos electorales y capacitación de trabajadores electorales. Por favor, contacte a su supervisor electoral para otras preguntas."
    : "I can only help with election procedures and poll worker training. Please contact your election supervisor for other questions.";

  // Passages come FIRST so the model reads source text before generating
  const passagesSection = ragContext
    ? `TRAINING MANUAL PASSAGES — read these carefully before answering:

${ragContext}

---`
    : "";

  const noPassages = !ragContext
    ? `No relevant passages found. Say: "That's not covered in the training materials — please ask your supervisor."`
    : "";

  return `${passagesSection}

You are Sam, a poll worker training assistant. ${noPassages}

STRICT RULES:
- Your answer must be grounded in the passages above. Every number, time, name, or specific term you write must appear in the passages.
- Do NOT use your training knowledge. If you think you know the answer but it is not in the passages, say "That's not covered in the training materials — please ask your supervisor."
- No political opinions, candidate recommendations, or voting advice.
- For non-election questions: "${outOfScope}"
- End with: "${language === "es" ? "📄 Fuente: [Nombre del Documento], [Título de la Sección]" : "📄 Source: [Document Name], [Section Title]"}"
${language === "es" ? "- Respond entirely in Spanish." : ""}

Answer concisely (under 80 words unless steps are needed). Use the exact wording from the passages for key facts.`;
}
