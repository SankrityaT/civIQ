import { NextRequest, NextResponse } from "next/server";

// MyMemory free translation API — no key required, 5000 chars/day
// Docs: https://mymemory.translated.net/doc/spec.php
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function POST(req: NextRequest) {
  try {
    const { text, from = "en", to = "es" } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // MyMemory has a 500-char limit per request — split on sentences and batch
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > 450) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const translated: string[] = [];
    for (const chunk of chunks) {
      const url = `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`MyMemory ${res.status}`);
      const data = await res.json();
      translated.push(data.responseData?.translatedText ?? chunk);
    }

    return NextResponse.json({ translated: translated.join(" ") });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
