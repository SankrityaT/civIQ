"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { SourceMeta } from "@/types";
import {
  X,
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  FilePdf,
  Highlighter,
  BookOpen,
} from "@phosphor-icons/react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface SourceViewerProps {
  sourceMeta: SourceMeta[];
  activeIndex: number;
  onClose: () => void;
  onSelectSource: (index: number) => void;
}

export default function SourceViewer({ sourceMeta, activeIndex, onClose, onSelectSource }: SourceViewerProps) {
  const active = sourceMeta[activeIndex];
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(active?.pageNumber ?? 1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Map document name → served PDF path
  // doc_name from sidecar = filename stem title-cased, e.g. "Finaltestmanual" or "Poll Worker Training Manual"
  const getPdfPath = (meta: typeof active): string => {
    const name = (meta?.documentName ?? meta?.documentId ?? "").toLowerCase().replace(/[\s_-]+/g, "");
    if (name.includes("finaltest") || name.includes("finaltestmanual") || name.includes("jurisdictional")) return "/finaltestmanual.pdf";
    if (name.includes("pollworker") || name.includes("poll") || name.includes("training")) return "/poll_worker_training_manual.pdf";
    return "/finaltestmanual.pdf";
  };
  const pdfPath = getPdfPath(active);
  const targetPage = active?.pageNumber ?? 1;

  // Measure container width for responsive PDF scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Jump to target page when source changes
  useEffect(() => {
    setCurrentPage(targetPage);
  }, [targetPage, activeIndex]);

  // Highlight matching text in the PDF text layer after page renders
  const highlightPageText = useCallback((snippet: string) => {
    if (!snippet || !pageRef.current) return;
    const textLayer = pageRef.current.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
    if (!textLayer) return;

    // Clear previous highlights
    textLayer.querySelectorAll("mark.pdf-highlight").forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
        parent.normalize();
      }
    });

    // Extract key phrases to search for (skip generic words, focus on specifics)
    const cleanSnippet = snippet.replace(/\[.*?\]/g, "").trim(); // remove [Section X] prefixes
    const words = cleanSnippet.split(/\s+/).filter(w => w.length > 3 && !/^(the|and|for|with|you|will|must|can|this|that|from|have|are|was|were|been|being|they|them|their|there|then|than|when|where|what|which|while|who|whom|whose|why|how|all|any|both|each|few|more|most|other|some|such|only|own|same|so|than|too|very|just|but|not|also|after|before|during|into|through|above|below|between|under|again|further|once|here|there|why|how|out|off|over|under|again|further|once)$/i.test(w));
    
    // Pick 3-4 distinctive phrases (8-15 chars each) to search for
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 2 && phrases.length < 4; i++) {
      const phrase = words.slice(i, i + 3).join(" ");
      if (phrase.length >= 8 && phrase.length <= 25) {
        phrases.push(phrase.toLowerCase());
      }
    }
    // Fallback: use first sentence if no good phrases found
    if (phrases.length === 0) {
      const firstSentence = cleanSnippet.split(/[.!?]/)[0];
      if (firstSentence.length > 10) {
        phrases.push(firstSentence.slice(0, 30).toLowerCase());
      }
    }

    const fullText = textLayer.textContent?.toLowerCase() ?? "";
    
    // Find the phrase with the best match
    let bestPhrase = "";
    let bestIdx = -1;
    for (const phrase of phrases) {
      const idx = fullText.indexOf(phrase);
      if (idx > -1 && (bestIdx === -1 || phrase.length > bestPhrase.length)) {
        bestIdx = idx;
        bestPhrase = phrase;
      }
    }

    if (bestIdx === -1) return;

    // Walk the text layer and find the node containing our match
    const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent ?? "";
      const nodeStart = charCount;
      const nodeEnd = charCount + text.length;
      
      // Check if this node contains our target
      if (nodeStart <= bestIdx && bestIdx < nodeEnd) {
        const localIdx = bestIdx - nodeStart;
        const range = document.createRange();
        range.setStart(node, localIdx);
        
        // Try to extend the highlight to cover multiple nodes if needed
        const highlightLen = Math.min(bestPhrase.length, text.length - localIdx);
        range.setEnd(node, localIdx + highlightLen);
        
        const mark = document.createElement("mark");
        mark.className = "pdf-highlight";
        mark.style.cssText = "background: rgba(251,191,36,0.55); border-radius:3px; padding: 2px 0; box-shadow: 0 0 0 3px rgba(251,191,36,0.35); font-weight:500;";
        
        try {
          range.surroundContents(mark);
          // Scroll into view
          mark.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch { /* ignore cross-node ranges */ }
        break;
      }
      charCount = nodeEnd;
    }
  }, []);

  if (!active) return null;

  // Deduplicate sources for tabs
  const uniqueSources = sourceMeta.reduce<SourceMeta[]>((acc, s) => {
    if (!acc.find((x) => x.sectionTitle === s.sectionTitle && x.documentId === s.documentId)) acc.push(s);
    return acc;
  }, []);

  // PDF width: fill container with 24px padding on each side
  const pdfWidth = containerWidth > 0 ? containerWidth - 48 : undefined;

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-gradient-to-r from-white to-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm flex-shrink-0">
            <BookOpen className="h-5 w-5" weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{active.documentName}</p>
            <p className="text-xs text-slate-500 truncate">§ {active.sectionTitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="ml-3 rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0">
          <X className="h-4 w-4" weight="bold" />
        </button>
      </div>

      {/* ── Source tabs ── */}
      {uniqueSources.length > 1 && (
        <div className="flex gap-1.5 border-b border-slate-200 px-4 py-2.5 overflow-x-auto flex-shrink-0 bg-slate-50">
          {uniqueSources.map((s, i) => {
            const idx = sourceMeta.findIndex((x) => x.sectionTitle === s.sectionTitle && x.documentId === s.documentId);
            const isActive = s.sectionTitle === active.sectionTitle && s.documentId === active.documentId;
            return (
              <button
                key={i}
                onClick={() => onSelectSource(idx)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  isActive
                    ? "bg-[#3C3B6E] text-white shadow-md"
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {s.sectionTitle.length > 35 ? s.sectionTitle.substring(0, 35) + "…" : s.sectionTitle}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Highlight banner ── */}
      <div className="flex items-center gap-2.5 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-2.5 flex-shrink-0">
        <Highlighter className="h-4 w-4 text-amber-600 flex-shrink-0" weight="fill" />
        <p className="text-[11px] text-amber-800 font-medium leading-snug">
          <span className="font-bold">{active.sectionTitle}</span>{" "}
          <span className="text-amber-600">· {Math.round(active.score * 100)}% match</span>
        </p>
      </div>

      {/* ── PDF Viewer — single page, fitted to container ── */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center p-6">
        <Document
          file={pdfPath}
          onLoadSuccess={({ numPages: n }) => { setNumPages(n); }}
          onLoadError={(e) => console.error("PDF load error:", e)}
          loading={
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <FilePdf className="h-12 w-12 text-slate-300 animate-pulse" weight="duotone" />
              <p className="text-sm text-slate-400 font-medium">Loading PDF…</p>
            </div>
          }
        >
          <div
            ref={pageRef}
            className="bg-white rounded-lg shadow-xl ring-1 ring-slate-200 overflow-hidden"
          >
            <Page
              pageNumber={currentPage}
              width={pdfWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onRenderSuccess={() => {
                if (currentPage === targetPage) {
                  setTimeout(() => highlightPageText(active.chunkContent), 200);
                }
              }}
            />
          </div>
        </Document>
      </div>

      {/* ── Page Navigation ── */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 flex-shrink-0">
        {/* Source navigation */}
        <button
          onClick={() => onSelectSource(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Prev
        </button>

        {/* Page controls — center */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <CaretLeft className="h-4 w-4" weight="bold" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">{currentPage}</span>
            <span className="text-xs text-slate-400">of {numPages || "…"}</span>
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <CaretRight className="h-4 w-4" weight="bold" />
          </button>
          {/* Jump to source page */}
          {currentPage !== targetPage && (
            <button
              onClick={() => setCurrentPage(targetPage)}
              className="ml-2 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200 transition"
            >
              Jump to p.{targetPage}
            </button>
          )}
        </div>

        {/* Source navigation */}
        <button
          onClick={() => onSelectSource(Math.min(sourceMeta.length - 1, activeIndex + 1))}
          disabled={activeIndex === sourceMeta.length - 1}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
        >
          Next <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
