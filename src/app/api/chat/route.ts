import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { isOllamaAvailable, ollamaStream, OLLAMA_MODEL } from "@/lib/ollama";
import { getRAGContext, buildRAGSystemPrompt, detectNavigationIntent } from "@/lib/system-prompt-rag";
import { getCachedResponse, setCachedResponse } from "@/lib/response-cache";
import { logInteraction } from "@/lib/audit-logger";
import { ChatRequest } from "@/types";
import { GROQ_MODEL } from "@/lib/constants";

// ── In-memory rate limiter (per IP, resets every minute) ──────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;       // max requests per window
const RATE_WINDOW_MS = 60_000; // 1-minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function POST(req: NextRequest) {
  console.log("🚀 [API] Chat route called");
  
  try {
    // ── Rate limiting ────────────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    if (!checkRateLimit(ip)) {
      console.warn("🛑 [API] Rate limit exceeded for IP:", ip);
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body: ChatRequest = await req.json();
    const { message, language = "en", conversationHistory = [] } = body;
    console.log("📝 [API] Received message:", message);
    console.log("🌐 [API] Language:", language);
    console.log("💬 [API] History length:", conversationHistory.length);

    if (!message?.trim()) {
      console.error("❌ [API] Empty message received");
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // ── Input length cap (prevent token flooding) ────────────────────────────
    if (message.length > 1000) {
      console.warn("⚠️ [API] Message too long:", message.length, "chars");
      return NextResponse.json(
        { error: "Message too long. Please keep questions under 1000 characters." },
        { status: 400 }
      );
    }

    // ── Strip control characters and null bytes ──────────────────────────────
    const sanitizedMessage = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

    // ── Prompt injection guard (expanded pattern set) ─────────────────────────
    const INJECTION_PATTERNS = new RegExp(
      [
        "ignore\\s+(all\\s+)?previous\\s+instructions",
        "you\\s+are\\s+now\\s+(?:a|an|the)",
        "forget\\s+(all\\s+)?your\\s+rules",
        "new\\s+system\\s+prompt",
        "disregard\\s+(all\\s+)?prior",
        "act\\s+as\\s+(?:a\\s+)?(?:different|general|new|unrestricted|evil|dan|jailbreak)",
        "reveal\\s+(?:your\\s+)?(?:system|instructions|prompt|training)",
        "pretend\\s+(you\\s+are|to\\s+be)",
        "do\\s+anything\\s+now",
        "jailbreak",
        "DAN\\b",
        "override\\s+(?:all\\s+)?(?:safety|rules|instructions)",
        "repeat\\s+(?:the\\s+)?(?:above|system|prompt|instructions)",
        "what\\s+(are|were)\\s+your\\s+(?:initial|original|system)\\s+instructions",
        "show\\s+me\\s+your\\s+(?:prompt|instructions|system)",
        "\\[INST\\]",       // Llama injection format
        "<\\|im_start\\|>",  // ChatML injection
        "<\\|system\\|>",    // Mistral injection
      ].join("|"),
      "i"
    );
    if (INJECTION_PATTERNS.test(sanitizedMessage)) {
      console.warn("🛡️ [API] Prompt injection attempt blocked from IP:", ip, "|", sanitizedMessage.substring(0, 80));
      logInteraction({ userType: "poll_worker", question: sanitizedMessage, response: "[BLOCKED: prompt injection]", sourceDoc: "N/A", language, cached: false });
      const refusal = "I can only help with election day procedures and poll worker training. For other questions, please contact your election supervisor.";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: refusal })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sourceMeta: [] })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Check cache first — return as a single JSON chunk with cached flag
    const cached = getCachedResponse(sanitizedMessage);
    if (cached) {
      console.log("✅ [API] Cache hit! Returning cached response");
      logInteraction({
        userType: "poll_worker",
        question: sanitizedMessage,
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
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Check for navigation intent
    const navIntent = detectNavigationIntent(sanitizedMessage);
    if (navIntent) {
      console.log("🧭 [API] Navigation intent detected:", navIntent.path);
    }

    // Get RAG context from knowledge base
    const { context: ragContext, sourceMeta } = await getRAGContext(sanitizedMessage);
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
      console.warn("⚠️ [RAG] No chunks retrieved for query:", sanitizedMessage);
    }

    const systemPrompt = buildRAGSystemPrompt(language, ragContext, true);
    // ── DEBUG: Log the full system prompt (truncated) ──
    console.log("\n🧠 [PROMPT] ═══ SYSTEM PROMPT (first 1500 chars) ═══");
    console.log(systemPrompt.substring(0, 1500));
    console.log("🧠 [PROMPT] ═══ END ═══\n");
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: sanitizedMessage },
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
              setCachedResponse(sanitizedMessage, fullContent, source, finalSourceMeta);
              logInteraction({ userType: "poll_worker", question: sanitizedMessage, response: fullContent, sourceDoc: source || "N/A", language, cached: false });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta: finalSourceMeta, usedSidecar: true })}\n\n`));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, { headers: SSE_HEADERS });
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
          setCachedResponse(sanitizedMessage, fullContent, source, finalSourceMeta);
          logInteraction({ userType: "poll_worker", question: sanitizedMessage, response: fullContent, sourceDoc: source || "N/A", language, cached: false });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ source, cached: false, done: true, sourceMeta: finalSourceMeta, usedSidecar: false })}\n\n`));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error("❌ [API] Fatal error in chat route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
