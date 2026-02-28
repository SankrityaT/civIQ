// Created by Sankritya on Feb 27, 2026
// Sam Assistant API — Crow-like assistant that navigates users and answers questions

import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { getRAGContext, buildRAGSystemPrompt, detectNavigationIntent, NAVIGATION_MAP } from "@/lib/system-prompt-rag";
import { GROQ_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentPath } = body as { message: string; currentPath?: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check for navigation intent first
    const navIntent = detectNavigationIntent(message);

    // Get RAG context for knowledge-based answers
    const { context: ragContext, sources } = await getRAGContext(message);

    // Build an assistant-specific system prompt
    const systemPrompt = buildAssistantPrompt(currentPath ?? "/dashboard", ragContext);

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

    const response = completion.choices[0]?.message?.content ?? "I'm not sure how to help with that. Try asking about poll worker training or dashboard features!";

    // Detect if the AI response suggests navigation
    const navigationLink = extractNavigationFromResponse(response) ?? (navIntent ? { path: navIntent.path, label: navIntent.label } : null);

    return NextResponse.json({
      response: cleanResponse(response),
      navigation: navigationLink,
      sources: sources.slice(0, 3),
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

function buildAssistantPrompt(currentPath: string, ragContext: string): string {
  const currentPage = NAVIGATION_MAP.find((n) => n.path === currentPath);

  return `You are Sam, the CivIQ AI assistant embedded in the election official's dashboard. You are helpful, concise, and friendly.

YOUR CAPABILITIES:
1. Navigate users to any page in the dashboard
2. Explain how features work (recruitment AI scoring, document management, audit logs, AI testing)
3. Answer questions about poll worker training using the knowledge base
4. Help officials understand metrics and data

CURRENT CONTEXT:
- User is currently on: ${currentPage?.label ?? "Dashboard"} (${currentPath})
- Available pages: ${NAVIGATION_MAP.map((n) => `${n.label} (${n.path})`).join(", ")}

NAVIGATION FORMAT:
When suggesting the user go to a page, include: "🔗 Navigate: [Page Name](path)"
Example: "🔗 Navigate: Training Documents(/dashboard/documents)"

DASHBOARD FEATURES:
- **Dashboard** (/dashboard): KPIs, recruitment funnel, pipeline, coverage by area, AI status, recent activity
- **Training Documents** (/dashboard/documents): Upload/manage docs that Sam learns from. Supports PDF ingestion, word count tracking, section analysis
- **AI Command Center** (/dashboard/test): Test AI responses, approve/flag them, view audit metrics, knowledge base stats, embedding graph visualization
- **Recruitment** (/dashboard/recruit): AI-scored candidates from voter registration DB. Filter by age, location, languages. Export CSV shortlists
- **Audit Log** (/dashboard/audit): Full interaction history, filter by user/language/flags, CSV export for compliance

${ragContext ? `KNOWLEDGE BASE CONTEXT:\n${ragContext}` : ""}

RULES:
- Keep responses under 150 words
- Be conversational and use emojis sparingly
- When answering training questions, cite the source
- When suggesting navigation, always include the 🔗 Navigate format
- Never give political opinions
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
  // Remove the navigation link format from the displayed text (it's handled separately as a button)
  return response.replace(/🔗\s*Navigate:\s*.+?\(.+?\)\n?/g, "").trim();
}
