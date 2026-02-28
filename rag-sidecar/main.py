# Created by Sankritya on Feb 27, 2026
# RAG Sidecar — Production-grade FastAPI RAG server
# Pipeline: PDF parse → Groq contextual chunking (cached) → BM25 + cosine hybrid → Groq query expansion
# Scalable: hash-based disk cache for chunks+embeddings, multi-doc support, /ingest endpoint

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import bm25s
import pymupdf
from sentence_transformers import SentenceTransformer
from groq import Groq, RateLimitError
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("rag-sidecar")

# ─── Config ───────────────────────────────────────────────────────────────────

SIDECAR_DIR    = Path(__file__).parent
DOCS_DIR       = SIDECAR_DIR / "docs"          # drop PDFs here — any number
CACHE_DIR      = SIDECAR_DIR / ".cache"        # persists between restarts
EMBED_MODEL    = "all-MiniLM-L6-v2"
CHUNK_SIZE     = 100    # words per chunk
OVERLAP        = 50     # word overlap between adjacent chunks
MIN_CHUNK_WORDS = 30    # skip pages shorter than this
FINAL_TOP_K    = 5      # results returned per query
GROQ_MODEL     = "llama-3.1-8b-instant"
GROQ_MAX_RETRIES = 5    # retries on rate-limit / transient errors
GROQ_BASE_DELAY  = 1.0  # seconds — doubles on each retry

DOCS_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# ─── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(title="CivIQ RAG Sidecar", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global in-memory index ───────────────────────────────────────────────────

embedder: Optional[SentenceTransformer] = None
chunks:   List[dict] = []          # all indexed chunks across all docs
bm25_index: Optional[bm25s.BM25] = None
_ingesting = False                 # guard against concurrent /ingest calls

# ─── Groq client with retry ───────────────────────────────────────────────────

_groq: Optional[Groq] = None

def get_groq() -> Optional[Groq]:
    global _groq
    if _groq is None:
        key = os.environ.get("GROQ_API_KEY", "")
        if key:
            _groq = Groq(api_key=key)
    return _groq


def groq_call(messages: list, max_tokens: int = 60) -> Optional[str]:
    """
    Call Groq with exponential backoff on rate-limit / server errors.
    Returns the response text or None on persistent failure.
    """
    client = get_groq()
    if not client:
        return None
    delay = GROQ_BASE_DELAY
    for attempt in range(GROQ_MAX_RETRIES):
        try:
            resp = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.0,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip().strip('"').strip("'")
        except RateLimitError:
            log.warning("Groq rate limit — sleeping %.1fs (attempt %d/%d)", delay, attempt + 1, GROQ_MAX_RETRIES)
            time.sleep(delay)
            delay = min(delay * 2, 60.0)
        except Exception as exc:
            log.warning("Groq error: %s — sleeping %.1fs (attempt %d/%d)", exc, delay, attempt + 1, GROQ_MAX_RETRIES)
            time.sleep(delay)
            delay = min(delay * 2, 60.0)
    log.error("Groq call failed after %d retries", GROQ_MAX_RETRIES)
    return None

# ─── PDF hashing ──────────────────────────────────────────────────────────────

def file_hash(path: Path) -> str:
    """SHA-256 of file content — used as cache key."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()[:16]

# ─── PDF Parsing ──────────────────────────────────────────────────────────────

TABLE_MARKERS = {"what", "how", "action", "column", "description", "issue"}


def _stem(w: str) -> str:
    w = w.lower()
    if w.endswith("ing") and len(w) > 5: return w[:-3]
    if w.endswith("es")  and len(w) > 4: return w[:-2]
    if w.endswith("s")   and len(w) > 3: return w[:-1]
    return w


def extract_title(prefix: str, rest: str) -> str:
    words = rest.strip().split()
    title_words: list[str] = []
    seen_stems: set[str] = set()
    for w in words:
        if len(title_words) >= 8: break
        wl = w.lower()
        stem = _stem(wl)
        if w and w[0].isdigit(): break
        if wl in TABLE_MARKERS and len(title_words) >= 3: break
        if stem in seen_stems  and len(title_words) >= 2: break
        seen_stems.add(stem)
        title_words.append(w)
    return (prefix + " " + " ".join(title_words)).strip()


def detect_heading(text: str) -> Optional[str]:
    sub = re.search(r'\b(\d+\.\d+(?:\.\d+)?)\s+([A-Z].+)', text)
    if sub: return extract_title(sub.group(1), sub.group(2))
    sec = re.search(r'\b(Section\s+\d+\s*[:\-\u2013]?)\s+([A-Z].+)', text)
    if sec: return extract_title(sec.group(1), sec.group(2))
    return None


def parse_pdf(pdf_path: Path) -> List[dict]:
    """Parse PDF → list of {page_num, text, title, doc_id, doc_name}."""
    doc_id   = file_hash(pdf_path)
    doc_name = pdf_path.stem.replace("_", " ").replace("-", " ").title()
    pymupdf_doc = pymupdf.open(str(pdf_path))
    pages: List[dict] = []
    last_title = "Introduction"

    for pg in range(pymupdf_doc.page_count):
        text = " ".join(pymupdf_doc[pg].get_text("text").split())
        if len(text.strip()) < 30:
            continue
        detected = detect_heading(text)
        if detected:
            last_title = detected
        pages.append({
            "page_num":  pg + 1,
            "text":      text,
            "title":     last_title,
            "doc_id":    doc_id,
            "doc_name":  doc_name,
        })

    pymupdf_doc.close()
    log.info("Parsed %d pages from %s", len(pages), pdf_path.name)
    return pages

# ─── Groq Contextual Chunk Generation (Anthropic technique) ──────────────────

def generate_chunk_context(chunk_text: str, section_title: str, doc_name: str) -> str:
    """
    Generate a 1-sentence context description via Groq.
    Domain-agnostic: uses doc_name instead of hardcoded 'poll worker'.
    Falls back to section-title prefix if Groq unavailable.
    """
    result = groq_call([{
        "role": "user",
        "content": (
            f"Document: {doc_name}\n"
            f"Section: {section_title}\n"
            f"Chunk: {chunk_text[:500]}\n\n"
            f"Write one short sentence (max 20 words) describing what this chunk covers. "
            f"You MUST include any specific times, numbers, deadlines, or key action verbs mentioned. "
            f"Answer ONLY with the sentence."
        )
    }], max_tokens=60)

    if result:
        time.sleep(0.12)   # ~8 req/s — safely within 30 req/min free tier
        return f"{result} | [{section_title}] {chunk_text}"
    return f"[{section_title}] {chunk_text}"

# ─── Disk Cache ───────────────────────────────────────────────────────────────

def cache_path(doc_hash: str) -> Path:
    return CACHE_DIR / f"{doc_hash}.json"

def emb_cache_path(doc_hash: str) -> Path:
    return CACHE_DIR / f"{doc_hash}.npy"


def load_chunk_cache(doc_hash: str) -> Optional[List[dict]]:
    """Load cached chunks (without embeddings) from disk."""
    cp = cache_path(doc_hash)
    ep = emb_cache_path(doc_hash)
    if not cp.exists() or not ep.exists():
        return None
    try:
        cached = json.loads(cp.read_text())
        embeddings = np.load(str(ep))
        if len(cached) != len(embeddings):
            log.warning("Cache mismatch for %s — will re-ingest", doc_hash)
            return None
        for c, emb in zip(cached, embeddings):
            c["embedding"] = emb
        log.info("✅ Loaded %d chunks from cache (%s)", len(cached), doc_hash[:8])
        return cached
    except Exception as exc:
        log.warning("Cache load failed (%s): %s", doc_hash[:8], exc)
        return None


def save_chunk_cache(doc_hash: str, chunk_list: List[dict]) -> None:
    """Persist chunks + embeddings to disk."""
    try:
        # Save JSON (everything except numpy array)
        serialisable = [{k: v for k, v in c.items() if k != "embedding"} for c in chunk_list]
        cache_path(doc_hash).write_text(json.dumps(serialisable, ensure_ascii=False))
        # Save embeddings as numpy array
        embeddings = np.stack([c["embedding"] for c in chunk_list])
        np.save(str(emb_cache_path(doc_hash)), embeddings)
        log.info("💾 Cached %d chunks to disk (%s)", len(chunk_list), doc_hash[:8])
    except Exception as exc:
        log.warning("Cache save failed: %s", exc)

# ─── Chunking ─────────────────────────────────────────────────────────────────

def chunk_pages(pages: List[dict]) -> List[dict]:
    """
    Sliding-window chunks within each page (never crosses page boundaries).
    Uses Groq contextual generation if available (with disk cache for each doc).
    """
    all_chunks: List[dict] = []
    chunk_counter = 0

    for p in pages:
        words = p["text"].split()
        if len(words) < MIN_CHUNK_WORDS:
            continue
        step  = max(1, CHUNK_SIZE - OVERLAP)
        start = 0
        while start < len(words):
            slice_words = words[start: start + CHUNK_SIZE]
            if len(slice_words) < 15:
                break
            raw = " ".join(slice_words)
            all_chunks.append({
                "id":                f"chunk-{chunk_counter}",
                "page":              p["page_num"],
                "section_title":     p["title"],
                "doc_id":            p["doc_id"],
                "doc_name":          p["doc_name"],
                "raw_content":       raw,
                "contextual_content": None,   # filled next
                "embedding":         None,    # filled later
            })
            chunk_counter += 1
            start += step

    return all_chunks


def enrich_with_context(chunk_list: List[dict]) -> List[dict]:
    """
    Fill contextual_content for each chunk.
    Uses Groq if available (with per-chunk rate-limit safe delay).
    Falls back to section-title prefix if Groq not configured.
    """
    use_groq = get_groq() is not None
    total = len(chunk_list)
    log.info("%s contextual content for %d chunks...",
             "🧠 Generating LLM" if use_groq else "📝 Using title prefix for", total)

    for i, c in enumerate(chunk_list):
        if use_groq:
            c["contextual_content"] = generate_chunk_context(
                c["raw_content"], c["section_title"], c["doc_name"]
            )
            if (i + 1) % 10 == 0:
                log.info("  context: %d/%d chunks done", i + 1, total)
        else:
            c["contextual_content"] = f"[{c['section_title']}] {c['raw_content']}"

    return chunk_list

# ─── Embeddings ───────────────────────────────────────────────────────────────

def embed_chunks(chunk_list: List[dict], model: SentenceTransformer) -> List[dict]:
    texts   = [c["contextual_content"] for c in chunk_list]
    log.info("🔢 Embedding %d chunks with %s...", len(texts), EMBED_MODEL)
    vectors = model.encode(texts, batch_size=32, show_progress_bar=True, normalize_embeddings=True)
    for c, vec in zip(chunk_list, vectors):
        c["embedding"] = vec
    log.info("✅ Embeddings done")
    return chunk_list

# ─── BM25 Index ───────────────────────────────────────────────────────────────

def build_bm25(chunk_list: List[dict]) -> bm25s.BM25:
    corpus    = [c["contextual_content"] for c in chunk_list]
    tokenized = bm25s.tokenize(corpus, stopwords="en")
    retriever = bm25s.BM25(corpus=corpus)
    retriever.index(tokenized)
    log.info("📚 BM25 index built over %d chunks", len(corpus))
    return retriever

# ─── Full ingestion for one PDF ───────────────────────────────────────────────

def ingest_pdf(pdf_path: Path) -> List[dict]:
    """
    Full ingestion pipeline for a single PDF.
    Returns a list of fully enriched + embedded chunks.
    Caches results to disk — subsequent restarts skip Groq calls and re-embedding.
    """
    doc_hash = file_hash(pdf_path)

    # ── Try disk cache first ──────────────────────────────────────────────────
    cached = load_chunk_cache(doc_hash)
    if cached is not None:
        return cached

    log.info("🆕 Ingesting %s (hash %s)...", pdf_path.name, doc_hash[:8])

    # 1. Parse
    pages = parse_pdf(pdf_path)

    # 2. Chunk (without context yet)
    doc_chunks = chunk_pages(pages)

    # 3. Groq contextual enrichment
    doc_chunks = enrich_with_context(doc_chunks)

    # 4. Embed
    doc_chunks = embed_chunks(doc_chunks, embedder)

    # 5. Save to disk cache
    save_chunk_cache(doc_hash, doc_chunks)

    return doc_chunks

# ─── Scan docs/ folder and ingest everything ─────────────────────────────────

def ingest_all_docs() -> None:
    """Scan docs/ for PDFs, ingest each, merge into global index."""
    global chunks, bm25_index

    pdf_files = sorted(DOCS_DIR.glob("**/*.pdf"))
    if not pdf_files:
        log.warning("⚠️  No PDFs found in %s", DOCS_DIR)
        return

    log.info("📂 Found %d PDF(s) in docs/", len(pdf_files))
    all_chunks: List[dict] = []
    for pdf in pdf_files:
        doc_chunks = ingest_pdf(pdf)
        all_chunks.extend(doc_chunks)
        log.info("  ✅ %s → %d chunks", pdf.name, len(doc_chunks))

    chunks     = all_chunks
    bm25_index = build_bm25(chunks)
    log.info("🧠 RAG sidecar ready — %d total chunks across %d doc(s)", len(chunks), len(pdf_files))

# ─── Retrieval ────────────────────────────────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def normalize_scores(scored: List[tuple]) -> Dict[str, float]:
    if not scored:
        return {}
    scores = [s for _, s in scored]
    mn, mx = min(scores), max(scores)
    if mx == mn:
        return {cid: 1.0 for cid, _ in scored}
    return {cid: (s - mn) / (mx - mn) for cid, s in scored}


def expand_query(query: str) -> str:
    """
    Groq-powered query expansion: convert natural-language question to
    specific verbatim keywords from the document domain.
    Falls back to original query if Groq unavailable.
    """
    # Infer doc names for the prompt so it's domain-agnostic
    doc_names = list({c["doc_name"] for c in chunks})
    docs_label = ", ".join(doc_names[:3]) or "training document"

    result = groq_call([{
        "role": "user",
        "content": (
            f"You are helping search these documents: {docs_label}.\n"
            f"Query: {query}\n\n"
            f"Rewrite as 5-10 specific keywords (no filler words) that would appear "
            f"verbatim in the relevant section. Include specific times, numbers, or "
            f"action words the document would use. Answer ONLY with keywords separated by spaces."
        )
    }], max_tokens=40)

    if result:
        log.info("  🔍 Query expanded: '%s' → '%s'", query[:60], result[:60])
        return result
    return query


def hybrid_search(query: str, top_k: int = FINAL_TOP_K) -> List[dict]:
    """
    BM25 (expanded query) + cosine (original query) → normalized 50/50 fusion.
    Page-level deduplication: returns the best chunk per page.
    """
    if not chunks or bm25_index is None:
        return []

    search_query = expand_query(query)

    # ── BM25 ──────────────────────────────────────────────────────────────────
    q_tokens   = bm25s.tokenize([search_query], stopwords="en")
    bm25_res, bm25_scores = bm25_index.retrieve(q_tokens, k=len(chunks))
    text_to_id = {c["contextual_content"]: c["id"] for c in chunks}
    bm25_scored = []
    for doc_text, score in zip(bm25_res[0], bm25_scores[0]):
        cid = text_to_id.get(str(doc_text))
        if cid:
            bm25_scored.append((cid, float(score)))

    # ── Dense cosine ──────────────────────────────────────────────────────────
    q_vec = embedder.encode([query], normalize_embeddings=True)[0]
    cosine_scored = [(c["id"], cosine_similarity(q_vec, c["embedding"])) for c in chunks]

    # ── Fuse ──────────────────────────────────────────────────────────────────
    bm25_norm   = normalize_scores(bm25_scored)
    cosine_norm = normalize_scores(cosine_scored)
    all_ids     = set(bm25_norm) | set(cosine_norm)
    fused       = {
        cid: 0.6 * bm25_norm.get(cid, 0.0) + 0.4 * cosine_norm.get(cid, 0.0)
        for cid in all_ids
    }
    sorted_ids = sorted(fused, key=lambda x: -fused[x])

    # ── Build results (best chunk per page, cross-doc) ────────────────────────
    id_to_chunk = {c["id"]: c for c in chunks}
    results: List[dict] = []
    seen: set[tuple] = set()   # (doc_id, page) pairs to dedup

    for cid in sorted_ids:
        c = id_to_chunk.get(cid)
        if not c:
            continue
        key = (c["doc_id"], c["page"])
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "chunk_id":      c["id"],
            "page_number":   c["page"],
            "section_title": c["section_title"],
            "chunk_content": c["raw_content"],
            "score":         float(fused[cid]),
            "document_id":   c["doc_id"],
            "document_name": c["doc_name"],
        })
        if len(results) >= top_k:
            break

    return results

# ─── API Models ───────────────────────────────────────────────────────────────

class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5

class ChunkResult(BaseModel):
    chunk_id:      str
    page_number:   int
    section_title: str
    chunk_content: str
    score:         float
    document_id:   str
    document_name: str

class RetrieveResponse(BaseModel):
    results: List[ChunkResult]
    query:   str

class IngestResponse(BaseModel):
    status:      str
    chunks_total: int
    docs:        List[str]

# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global embedder
    log.info("🚀 RAG Sidecar v2 starting up...")
    log.info("🤖 Loading bi-encoder: %s", EMBED_MODEL)
    embedder = SentenceTransformer(EMBED_MODEL)
    log.info("✅ Embedding model loaded")
    ingest_all_docs()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    doc_names = list({c["doc_name"] for c in chunks})
    return {
        "status":  "ok" if chunks else "loading",
        "chunks":  len(chunks),
        "docs":    doc_names,
        "model":   EMBED_MODEL,
        "cache_dir": str(CACHE_DIR),
    }


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(req: RetrieveRequest):
    if not chunks:
        raise HTTPException(status_code=503, detail="Knowledge base not loaded yet")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return RetrieveResponse(results=hybrid_search(req.query, req.top_k), query=req.query)


@app.post("/ingest", response_model=IngestResponse)
def ingest(background_tasks: BackgroundTasks):
    """
    Trigger re-ingestion of all PDFs in docs/.
    New/updated PDFs (changed hash) are processed; unchanged ones load from cache instantly.
    Safe to call while the server is live — runs in background.
    """
    global _ingesting
    if _ingesting:
        raise HTTPException(status_code=409, detail="Ingestion already in progress")
    _ingesting = True

    def _run():
        global _ingesting
        try:
            ingest_all_docs()
        finally:
            _ingesting = False

    background_tasks.add_task(_run)
    return IngestResponse(
        status="ingestion started",
        chunks_total=len(chunks),
        docs=[c["doc_name"] for c in chunks[:1]],
    )


@app.get("/docs")
def list_docs():
    """List all indexed documents."""
    seen: dict[str, dict] = {}
    for c in chunks:
        if c["doc_id"] not in seen:
            seen[c["doc_id"]] = {"doc_id": c["doc_id"], "doc_name": c["doc_name"], "chunks": 0}
        seen[c["doc_id"]]["chunks"] += 1
    return list(seen.values())


@app.get("/chunks")
def list_chunks():
    """Debug: list all indexed chunks (truncated contextual content)."""
    return [{
        "id":    c["id"],
        "page":  c["page"],
        "doc":   c["doc_name"],
        "title": c["section_title"],
        "words": len(c["raw_content"].split()),
        "ctx":   c.get("contextual_content", "")[:150],
    } for c in chunks]


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
