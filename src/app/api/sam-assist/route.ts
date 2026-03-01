// Created by Sankritya on Feb 27, 2026
// Sam Assistant API — Dashboard assistant for election officials only
// Handles navigation, feature explanations, and dashboard-specific Q&A
// Does NOT pull poll worker training RAG context — that is for /api/chat only

import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { detectNavigationIntent, NAVIGATION_MAP } from "@/lib/system-prompt-rag";
import { GROQ_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentPath, pageContext } = body as { message: string; currentPath?: string; pageContext?: Record<string, unknown> };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check for navigation intent first
    const navIntent = detectNavigationIntent(message);

    // Build dashboard-only system prompt with live page context
    const systemPrompt = buildDashboardPrompt(currentPath ?? "/dashboard", pageContext ?? {});

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const response = completion.choices[0]?.message?.content ?? "I'm not sure how to help with that. Try asking about the dashboard features or navigation!";

    // Detect if the AI response suggests navigation
    const navigationLink = extractNavigationFromResponse(response) ?? (navIntent ? { path: navIntent.path, label: navIntent.label } : null);

    return NextResponse.json({
      response: cleanResponse(response),
      navigation: navigationLink,
      sources: [],
    });
  } catch (error) {
    console.error("[Sam Assist] Error:", error);
    return NextResponse.json({
      response: "Sorry, I ran into an issue. Try asking me again!",
      navigation: null,
      sources: [],
    });
  }
}

function buildDashboardPrompt(currentPath: string, pageContext: Record<string, unknown> = {}): string {
  const currentPage = NAVIGATION_MAP.find((n) => n.path === currentPath);

  // Build a live context summary from whatever data the frontend sent
  let liveData = "";
  if (pageContext.docCount !== undefined) liveData += `\n- Documents indexed: ${pageContext.docCount}`;
  if (pageContext.candidateCount !== undefined) liveData += `\n- Scored candidates: ${pageContext.candidateCount}`;
  if (pageContext.candidates !== undefined) liveData += `\n- Total candidates in DB: ${pageContext.candidates}`;
  if (pageContext.eligible !== undefined) liveData += `\n- Eligible candidates: ${pageContext.eligible}`;
  if (pageContext.auditCount !== undefined) liveData += `\n- Audit log entries: ${pageContext.auditCount}`;
  if (Array.isArray(pageContext.documents) && pageContext.documents.length > 0) {
    const names = (pageContext.documents as {name: string}[]).map(d => d.name).join(", ");
    liveData += `\n- Uploaded documents: ${names}`;
  }

  return `You are Sam, the CivIQ AI assistant for election officials. You help officials use the CivIQ dashboard — you do NOT answer poll worker training questions (those are for the /chat page).

CURRENT PAGE: ${currentPage?.label ?? "Dashboard"} (${currentPath})${liveData ? `\nLIVE PAGE DATA:${liveData}` : ""}

YOUR JOB:
1. Navigate officials to the right dashboard page
2. Explain how dashboard features work
3. Help officials understand their live metrics (use the LIVE PAGE DATA above when answering)
4. If someone asks a poll worker training question, redirect them to the Sam Chat at /chat

DASHBOARD PAGES:
- /dashboard — Main overview: KPIs (documents indexed, poll workers recruited, interactions today, AI accuracy), recent activity feed, quick links
- /dashboard/documents — Upload and manage training PDFs. Sam ingests them into the knowledge graph. Shows word count, sections, active/inactive status
- /dashboard/ai-center — Knowledge graph visualization showing how concepts are connected across documents
- /dashboard/recruit — AI-scored poll worker candidates from voter registration data. Two-pass scoring: rule-based first, then Ollama AI enrichment. Filter by city, precinct, language, experience. Export CSV
- /dashboard/audit — Every Sam interaction logged with timestamp, question, answer, source, language (EN/ES), and whether it was cached

NAVIGATION FORMAT:
When directing a user to a page: "🔗 Navigate: [Page Name](path)"
Example: "🔗 Navigate: Recruitment(/dashboard/recruit)"

RULES:
- Keep responses under 120 words
- Be concise and direct — officials are busy
- Use emojis sparingly
- If asked about poll worker procedures (voter ID, ballots, opening/closing): say "That's a poll worker question — Sam Chat at /chat has the answer!" and include 🔗 Navigate: Sam Chat(/chat)
- Never give political opinions or legal interpretations
- Available pages: ${NAVIGATION_MAP.map((n) => `${n.label} (${n.path})`).join(", ")}
`;
}

function extractNavigationFromResponse(response: string): { path: string; label: string } | null {
  const navMatch = response.match(/🔗\s*Navigate:\s*(.+?)\((.+?)\)/);
  if (navMatch) {
    return { label: navMatch[1].trim(), path: navMatch[2].trim() };
  }
  return null;
}

function cleanResponse(response: string): string {
  return response.replace(/🔗\s*Navigate:\s*.+?\(.+?\)\n?/g, "").trim();
}

