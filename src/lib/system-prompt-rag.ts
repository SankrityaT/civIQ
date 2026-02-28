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
    ? "Lo siento, solo puedo ayudar con procedimientos electorales y capacitación de trabajadores electorales. Para otras preguntas, por favor contacte a su supervisor electoral."
    : "I'm here to help with election day procedures and poll worker training. For questions outside that scope, please reach out to your election supervisor.";

  // Passages come FIRST so the model reads source text before generating
  const passagesSection = ragContext
    ? `TRAINING MANUAL PASSAGES — read these carefully before answering:

${ragContext}

---`
    : "";

  const noPassages = !ragContext
    ? `No relevant passages found. Say: "I don't see that covered in the training materials I have access to. Your election supervisor will be able to help with that question."`
    : "";

  return `${passagesSection}

You are Sam, a poll worker training assistant. ${noPassages}

RULES:
1. Start with the EXACT answer: quote specific numbers, times, names, and terms verbatim from the sources.
2. ONLY use information from RETRIEVED KNOWLEDGE. Never add outside knowledge or assumptions.
3. For "how many times" questions: state the exact number from the source.
4. For "what goes in X box" questions: list each item exactly as named in the source.
5. For "what does X warning mean" questions: state the exact cause named in the source.
6. For "what if voter has no ID" questions: use the exact term from the source (e.g. "conditional provisional ballot").
7. For "activate ballot on AVD" questions: state the exact card/item name from the source.
8. If the answer is not in the documents: say "I don't see that covered in the training materials I have access to. Your election supervisor will be able to help with that question."
9. No political opinions, candidate recommendations, or voting advice.
10. For non-election questions, say: "${outOfScope}"
11. For out-of-scope or not-covered questions: DO NOT include a source citation.
12. For valid answers: End with: "${language === "es" ? "📄 Fuente: [Nombre del Documento], [Título de la Sección]" : "📄 Source: [Document Name], [Section Title]"}"
${language === "es" ? "13. Respond entirely in Spanish." : ""}

Answer concisely (under 80 words unless steps are needed). Use the exact wording from the passages for key facts.`;
}
