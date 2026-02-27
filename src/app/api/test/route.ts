import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { getCachedResponse, setCachedResponse } from "@/lib/response-cache";
import { logInteraction } from "@/lib/audit-logger";
import { TestRequest } from "@/types";
import { GROQ_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body: TestRequest = await req.json();
  const { question, language = "en" } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const cached = getCachedResponse(question);
  if (cached) {
    return NextResponse.json({
      response: cached.response,
      source: cached.source,
      confidence: 1.0,
      cached: true,
    });
  }

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(language) },
      { role: "user", content: question },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });

  const response = completion.choices[0]?.message?.content ?? "";
  const sourceMatch = response.match(/📄 Source:\s*(.+)$/m);
  const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";

  setCachedResponse(question, response, source);
  logInteraction({
    userType: "official",
    question,
    response,
    sourceDoc: source,
    language,
    cached: false,
  });

  return NextResponse.json({ response, source, confidence: 0.95, cached: false });
}
