// Created by Sankritya on Feb 27, 2026
// Knowledge Base: Document ingestion, chunking, and in-memory vector store
// Pipeline: sliding-window chunks → BM25 + cosine hybrid retrieval via RRF

import { TrainingDocument } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KBChunk {
  id: string;
  documentId: string;
  documentName: string;
  sectionTitle: string;
  content: string;         // contextual content (section title prepended)
  rawContent: string;      // original chunk text without prepended context
  embedding: number[];
  metadata: Record<string, string>;
  pageNumber?: number;
  sectionIndex?: number;
}

export interface KBSearchResult {
  chunk: KBChunk;
  score: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

// ─── Tokenization & Stop Words ──────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
  "had", "her", "was", "one", "our", "out", "day", "get", "has", "him",
  "his", "how", "its", "may", "new", "now", "old", "see", "two", "who",
  "did", "use", "way", "she", "each", "which", "their", "time", "will",
  "with", "have", "this", "that", "from", "they", "been", "said", "what",
  "when", "make", "like", "into", "than", "then", "more", "also", "some",
  "would", "there", "could", "other", "after", "first", "well", "should",
  "about", "over", "such", "even", "most", "made", "before", "must",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

// ─── Local Embedding (hash-based, used as secondary signal only) ─────────────

const VOCAB_SIZE = 512;

function hashToken(token: string): number {
  let h = 5381;
  for (let i = 0; i < token.length; i++) {
    h = ((h << 5) + h + token.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % VOCAB_SIZE;
}

function localEmbed(text: string): number[] {
  const vec = new Array(VOCAB_SIZE).fill(0);
  const tokens = tokenize(text);
  // Unigrams + bigrams
  for (let i = 0; i < tokens.length; i++) {
    vec[hashToken(tokens[i])] += 1;
    if (i < tokens.length - 1) {
      vec[hashToken(`${tokens[i]}_${tokens[i + 1]}`)] += 0.5;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  dimensions = VOCAB_SIZE;
  async embed(text: string): Promise<number[]> { return localEmbed(text); }
  async embedBatch(texts: string[]): Promise<number[][]> { return texts.map(localEmbed); }
}

// ─── Cosine Similarity ──────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// ─── BM25 Index ──────────────────────────────────────────────────────────────
// Full BM25 (Okapi) implementation — proper IDF, no hash collisions

const BM25_K1 = 1.5;  // term frequency saturation
const BM25_B  = 0.75; // length normalization

class BM25Index {
  private df: Map<string, number> = new Map();   // doc frequency per term
  private tf: Map<string, Map<string, number>> = new Map(); // chunkId -> term -> tf
  private chunkLengths: Map<string, number> = new Map();
  private avgLen = 0;
  private N = 0;

  addChunk(chunkId: string, tokens: string[]): void {
    this.chunkLengths.set(chunkId, tokens.length);
    const termFreqs = new Map<string, number>();
    for (const t of tokens) {
      termFreqs.set(t, (termFreqs.get(t) ?? 0) + 1);
    }
    this.tf.set(chunkId, termFreqs);
    for (const term of termFreqs.keys()) {
      this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }
    this.N++;
  }

  finalize(): void {
    const total = [...this.chunkLengths.values()].reduce((s, v) => s + v, 0);
    this.avgLen = this.N > 0 ? total / this.N : 1;
  }

  score(chunkId: string, queryTokens: string[]): number {
    const termFreqs = this.tf.get(chunkId);
    if (!termFreqs) return 0;
    const dl = this.chunkLengths.get(chunkId) ?? this.avgLen;
    let score = 0;
    for (const term of queryTokens) {
      const tf = termFreqs.get(term) ?? 0;
      if (tf === 0) continue;
      const df = this.df.get(term) ?? 0;
      if (df === 0) continue;
      const idf = Math.log((this.N - df + 0.5) / (df + 0.5) + 1);
      const tfNorm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / this.avgLen)));
      score += idf * tfNorm;
    }
    return score;
  }

  clear(): void {
    this.df.clear();
    this.tf.clear();
    this.chunkLengths.clear();
    this.N = 0;
    this.avgLen = 0;
  }
}

// ─── Reciprocal Rank Fusion ───────────────────────────────────────────────────

function reciprocalRankFusion(
  rankedLists: Array<Array<{ id: string; score: number }>>,
  k = 60
): Map<string, number> {
  const fused = new Map<string, number>();
  for (const list of rankedLists) {
    const sorted = [...list].sort((a, b) => b.score - a.score);
    sorted.forEach((item, rank) => {
      fused.set(item.id, (fused.get(item.id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return fused;
}

// ─── Knowledge Graph Node ───────────────────────────────────────────────────

export interface KGNode {
  id: string;
  label: string;
  type: "concept" | "section" | "document" | "entity";
  metadata: Record<string, string>;
}

export interface KGEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
}

// ─── Knowledge Base Store ───────────────────────────────────────────────────

class KnowledgeBaseStore {
  private chunks: KBChunk[] = [];
  private bm25: BM25Index = new BM25Index();
  private nodes: Map<string, KGNode> = new Map();
  private edges: KGEdge[] = [];
  private provider: EmbeddingProvider;
  private conversationMemory: Map<string, { query: string; chunks: string[]; timestamp: number }[]> = new Map();

  constructor(provider?: EmbeddingProvider) {
    this.provider = provider ?? new LocalEmbeddingProvider();
  }

  setProvider(provider: EmbeddingProvider) { this.provider = provider; }
  getProvider(): EmbeddingProvider { return this.provider; }

  // ─── Document Ingestion ─────────────────────────────────────────────
  // Accepts pre-parsed pages: { pageNum, text }[]
  // Produces sliding-window chunks with exact page provenance

  async ingestDocument(
    doc: TrainingDocument,
    sections: { title: string; content: string; pageStart?: number; pageEnd?: number }[]
  ): Promise<number> {
    this.bm25.clear();

    // Document node
    this.nodes.set(doc.id, {
      id: doc.id,
      label: doc.name,
      type: "document",
      metadata: { status: doc.status, wordCount: String(doc.wordCount) },
    });

    // Sliding window chunking per section — chunks NEVER cross page boundaries.
    // Each section = one page (pageStart == pageEnd from the PDF parser).
    // Window: 150 words, 30 word overlap.
    const CHUNK_SIZE = 150;
    const OVERLAP = 30;
    let chunksAdded = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const page = sec.pageStart ?? 1;
      const words = sec.content.split(/\s+/).filter(Boolean);

      // Knowledge graph: section node + concepts
      const sectionNodeId = `${doc.id}:${sec.title}`;
      this.nodes.set(sectionNodeId, {
        id: sectionNodeId, label: sec.title, type: "section",
        metadata: { documentId: doc.id, page: String(page) },
      });
      this.edges.push({ from: doc.id, to: sectionNodeId, relation: "contains", weight: 1.0 });
      for (const concept of this.extractConcepts(sec.content)) {
        const cid = `concept:${concept}`;
        if (!this.nodes.has(cid)) {
          this.nodes.set(cid, { id: cid, label: concept, type: "concept", metadata: {} });
        }
        this.edges.push({ from: sectionNodeId, to: cid, relation: "covers", weight: 0.8 });
      }

      // Skip pages too short to produce useful chunks (single-sentence stubs)
      if (words.length < 40) continue;

      // Slide window within this section only
      const step = Math.max(1, CHUNK_SIZE - OVERLAP);
      for (let start = 0; start < words.length; start += step) {
        const slice = words.slice(start, start + CHUNK_SIZE);
        if (slice.length < 15) break;

        const rawContent = slice.join(" ");
        // Contextual content: prepend section title (Anthropic contextual retrieval)
        const contextualContent = `[${sec.title}] ${rawContent}`;

        const chunkId = `${doc.id}:chunk-${chunksAdded}`;
        const embedding = await this.provider.embed(contextualContent);
        const bm25Tokens = tokenize(contextualContent);

        const chunk: KBChunk = {
          id: chunkId,
          documentId: doc.id,
          documentName: doc.name,
          sectionTitle: sec.title,
          content: contextualContent,
          rawContent,
          embedding,
          metadata: { chunkIndex: String(chunksAdded) },
          pageNumber: page,
          sectionIndex: sIdx,
        };

        this.chunks.push(chunk);
        this.bm25.addChunk(chunkId, bm25Tokens);
        chunksAdded++;
      }
    }

    this.bm25.finalize();
    return chunksAdded;
  }

  // ─── Hybrid Search: BM25 + Cosine via Reciprocal Rank Fusion ────────

  async search(query: string, topK = 5, minScore = 0.0): Promise<KBSearchResult[]> {
    if (this.chunks.length === 0) return [];

    const queryTokens = tokenize(query);
    const queryEmbedding = await this.provider.embed(query);

    // --- BM25 scores ---
    const bm25Scores = this.chunks.map((chunk) => ({
      id: chunk.id,
      score: this.bm25.score(chunk.id, queryTokens),
    }));

    // --- Cosine scores ---
    const cosineScores = this.chunks.map((chunk) => ({
      id: chunk.id,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // --- RRF fusion (BM25 weighted 2x over cosine) ---
    const fused = reciprocalRankFusion([bm25Scores, bm25Scores, cosineScores]);

    // Map back to chunks
    const chunkMap = new Map(this.chunks.map((c) => [c.id, c]));
    const results: KBSearchResult[] = [];
    for (const [id, score] of fused.entries()) {
      const chunk = chunkMap.get(id);
      if (chunk) results.push({ chunk, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // ─── Conversation Memory ────────────────────────────────────────────

  addToMemory(sessionId: string, query: string, relevantChunkIds: string[]) {
    if (!this.conversationMemory.has(sessionId)) {
      this.conversationMemory.set(sessionId, []);
    }
    this.conversationMemory.get(sessionId)!.push({
      query,
      chunks: relevantChunkIds,
      timestamp: Date.now(),
    });
    // Keep last 20 interactions per session
    const mem = this.conversationMemory.get(sessionId)!;
    if (mem.length > 20) {
      this.conversationMemory.set(sessionId, mem.slice(-20));
    }
  }

  getMemory(sessionId: string) {
    return this.conversationMemory.get(sessionId) ?? [];
  }

  // ─── Knowledge Graph Queries ────────────────────────────────────────

  getRelatedConcepts(chunkId: string): string[] {
    const chunk = this.chunks.find((c) => c.id === chunkId);
    if (!chunk) return [];
    const sectionNodeId = `${chunk.documentId}:${chunk.sectionTitle}`;
    return this.edges
      .filter((e) => e.from === sectionNodeId && e.relation === "covers")
      .map((e) => this.nodes.get(e.to)?.label ?? "")
      .filter(Boolean);
  }

  getGraphStats() {
    return {
      totalChunks: this.chunks.length,
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      documents: [...this.nodes.values()].filter((n) => n.type === "document").length,
      sections: [...this.nodes.values()].filter((n) => n.type === "section").length,
      concepts: [...this.nodes.values()].filter((n) => n.type === "concept").length,
    };
  }

  // ─── Internal Helpers ───────────────────────────────────────────────

  private extractConcepts(text: string): string[] {
    const conceptPatterns = [
      "voter id", "provisional ballot", "poll book", "check-in",
      "accessible voting", "avu", "closing", "opening",
      "emergency", "electioneering", "ballot", "precinct",
      "poll worker", "election day", "hotline", "signage",
      "identification", "affidavit", "reconcile", "training",
      "recruitment", "candidate", "bilingual", "spanish",
      "coverage", "scheduling", "compliance", "audit",
    ];
    const lower = text.toLowerCase();
    return conceptPatterns.filter((p) => lower.includes(p));
  }

  getSectionTitles(): string[] {
    return [...this.nodes.values()]
      .filter((n) => n.type === "section")
      .map((n) => n.label);
  }

  getStats() {
    return {
      chunks: this.chunks.length,
      nodes: this.nodes.size,
      edges: this.edges.length,
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

let instance: KnowledgeBaseStore | null = null;

export function getKnowledgeBase(): KnowledgeBaseStore {
  if (!instance) {
    instance = new KnowledgeBaseStore();
  }
  return instance;
}

// ─── Auto-Ingest Real PDF on First Access ───────────────────────────────────

let ingested = false;

export async function ensureKnowledgeBaseIngested(): Promise<void> {
  if (ingested) return;
  ingested = true;

  const kb = getKnowledgeBase();

  try {
    // Dynamically import unpdf (server-only)
    const { getDocumentProxy } = await import("unpdf");
    const fs = await import("fs");
    const path = await import("path");

    const pdfPath = path.join(process.cwd(), "public", "poll_worker_training_manual.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.warn("⚠️ PDF not found at", pdfPath, "— knowledge base will be empty");
      return;
    }

    console.log("📄 Parsing real PDF for knowledge base:", pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const totalPages = pdf.numPages;

    // Extract text per page
    const pageTexts: { pageNum: number; text: string }[] = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const tc = await page.getTextContent();
      const text = tc.items
        .map((item: Record<string, unknown>) => (item as { str: string }).str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push({ pageNum, text });
    }

    // Build per-page sections — guarantees each chunk has the exact correct page number.
    // Heading detection: capture the N.N or Section N: prefix plus the next 3-5 content words.
    // We stop at words that are clearly NOT heading words (single letters, "What", "How", etc.)
    const HEADING_STOP = new Set(["A", "An", "In", "To", "And", "Or", "For", "With", "By",
      "Do", "Does", "Is", "Are", "Was", "Were", "Be", "At", "Of", "On", "Up"]);

    // Table column headers that signal end of title
    const TABLE_HEADERS = new Set(["Issue", "What", "How", "Do", "Does", "Action", "Step"]);

    function extractTitle(prefix: string, rest: string): string {
      const words = rest.trim().split(/\s+/);
      const titleWords: string[] = [];
      const seen = new Set<string>();
      for (const w of words) {
        if (titleWords.length >= 6) break;
        if (HEADING_STOP.has(w) && titleWords.length >= 2) break;
        if (/^\d/.test(w)) break;
        // Detect table header patterns: repeated cap words or known column headers after >=2 title words
        const wLower = w.toLowerCase();
        if (TABLE_HEADERS.has(w) && titleWords.length >= 2) break;
        if (seen.has(wLower) && titleWords.length >= 2) break; // duplicate word = table
        seen.add(wLower);
        titleWords.push(w);
      }
      return (prefix + " " + titleWords.join(" ")).replace(/\s+/g, " ").trim();
    }

    // Match the numeric prefix, then capture remaining text for title extraction
    const subsectionRe = /\b(\d+\.\d+(?:\.\d+)?)\s+([A-Z].+)/;
    const sectionRe    = /\b(Section\s+\d+\s*[:\-–]?)\s+([A-Z].+)/;

    function detectHeading(text: string): string | null {
      const sub = text.match(subsectionRe);
      if (sub) return extractTitle(sub[1], sub[2]);
      const sec = text.match(sectionRe);
      if (sec) return extractTitle(sec[1], sec[2]);
      return null;
    }

    const sections: { title: string; content: string; pageStart: number; pageEnd: number }[] = [];

    let lastTitle = "Introduction";
    for (const p of pageTexts) {
      if (p.text.trim().length < 30) continue;
      const detected = detectHeading(p.text);
      if (detected) lastTitle = detected;
      sections.push({ title: lastTitle, content: p.text, pageStart: p.pageNum, pageEnd: p.pageNum });
    }

    const totalWords = sections.reduce((sum, s) => sum + s.content.split(/\s+/).length, 0);
    console.log(`✅ Extracted ${sections.length} page-sections (${totalWords} words) from ${totalPages} pages`);
    for (const s of sections) {
      console.log(`  📖 "${s.title}" → page ${s.pageStart} (${s.content.split(/\s+/).length} words)`);
    }

    await kb.ingestDocument(
      {
        id: "doc-001",
        name: "Poll Worker Training Manual 2026",
        status: "active",
        wordCount: totalWords,
        sections: sections.length,
        uploadedAt: "2026-01-15T09:00:00Z",
        lastUpdated: new Date().toISOString(),
      },
      sections
    );

    const stats = kb.getStats();
    console.log(`🧠 Knowledge base ready — ${stats.chunks} chunks, ${stats.nodes} nodes, ${stats.edges} edges`);
  } catch (error) {
    console.error("❌ Failed to ingest PDF:", error);
    ingested = false; // Allow retry
  }
}
