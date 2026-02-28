import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { isOllamaAvailable, ollamaComplete } from "@/lib/ollama";
import { getRAGContext, buildRAGSystemPrompt } from "@/lib/system-prompt-rag";
import { getCachedResponse, setCachedResponse } from "@/lib/response-cache";
import { logInteraction } from "@/lib/audit-logger";
import { GROQ_MODEL } from "@/lib/constants";
import { Language } from "@/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    question,
    language = "en",
    action = "ask",
    userType = "official",
    response: approvedResponse,
    source: approvedSource,
  } = body as {
    question: string;
    language: Language;
    action?: "ask" | "approve" | "flag";
    userType?: "poll_worker" | "official";
    response?: string;
    source?: string;
  };

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  // Action: approve — cache the response so poll workers get it instantly
  if (action === "approve" && approvedResponse) {
    const source = approvedSource ?? "Poll Worker Training Manual 2026";
    setCachedResponse(question, approvedResponse, source);
    logInteraction({
      userType,
      question,
      response: approvedResponse,
      sourceDoc: source,
      language,
      cached: false,
    });
    return NextResponse.json({
      response: approvedResponse,
      source,
      confidence: 1.0,
      cached: true,
      approved: true,
    });
  }

  // Action: flag — log as flagged for review
  if (action === "flag" && approvedResponse) {
    logInteraction({
      userType,
      question,
      response: approvedResponse,
      sourceDoc: approvedSource ?? "Poll Worker Training Manual 2026",
      language,
      flagged: true,
      cached: false,
    });
    return NextResponse.json({ flagged: true });
  }

  // Action: ask (default) — query the AI
  const cached = getCachedResponse(question);
  if (cached) {
    return NextResponse.json({
      response: cached.response,
      source: cached.source,
      confidence: 1.0,
      cached: true,
    });
  }

  const { context: ragContext } = await getRAGContext(question);
  const systemPrompt = buildRAGSystemPrompt(language, ragContext, true);
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: question },
  ];

  // Primary: local Ollama (smaller, faster model for AI Center testing)
  let response: string | null = null;
  const ollamaUp = await isOllamaAvailable();
  if (ollamaUp) {
    response = await ollamaComplete(messages, { maxTokens: 512, temperature: 0.1 });
  }

  // Fallback: Groq cloud if Ollama unavailable or failed
  if (!response) {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 512,
    });
    response = completion.choices[0]?.message?.content ?? "";
  }

  const sourceMatch = response.match(/📄 Source:\s*(.+)$/m);
  const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";

  logInteraction({
    userType,
    question,
    response,
    sourceDoc: source,
    language,
    cached: false,
  });

  return NextResponse.json({ response, source, confidence: 0.95, cached: false });
}
