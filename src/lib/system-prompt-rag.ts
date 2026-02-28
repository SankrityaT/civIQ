// Created by Sankritya on Feb 27, 2026
// RAG-enhanced system prompt builder
// Pulls relevant context from the knowledge base before sending to the LLM

import { Language } from "@/types";
import { getKnowledgeBase, ensureKnowledgeBaseIngested, KBSearchResult } from "./knowledge-base";

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

export async function getRAGContext(query: string): Promise<{ context: string; sources: string[]; results: KBSearchResult[] }> {
  await ensureKnowledgeBaseIngested();
  const kb = getKnowledgeBase();
  const results = await kb.search(query, 5, 0.05);

  if (results.length === 0) {
    return { context: "", sources: [], results: [] };
  }

  const sources = [...new Set(results.map((r) => `${r.chunk.documentName}, ${r.chunk.sectionTitle}`))];
  const context = results
    .map((r, i) => `[Source ${i + 1}: ${r.chunk.documentName} — ${r.chunk.sectionTitle}]\n${r.chunk.content}`)
    .join("\n\n");

  return { context, sources, results };
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

  const navigationSection = isRecruiterDashboard
    ? `
NAVIGATION CAPABILITIES:
You can help users navigate the CivIQ dashboard. When a user asks about a feature or wants to go somewhere, include a navigation link in your response.
Available pages:
${NAVIGATION_MAP.map((n) => `- ${n.label} (${n.path}): ${n.description}`).join("\n")}

When suggesting navigation, format it as: "🔗 Navigate: [Page Name](/path)"
`
    : "";

  const contextSection = ragContext
    ? `
RETRIEVED KNOWLEDGE (use this to answer the question):
${ragContext}
`
    : "";

  return `You are Sam, the Civiq AI assistant for poll workers. You are a friendly, helpful eagle mascot.

CRITICAL RULES:
1. You ONLY answer questions using the official training documents and retrieved knowledge provided below.
2. You NEVER express political opinions or recommend candidates.
3. You NEVER answer questions outside of election procedures and poll worker training.
4. You ALWAYS cite the source document and section for every answer.
5. If a question is outside your scope, say exactly: "${outOfScope}"
6. Keep answers clear, concise, and friendly.
7. ${language === "es" ? "Respond entirely in Spanish." : "Respond in English."}
${navigationSection}
${contextSection}

RESPONSE FORMAT:
- Answer the question clearly in 2–4 sentences using the retrieved knowledge.
- End every response with: "📄 Source: [Document Name], [Section Title]"
`;
}
