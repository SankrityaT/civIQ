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

    // ── Prompt injection guard ─────────────────────────────────────────────────
    const INJECTION_PATTERNS = /ignore\s+(all\s+)?previous\s+instructions|you\s+are\s+now|forget\s+(all\s+)?your\s+rules|new\s+system\s+prompt|disregard\s+(all\s+)?prior|act\s+as\s+(?:a\s+)?(?:different|general|new)|reveal\s+(?:your\s+)?(?:system|instructions)/i;
    if (INJECTION_PATTERNS.test(message)) {
      console.warn("🛡️ [API] Prompt injection attempt blocked:", message.substring(0, 80));
      const refusal = "I can only help with election procedures and poll worker training. Please contact your election supervisor for other questions.";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: refusal })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
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

    // ── DEBUG: Log each retrieved chunk so we can verify what the LLM sees ──
    if (sourceMeta.length > 0) {
      console.log("\n📋 [RAG] ═══ RETRIEVED CHUNKS ═══");
      sourceMeta.forEach((m, i) => {
        console.log(`  [${i + 1}] Score: ${m.score.toFixed(3)} | Page ${m.pageNumber} | §${m.sectionTitle}`);
        console.log(`      Content (first 200 chars): ${m.chunkContent.substring(0, 200)}`);
      });
      console.log("📋 [RAG] ═══ END CHUNKS ═══\n");
    } else {
      console.warn("⚠️ [RAG] No chunks retrieved for query:", message);
    }

    const systemPrompt = buildRAGSystemPrompt(language, ragContext, true);
    // ── DEBUG: Log the full system prompt (truncated) ──
    console.log("\n🧠 [PROMPT] ═══ SYSTEM PROMPT (first 1500 chars) ═══");
    console.log(systemPrompt.substring(0, 1500));
    console.log("🧠 [PROMPT] ═══ END ═══\n");
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    // ── Ollama primary (local 8B model for election data privacy) ─────────────
    const encoder = new TextEncoder();
    let fullContent = "";
    const ollamaUp = await isOllamaAvailable();

    if (ollamaUp) {
      console.log(`🤖 [API] LLM backend: Ollama (${OLLAMA_MODEL})`);
      const ollamaResult = await ollamaStream(chatMessages, {
        maxTokens: 1024,
        temperature: 0.0,
      });

      if (ollamaResult) {
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const reader = ollamaResult.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  fullContent += value;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: value })}\n\n`));
                }
              }
              const sourceMatch = fullContent.match(/📄 Source:\s*(.+)$/m);
              const source = sourceMatch?.[1]?.trim() ?? "";
              const finalSourceMeta = sourceMatch ? sourceMeta : [];
              setCachedResponse(message, fullContent, source, finalSourceMeta);
              logInteraction({ userType: "poll_worker", question: message, response: fullContent, sourceDoc: source || "N/A", language, cached: false });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta: finalSourceMeta, usedSidecar: true })}\n\n`));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }
      console.warn("⚠️ [API] Ollama stream returned null — falling back to Groq");
    }

    // ── Groq fallback (cloud — only if Ollama is unavailable) ───────────────
    console.log(`🤖 [API] LLM backend: Groq fallback (${GROQ_MODEL})`);
    console.log("🔑 [API] GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
    const groq = getGroqClient();
    const groqStream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: chatMessages,
      temperature: 0.0,
      max_tokens: 1024,
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
          const source = sourceMatch?.[1]?.trim() ?? "";
          const finalSourceMeta = sourceMatch ? sourceMeta : [];
          setCachedResponse(message, fullContent, source, finalSourceMeta);
          logInteraction({ userType: "poll_worker", question: message, response: fullContent, sourceDoc: source || "N/A", language, cached: false });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta: finalSourceMeta, usedSidecar: false })}\n\n`));
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
