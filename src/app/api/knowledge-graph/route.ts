import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "section" | "concept";
  docId: string;
  page?: number;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function extractConcepts(text: string): string[] {
  // Extract capitalized noun phrases and key terms
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) ?? [];
  const stopWords = new Set(["The", "This", "That", "These", "Those", "When", "Where", "What", "Which", "After", "Before", "During", "Section", "Page"]);
  return [...new Set(matches.filter(m => !stopWords.has(m) && m.length > 4))].slice(0, 3);
}

export async function GET() {
  console.log(`🔗 Knowledge graph fetching from: ${SIDECAR_URL}`);
  try {
    // Fetch real chunks from sidecar
    const res = await fetch(`${SIDECAR_URL}/chunks`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`❌ Sidecar responded with ${res.status}`);
      throw new Error("Sidecar not available");
    }

    const chunks: Array<{
      id: string;
      page: number;
      title: string;
      ctx: string;
      doc: string;
    }> = await res.json();
    console.log(`📦 Received ${chunks.length} chunks from sidecar`);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    // Group chunks by doc and section
    const docMap = new Map<string, { name: string; sections: Map<string, { page: number; chunks: typeof chunks }> }>();

    for (const chunk of chunks) {
      if (!docMap.has(chunk.doc)) {
        docMap.set(chunk.doc, { name: chunk.doc, sections: new Map() });
      }
      const doc = docMap.get(chunk.doc)!;
      const sectionKey = chunk.title;
      if (!doc.sections.has(sectionKey)) {
        doc.sections.set(sectionKey, { page: chunk.page, chunks: [] });
      }
      doc.sections.get(sectionKey)!.chunks.push(chunk);
    }

    // Build nodes: 1 doc node + section nodes + concept nodes (capped for performance)
    const MAX_SECTIONS_PER_DOC = 30;
    const MAX_CONCEPTS_TOTAL = 40;
    let conceptCount = 0;

    for (const [docId, doc] of docMap) {
      const docNodeId = `doc:${docId}`;
      // Short display label for doc node
      const docLabel = doc.name.replace(/\.pdf$/i, "").replace(/_/g, " ").slice(0, 20);
      nodes.push({ id: docNodeId, label: docLabel, type: "document", docId, size: 14 });
      nodeIds.add(docNodeId);

      const sectionEntries = [...doc.sections.entries()].slice(0, MAX_SECTIONS_PER_DOC);

      for (const [sectionTitle, sectionData] of sectionEntries) {
        const secNodeId = `sec:${docId}:${sectionTitle.slice(0, 30)}`;
        if (!nodeIds.has(secNodeId)) {
          // Clean up section label: strip long number prefixes, truncate
          const cleanLabel = sectionTitle
            .replace(/^[\d.]+\s+/, "")
            .replace(/\|.*$/, "")
            .trim();
          nodes.push({
            id: secNodeId,
            label: cleanLabel.length > 20 ? cleanLabel.slice(0, 20) + "…" : cleanLabel,
            type: "section",
            docId,
            page: sectionData.page,
            size: 7,
          });
          nodeIds.add(secNodeId);
          edges.push({ source: docNodeId, target: secNodeId, weight: 1.0 });
        }

        // Only add concept nodes if under cap
        if (conceptCount < MAX_CONCEPTS_TOTAL) {
          for (const chunk of sectionData.chunks.slice(0, 1)) {
            const concepts = extractConcepts(chunk.ctx).slice(0, 2);
            for (const concept of concepts) {
              if (conceptCount >= MAX_CONCEPTS_TOTAL) break;
              const conceptId = `concept:${concept.toLowerCase().replace(/\s+/g, "_")}`;
              if (!nodeIds.has(conceptId)) {
                nodes.push({ id: conceptId, label: concept, type: "concept", docId, size: 4 });
                nodeIds.add(conceptId);
                conceptCount++;
              }
              if (!edges.find(e => e.source === secNodeId && e.target === conceptId)) {
                edges.push({ source: secNodeId, target: conceptId, weight: 0.6 });
              }
            }
          }
        }
      }

      // Cross-section edges: sections on adjacent pages are related
      for (let i = 0; i < sectionEntries.length - 1; i++) {
        const aId = `sec:${docId}:${sectionEntries[i][0].slice(0, 30)}`;
        const bId = `sec:${docId}:${sectionEntries[i + 1][0].slice(0, 30)}`;
        if (nodeIds.has(aId) && nodeIds.has(bId)) {
          edges.push({ source: aId, target: bId, weight: 0.3 });
        }
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      meta: {
        totalChunks: chunks.length,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        live: true,
      },
    });
  } catch (error) {
    console.error("❌ Knowledge graph error:", error);
    // Sidecar offline — return minimal static graph
    return NextResponse.json({
      nodes: [],
      edges: [],
      meta: { totalChunks: 0, totalNodes: 0, totalEdges: 0, live: false },
    });
  }
}
