import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
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

    console.log("🔄 [API] No cache, calling Groq API...");
    console.log("🔑 [API] GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
    console.log("🤖 [API] Model:", GROQ_MODEL);

    // Check for navigation intent
    const navIntent = detectNavigationIntent(message);
    if (navIntent) {
      console.log("🧭 [API] Navigation intent detected:", navIntent.path);
    }

    // Get RAG context from knowledge base
    const { context: ragContext, sourceMeta } = await getRAGContext(message);
    console.log("📚 [API] RAG context length:", ragContext.length);

    // Streaming response via Groq
    const groq = getGroqClient();
    console.log("🔧 [API] Groq client initialized");
    
    const groqStream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildRAGSystemPrompt(language, ragContext, true) },
        ...conversationHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      temperature: 0.1,
      max_tokens: 512,
      stream: true,
    });
    console.log("✅ [API] Groq stream created successfully");

    const encoder = new TextEncoder();
    let fullContent = "";
    let chunkCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("🌊 [API] Starting stream processing...");
          for await (const chunk of groqStream) {
            chunkCount++;
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
              );
              if (chunkCount % 10 === 0) {
                console.log(`📦 [API] Processed ${chunkCount} chunks, ${fullContent.length} chars`);
              }
            }
          }

          console.log(`✅ [API] Stream complete! Total chunks: ${chunkCount}, chars: ${fullContent.length}`);

          // Extract source and finalize
          const sourceMatch = fullContent.match(/📄 Source:\s*(.+)$/m);
          const source = sourceMatch?.[1]?.trim() ?? "Poll Worker Training Manual 2026";
          console.log("📄 [API] Extracted source:", source);
          // Keep sourceMeta in retrieval-rank order.
          // LLM-cited section text can drift from retrieved evidence and lead to wrong PDF pages.

          setCachedResponse(message, fullContent, source, sourceMeta);
          logInteraction({
            userType: "poll_worker",
            question: message,
            response: fullContent,
            sourceDoc: source,
            language,
            cached: false,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta })}\n\n`)
          );
          controller.close();
          console.log("🏁 [API] Response stream closed successfully");
        } catch (streamError) {
          console.error("❌ [API] Stream processing error:", streamError);
          controller.error(streamError);
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
