import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { isOllamaAvailable, ollamaStream, OLLAMA_MODEL } from "@/lib/ollama";
import { getRAGContext, buildRAGSystemPrompt, detectNavigationIntent } from "@/lib/system-prompt-rag";
import { getCachedResponse, setCachedResponse } from "@/lib/response-cache";
import { logInteraction } from "@/lib/audit-logger";
import { ChatRequest } from "@/types";
import { GROQ_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  console.log("🚀 [API] Chat route called");
  
  try {
    const body: ChatRequest = await req.json();
    const { message, language = "en", conversationHistory = [] } = body;
    console.log("📝 [API] Received message:", message);
    console.log("🌐 [API] Language:", language);
    console.log("💬 [API] History length:", conversationHistory.length);

    if (!message?.trim()) {
      console.error("❌ [API] Empty message received");
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check cache first — return as a single JSON chunk with cached flag
    const cached = getCachedResponse(message);
    if (cached) {
      console.log("✅ [API] Cache hit! Returning cached response");
      logInteraction({
        userType: "poll_worker",
        question: message,
        response: cached.response,
        sourceDoc: cached.source,
        language,
        cached: true,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: cached.response, source: cached.source, sourceMeta: cached.sourceMeta, cached: true, done: true })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Check for navigation intent
    const navIntent = detectNavigationIntent(message);
    if (navIntent) {
      console.log("🧭 [API] Navigation intent detected:", navIntent.path);
    }

    // Get RAG context from knowledge base
    const { context: ragContext, sourceMeta } = await getRAGContext(message);
    console.log("📚 [API] RAG context length:", ragContext.length);

    const systemPrompt = buildRAGSystemPrompt(language, ragContext, true);
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    // ── Try Ollama (local) first ───────────────────────────────────────────────
    const useOllama = await isOllamaAvailable();
    console.log(`🤖 [API] LLM backend: ${useOllama ? `Ollama (${OLLAMA_MODEL})` : `Groq (${GROQ_MODEL})`}`);

    const encoder = new TextEncoder();
    let fullContent = "";

    if (useOllama) {
      const ollamaReadable = await ollamaStream(chatMessages, { maxTokens: 512, temperature: 0.1 });

      if (ollamaReadable) {
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const reader = ollamaReadable.getReader();
              while (true) {
                const { done, value: delta } = await reader.read();
                if (done) break;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              }
              const sourceMatch = fullContent.match(/📄 Source:\s*(.+)$/m);
              const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";
              setCachedResponse(message, fullContent, source, sourceMeta);
              logInteraction({ userType: "poll_worker", question: message, response: fullContent, sourceDoc: source, language, cached: false });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta })}\n\n`));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      }
      console.warn("⚠️ [API] Ollama stream failed — falling back to Groq");
    }

    // ── Groq fallback ─────────────────────────────────────────────────────────
    console.log("� [API] GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
    const groq = getGroqClient();
    const groqStream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: chatMessages,
      temperature: 0.1,
      max_tokens: 512,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
          const sourceMatch = fullContent.match(/📄 Source:\s*(.+)$/m);
          const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";
          setCachedResponse(message, fullContent, source, sourceMeta);
          logInteraction({ userType: "poll_worker", question: message, response: fullContent, sourceDoc: source, language, cached: false });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta })}\n\n`));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("❌ [API] Fatal error in chat route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
