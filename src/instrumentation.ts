export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmupOllama, isOllamaAvailable } = await import("@/lib/ollama");
    const available = await isOllamaAvailable();
    if (available) {
      console.log("[Startup] Warming up Ollama model...");
      await warmupOllama();
      console.log("[Startup] Ollama model loaded and pinned in GPU memory.");
    }
  }
}
