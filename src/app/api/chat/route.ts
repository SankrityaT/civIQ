import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { getCachedResponse, setCachedResponse } from "@/lib/response-cache";
import { logInteraction } from "@/lib/audit-logger";
import { ChatRequest } from "@/types";
import { GROQ_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();
  const { message, language = "en", conversationHistory = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Check cache first
  const cached = getCachedResponse(message);
  if (cached) {
    logInteraction({
      userType: "poll_worker",
      question: message,
      response: cached.response,
      sourceDoc: cached.source,
      language,
      cached: true,
    });
    return NextResponse.json({
      content: cached.response,
      source: cached.source,
      cached: true,
    });
  }

  // TODO: implement streaming — non-streaming for skeleton
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(language) },
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });

  const content = completion.choices[0]?.message?.content ?? "";

  // Extract source from response (everything after "📄 Source:")
  const sourceMatch = content.match(/📄 Source:\s*(.+)$/m);
  const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";

  setCachedResponse(message, content, source);
  logInteraction({
    userType: "poll_worker",
    question: message,
    response: content,
    sourceDoc: source,
    language,
    cached: false,
  });

  return NextResponse.json({ content, source, cached: false });
}
