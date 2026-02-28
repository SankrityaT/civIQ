// Created by Sankritya on Feb 27, 2026
// Knowledge Base: Document ingestion, chunking, and in-memory vector store
// Designed to be model-agnostic — any embedding provider can plug in

import { TrainingDocument } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KBChunk {
  id: string;
  documentId: string;
  documentName: string;
  sectionTitle: string;
  content: string;
  embedding: number[];
  metadata: Record<string, string>;
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

// ─── Simple TF-IDF-like Embedding (no external deps) ───────────────────────
// This is a lightweight local embedding that works without any API calls.
// Swap this out for OpenAI, Cohere, HuggingFace, or local sentence-transformers.

const VOCAB_SIZE = 384;

function hashToken(token: string): number {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = ((h << 5) - h + token.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % VOCAB_SIZE;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function localEmbed(text: string): number[] {
  const vec = new Array(VOCAB_SIZE).fill(0);
  const tokens = tokenize(text);
  // Bigrams for better semantic capture
  const grams: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    grams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  for (const gram of grams) {
    vec[hashToken(gram)] += 1;
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  dimensions = VOCAB_SIZE;
  async embed(text: string): Promise<number[]> {
    return localEmbed(text);
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(localEmbed);
  }
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
  private nodes: Map<string, KGNode> = new Map();
  private edges: KGEdge[] = [];
  private provider: EmbeddingProvider;
  private conversationMemory: Map<string, { query: string; chunks: string[]; timestamp: number }[]> = new Map();

  constructor(provider?: EmbeddingProvider) {
    this.provider = provider ?? new LocalEmbeddingProvider();
  }

  setProvider(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  // ─── Document Ingestion ─────────────────────────────────────────────

  async ingestDocument(doc: TrainingDocument, sections: { title: string; content: string }[]): Promise<number> {
    // Add document node to knowledge graph
    const docNode: KGNode = {
      id: doc.id,
      label: doc.name,
      type: "document",
      metadata: { status: doc.status, wordCount: String(doc.wordCount) },
    };
    this.nodes.set(doc.id, docNode);

    let chunksAdded = 0;

    for (const section of sections) {
      // Chunk each section (split large sections into ~200 word chunks)
      const sectionChunks = this.chunkText(section.content, 200);
      const sectionNodeId = `${doc.id}:${section.title}`;

      // Add section node
      this.nodes.set(sectionNodeId, {
        id: sectionNodeId,
        label: section.title,
        type: "section",
        metadata: { documentId: doc.id },
      });

      // Edge: document -> section
      this.edges.push({
        from: doc.id,
        to: sectionNodeId,
        relation: "contains",
        weight: 1.0,
      });

      // Extract concepts and create concept nodes
      const concepts = this.extractConcepts(section.content);
      for (const concept of concepts) {
        const conceptId = `concept:${concept}`;
        if (!this.nodes.has(conceptId)) {
          this.nodes.set(conceptId, {
            id: conceptId,
            label: concept,
            type: "concept",
            metadata: {},
          });
        }
        // Edge: section -> concept
        this.edges.push({
          from: sectionNodeId,
          to: conceptId,
          relation: "covers",
          weight: 0.8,
        });
      }

      // Embed and store chunks
      const texts = sectionChunks.map((c) => c);
      const embeddings = await this.provider.embedBatch(texts);

      for (let i = 0; i < sectionChunks.length; i++) {
        const chunk: KBChunk = {
          id: `${doc.id}:${section.title}:chunk-${i}`,
          documentId: doc.id,
          documentName: doc.name,
          sectionTitle: section.title,
          content: sectionChunks[i],
          embedding: embeddings[i],
          metadata: {
            chunkIndex: String(i),
            totalChunks: String(sectionChunks.length),
          },
        };
        this.chunks.push(chunk);
        chunksAdded++;
      }
    }

    return chunksAdded;
  }

  // ─── Semantic Search ────────────────────────────────────────────────

  async search(query: string, topK = 5, minScore = 0.1): Promise<KBSearchResult[]> {
    if (this.chunks.length === 0) return [];

    const queryEmbedding = await this.provider.embed(query);

    const scored = this.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Also boost scores based on knowledge graph connections
    const queryTokens = tokenize(query);
    for (const result of scored) {
      const sectionNodeId = `${result.chunk.documentId}:${result.chunk.sectionTitle}`;
      const connectedConcepts = this.edges
        .filter((e) => e.from === sectionNodeId && e.relation === "covers")
        .map((e) => this.nodes.get(e.to))
        .filter(Boolean);

      for (const concept of connectedConcepts) {
        if (concept && queryTokens.some((t) => concept.label.includes(t))) {
          result.score += 0.1; // Boost for concept match
        }
      }
    }

    return scored
      .filter((r) => r.score >= minScore)
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

  private chunkText(text: string, maxWords: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = "";
    let wordCount = 0;

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).length;
      if (wordCount + words > maxWords && current) {
        chunks.push(current.trim());
        current = sentence;
        wordCount = words;
      } else {
        current += (current ? " " : "") + sentence;
        wordCount += words;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }

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
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

let instance: KnowledgeBaseStore | null = null;

export function getKnowledgeBase(): KnowledgeBaseStore {
  if (!instance) {
    instance = new KnowledgeBaseStore();
  }
  return instance;
}

// ─── Fake Document Content for Ingestion ────────────────────────────────────

export const FAKE_DOCUMENTS: {
  docId: string;
  docName: string;
  sections: { title: string; content: string }[];
}[] = [
  {
    docId: "doc-001",
    docName: "Poll Worker Training Manual 2026",
    sections: [
      {
        title: "Opening the Polls",
        content: "Poll workers must arrive at the polling location by 5:30 AM. Begin setup procedures including: powering on all voting machines, verifying ballot supplies, posting required signage, and testing the accessible voting unit (AVU). The polling location must be ready for voters by 6:00 AM. Ensure the American flag is properly displayed. Verify that all required forms are available: provisional ballot affidavits, incident report forms, and voter registration forms. Test the electronic poll book by looking up a test voter record. Confirm the emergency supply kit is present and complete."
      },
      {
        title: "Voter Check-In Procedures",
        content: "When a voter arrives: 1) Greet the voter warmly. 2) Ask for their name and address. 3) Look up the voter in the electronic poll book. 4) Verify identification per state requirements. 5) Have the voter sign the poll book. 6) Issue the correct ballot style for their precinct. If a voter's name is not found, offer a provisional ballot and explain the process clearly. Never turn away a voter without offering a provisional ballot. If the poll book system is down, use the emergency paper roster backup and contact the Election Day hotline."
      },
      {
        title: "Voter ID Requirements",
        content: "Acceptable forms of ID include: valid Arizona driver's license, Arizona nonoperating identification license, tribal enrollment card, or any two of the following: utility bill dated within 90 days, bank statement, government-issued check, paycheck, or any other government document showing name and address. If a voter presents expired ID, they may still vote a provisional ballot. If a voter has no ID at all, they must vote a provisional ballot and can provide ID to the county recorder within 5 business days after the election."
      },
      {
        title: "Provisional Ballots",
        content: "A provisional ballot must be offered when: the voter's name does not appear in the poll book, the voter does not have acceptable ID, or there is a question about the voter's eligibility. The voter completes a provisional ballot affidavit with their name, address, date of birth, and signature. Seal the provisional ballot in the green envelope. Record the provisional ballot number in the provisional ballot log. Give the voter the receipt portion of the envelope so they can track their ballot status online. Provisional ballots are reviewed and counted at the central counting facility."
      },
      {
        title: "Accessible Voting",
        content: "Every polling location must have at least one accessible voting unit (AVU). Poll workers should be prepared to assist voters with disabilities without being condescending. Offer the AVU to any voter who requests it. The AVU includes audio ballot capability for visually impaired voters, sip-and-puff device support for voters with mobility impairments, large print display options, and a tactile keypad. Never assume a voter does or does not need assistance. If a voter needs physical help marking their ballot, they may choose anyone to assist them except their employer or union representative."
      },
      {
        title: "Closing the Polls",
        content: "At 7:00 PM, announce that the polls are closing. Any voter in line at 7:00 PM must be allowed to vote — do not allow anyone to join the line after 7:00 PM. After the last voter has voted: 1) Shut down all voting machines per the posted procedure. 2) Reconcile the number of voters checked in with ballots cast. 3) Seal all ballots in the designated tamper-evident containers. 4) Complete all required paperwork including the poll closing report. 5) Transport all materials to the central counting facility using the designated route. Two workers must accompany the materials at all times."
      },
      {
        title: "Emergency Procedures",
        content: "In case of power outage: immediately switch to emergency ballots (paper ballots in the emergency supply kit). Document the time of the outage. In case of equipment malfunction: call the Election Day hotline immediately at (555) 123-4567 and use backup equipment if available. In case of a security threat: call 911 first, then the Election Day hotline. Evacuate voters if necessary and do not resume voting until law enforcement gives the all-clear. Document all incidents on the Incident Report Form with time, description, and actions taken."
      },
      {
        title: "Electioneering Rules",
        content: "No campaign materials, signs, buttons, stickers, or apparel are permitted within 75 feet of the polling location entrance. This includes clothing with candidate names, party logos, or ballot measure slogans. If a voter is wearing campaign apparel, they must still be allowed to vote — do not turn them away or ask them to remove the item. If someone is electioneering within the restricted zone, politely ask them to move beyond the 75-foot boundary. If they refuse, contact the Election Day hotline. Poll workers themselves must not wear any political material while serving."
      },
    ],
  },
  {
    docId: "doc-002",
    docName: "Election Day Procedures Guide",
    sections: [
      {
        title: "Pre-Election Preparation",
        content: "All poll workers must complete the mandatory 4-hour training session no more than 30 days before the election. Training covers equipment operation, voter check-in procedures, handling special situations, and ADA compliance. Poll workers receive their precinct assignment and shift schedule at least 7 days before the election. Review the poll worker handbook and bring it on election day. Confirm your transportation to the polling site. Pack comfortable shoes — you will be on your feet for 14+ hours."
      },
      {
        title: "Equipment Setup Guide",
        content: "Each polling location receives a sealed equipment kit delivered the day before the election. On election morning: 1) Break the seal and verify all contents against the inventory checklist. 2) Set up voting booths with privacy screens. 3) Power on the ballot tabulator and run the zero tape to confirm no votes are pre-loaded. 4) Set up the accessible voting unit in a location with wheelchair access. 5) Power on the electronic poll book and verify network connectivity. 6) Set up the ballot-on-demand printer if applicable. Report any missing or damaged equipment immediately."
      },
      {
        title: "Handling Disruptions",
        content: "Common disruptions include: long lines (deploy additional check-in stations), printer jams (use backup ballots), network outages (switch to offline mode on poll books), voter disputes (remain calm, call supervisor). For extended power outages lasting more than 30 minutes, contact the county elections office for guidance on whether to relocate. Keep voters informed of wait times. Offer water to voters in line during extreme heat. If media representatives arrive, they may observe but cannot interview voters inside the polling place or photograph marked ballots."
      },
      {
        title: "Chain of Custody",
        content: "Maintaining ballot chain of custody is critical for election integrity. All ballot containers must be sealed with tamper-evident seals. Record seal numbers on the chain of custody form. When transporting ballots: two bipartisan workers must accompany the materials, drive directly to the counting facility without stops, and call ahead to confirm arrival. At the counting facility, verify that seal numbers match the form. Any broken seals must be reported immediately. The chain of custody log is a legal document — keep it complete and accurate."
      },
      {
        title: "Post-Election Procedures",
        content: "After polls close and results are transmitted: 1) Print the results tape from each tabulator. 2) Post one copy of the results tape on the door of the polling location for public viewing. 3) Power down all equipment in the prescribed order. 4) Return all materials to the counting facility. 5) Complete the post-election incident report. 6) Return your poll worker badge and collect your payment voucher. Payment is processed within 2-4 weeks after the election. Thank you for serving your community!"
      },
    ],
  },
  {
    docId: "doc-003",
    docName: "Voter ID Requirements by State",
    sections: [
      {
        title: "Arizona ID Requirements",
        content: "Arizona is a voter ID state. Voters must present one form of photo ID (driver's license, state ID, tribal ID, federal ID) or two forms of non-photo ID (utility bill, bank statement, vehicle registration, government check). If the voter's name or address on the ID does not match the poll book exactly, they may still vote if the poll worker can reasonably determine they are the same person. Minor variations in name spelling or address formatting should not prevent a voter from casting a regular ballot."
      },
      {
        title: "Federal ID Requirements",
        content: "Under the Help America Vote Act (HAVA), first-time voters who registered by mail and did not provide ID verification must show ID at the polls. Acceptable federal documents include: current and valid photo ID, or a current utility bill, bank statement, government check, paycheck, or government document showing name and address. Military and overseas voters may have different ID requirements under UOCAVA. Contact the county recorder for specific guidance on military voter ID questions."
      },
      {
        title: "Handling ID Issues",
        content: "Common ID issues at the polls: expired ID (allow regular ballot if ID expired within 2 years in Arizona), name change due to marriage (verify with additional documentation), no ID at all (issue provisional ballot), damaged or unreadable ID (use additional forms of verification). Never confiscate a voter's ID. Never photocopy a voter's ID. If you suspect a fraudulent ID, do not confront the voter — note the incident on the report form and allow them to vote provisionally. Contact the Election Day hotline for guidance."
      },
    ],
  },
];

// ─── Auto-Ingest on First Access ────────────────────────────────────────────

let ingested = false;

export async function ensureKnowledgeBaseIngested(): Promise<void> {
  if (ingested) return;
  ingested = true;

  const kb = getKnowledgeBase();
  for (const fakeDoc of FAKE_DOCUMENTS) {
    await kb.ingestDocument(
      {
        id: fakeDoc.docId,
        name: fakeDoc.docName,
        status: "active",
        wordCount: fakeDoc.sections.reduce((sum, s) => sum + s.content.split(/\s+/).length, 0),
        sections: fakeDoc.sections.length,
        uploadedAt: "2026-01-15T09:00:00Z",
        lastUpdated: "2026-02-01T14:30:00Z",
      },
      fakeDoc.sections
    );
  }
}
