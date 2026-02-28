# Created by Sankritya on Feb 27, 2026
# RAG Sidecar — Production-grade FastAPI RAG server
# Pipeline: PDF parse → Local LLM contextual chunking (cached) → BM25 + cosine hybrid → Local LLM query expansion
# LLM backend: Ollama (local, primary) → Groq (cloud, fallback)
# Scalable: hash-based disk cache for chunks+embeddings, multi-doc support, /ingest endpoint

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import math
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import urllib.request
import urllib.error
import numpy as np
import bm25s
import pymupdf
from sentence_transformers import SentenceTransformer
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
try:
    from groq import Groq, RateLimitError
    _GROQ_AVAILABLE = True
except ImportError:
    _GROQ_AVAILABLE = False

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
# ── Local Ollama config (primary LLM backend) ────────────────────────────────
OLLAMA_URL       = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL     = os.environ.get("OLLAMA_MODEL", "llama3.2:3b-instruct-q4_K_M")
# ── Groq config (optional cloud fallback) ─────────────────────────────────────
GROQ_MODEL       = "llama-3.1-8b-instant"
GROQ_MAX_RETRIES = 2    # fewer retries now that Ollama is primary
GROQ_BASE_DELAY  = 1.0  # seconds

_ollama_available: Optional[bool] = None  # cached after first check

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

# ─── Ollama (local, primary LLM) ─────────────────────────────────────────────

def is_ollama_up() -> bool:
    """Check if Ollama is running and the target model is available."""
    global _ollama_available
    if _ollama_available is not None:
        return _ollama_available
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=2) as r:
            data = json.loads(r.read())
            models = [m["name"] for m in data.get("models", [])]
            # Accept partial match (e.g. "llama3.2:3b" matches "llama3.2:3b-instruct-q4_K_M")
            base = OLLAMA_MODEL.split(":")[0]
            _ollama_available = any(base in m for m in models)
            if _ollama_available:
                log.info("✅ Ollama is up — using local model: %s", OLLAMA_MODEL)
            else:
                log.warning("⚠️  Ollama running but model '%s' not found. Run: ollama pull %s", OLLAMA_MODEL, OLLAMA_MODEL)
    except Exception:
        _ollama_available = False
        log.info("ℹ️  Ollama not running — will use Groq fallback")
    return _ollama_available


def ollama_call(messages: list, max_tokens: int = 60) -> Optional[str]:
    """Call local Ollama with OpenAI-compatible /api/chat endpoint."""
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.0, "num_predict": max_tokens},
    }).encode()
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
            return data["message"]["content"].strip().strip('"').strip("'")
    except Exception as exc:
        log.warning("Ollama call failed: %s", exc)
        return None


# ─── Groq (cloud, optional fallback) ─────────────────────────────────────────

_groq = None

def get_groq():
    global _groq
    if not _GROQ_AVAILABLE:
        return None
    if _groq is None:
        key = os.environ.get("GROQ_API_KEY", "")
        if key:
            _groq = Groq(api_key=key)
    return _groq


def groq_call(messages: list, max_tokens: int = 60) -> Optional[str]:
    """Groq fallback — only used when Ollama is unavailable."""
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
        except Exception as exc:
            err_str = str(exc)
            if "401" in err_str or "invalid_api_key" in err_str:
                log.error("❌ Groq API key invalid — set GROQ_API_KEY in .env.local")
                return None
            log.warning("Groq error: %s (attempt %d/%d)", exc, attempt + 1, GROQ_MAX_RETRIES)
            time.sleep(delay)
            delay = min(delay * 2, 30.0)
    return None


# ─── Unified LLM call: Ollama → Groq → None ──────────────────────────────────

def llm_call(messages: list, max_tokens: int = 60) -> Optional[str]:
    """Try Ollama first (local), fall back to Groq (cloud)."""
    if is_ollama_up():
        result = ollama_call(messages, max_tokens)
        if result:
            return result
        log.warning("Ollama call returned empty — falling back to Groq")
    return groq_call(messages, max_tokens)

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

# ─── Contextual Chunk Generation (Anthropic technique) ──────────────────────

def generate_chunk_context(chunk_text: str, section_title: str, doc_name: str) -> str:
    """
    Generate a 1-sentence context description via local LLM (Ollama) or Groq fallback.
    Domain-agnostic: uses doc_name instead of hardcoded 'poll worker'.
    Falls back to section-title prefix if no LLM available.
    """
    result = llm_call([{
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
    LLM-powered query expansion: convert natural-language question to
    specific verbatim keywords from the document domain.
    Uses Ollama (local) first, falls back to Groq, then returns original query.
    """
    # Infer doc names for the prompt so it's domain-agnostic
    doc_names = list({c["doc_name"] for c in chunks})
    docs_label = ", ".join(doc_names[:3]) or "training document"

    result = llm_call([{
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


# ═══════════════════════════════════════════════════════════════════════════════
# VOTER SCORING SYSTEM — Created by Kinjal
# Two-pass scoring: deterministic pre-score (all rows) → Ollama AI enrichment (top N)
# ═══════════════════════════════════════════════════════════════════════════════

VOTER_CACHE_PATH = CACHE_DIR / "voter-scores.json"
VOTER_CSV_PATH   = CACHE_DIR / "voters.csv"
AI_ENRICH_TOP_N  = 100       # how many top candidates get Ollama AI reasons
AI_BATCH_SIZE    = 10        # candidates per Ollama call

# ─── In-memory voter store ────────────────────────────────────────────────────

voter_records: List[Dict[str, Any]]    = []   # raw parsed CSV rows
scored_voters: List[Dict[str, Any]]    = []   # scored + sorted candidates
_voter_scoring = False                        # guard against concurrent scoring
_voter_stats: Dict[str, Any]           = {}   # cached summary stats


REQUIRED_CSV_COLUMNS = {
    "id", "first_name", "last_name", "age", "city", "precinct",
    "languages", "registered_since", "previous_poll_worker", "availability",
}


def parse_voter_csv(raw_text: str) -> List[Dict[str, Any]]:
    """Parse CSV text into list of dicts with type coercion."""
    reader = csv.DictReader(io.StringIO(raw_text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    # Validate required columns
    columns = {c.strip().lower() for c in reader.fieldnames}
    missing = REQUIRED_CSV_COLUMNS - columns
    if missing:
        raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")

    rows: List[Dict[str, Any]] = []
    for raw_row in reader:
        # Normalize keys to lowercase stripped
        row = {k.strip().lower(): v.strip() if v else "" for k, v in raw_row.items()}
        try:
            row["age"] = int(row.get("age", 0))
        except (ValueError, TypeError):
            row["age"] = 0
        # Normalize boolean
        ppw = row.get("previous_poll_worker", "").lower()
        row["previous_poll_worker"] = ppw in ("true", "1", "yes")
        rows.append(row)

    return rows


def is_eligible(voter: Dict[str, Any]) -> bool:
    """
    Rigorous tiered eligibility filter.  A candidate must pass hard requirements
    AND qualify through one of three tiers.  Designed to keep the pool at
    roughly 10-20 % of uploaded records.

    Tiers (any one is sufficient after hard requirements):
      1. Bilingual AND previous poll worker  → always qualifies
      2. Experienced + registered 8yr+ + age 28-62
      3. Bilingual  + registered 10yr+ + age 28-60
    """
    # ── Hard requirements (instant reject) ──────────────────────────────────
    age = voter.get("age", 0)
    if age < 25 or age > 68:
        return False

    if not voter.get("first_name") or not voter.get("last_name"):
        return False
    if not voter.get("city") or not voter.get("precinct"):
        return False

    languages = voter.get("languages", "").strip()
    if not languages:
        return False

    reg_date_str = voter.get("registered_since", "")
    try:
        reg_year = datetime.strptime(reg_date_str, "%Y-%m-%d").year
        years_registered = datetime.now().year - reg_year
    except (ValueError, TypeError):
        return False

    if years_registered < 3:
        return False

    # ── Derived flags ───────────────────────────────────────────────────────
    is_bilingual = "," in languages
    is_experienced = bool(voter.get("previous_poll_worker"))

    # ── Tier 1: bilingual AND experienced → always qualifies ───────────────
    if is_experienced and is_bilingual:
        return True

    # ── Tier 2: experienced + long registration + prime age ────────────────
    if is_experienced and years_registered >= 8 and 28 <= age <= 62:
        return True

    # ── Tier 3: bilingual + very long registration + prime age ─────────────
    if is_bilingual and years_registered >= 10 and 28 <= age <= 60:
        return True

    return False


def deterministic_score(voter: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pass 1: Fast rule-based scoring. Returns score (0-100) + list of reason fragments.
    Runs on ALL rows instantly.
    """
    score = 40
    reasons: List[str] = []

    # Previous poll worker experience → strongest signal
    if voter.get("previous_poll_worker"):
        score += 25
        reasons.append("prior poll worker experience")

    # Bilingual
    langs = [l.strip() for l in voter.get("languages", "").split(",") if l.strip()]
    if len(langs) > 1:
        score += 15
        non_english = [l for l in langs if l.lower() != "english"]
        reasons.append(f"bilingual ({', '.join(non_english)})")

    # Registration longevity
    reg_date_str = voter.get("registered_since", "")
    years_registered = 0
    if reg_date_str:
        try:
            reg_year = datetime.strptime(reg_date_str, "%Y-%m-%d").year
            years_registered = datetime.now().year - reg_year
            if years_registered >= 10:
                score += 10
                reasons.append(f"registered {years_registered} years (high civic engagement)")
            elif years_registered >= 5:
                score += 7
                reasons.append(f"registered {years_registered} years")
        except ValueError:
            pass

    # Availability
    if voter.get("availability", "").lower() == "available":
        score += 5
        reasons.append("marked available")

    # Prime working age bonus
    age = voter.get("age", 0)
    if 25 <= age <= 65:
        score += 5
        reasons.append(f"age {age} (prime working range)")
    elif 18 <= age < 25:
        score += 3
        reasons.append(f"age {age} (young voter engagement)")

    return {
        "score": min(score, 100),
        "reasons": reasons,
        "reason_text": ", ".join(reasons) if reasons else "meets basic eligibility",
    }


def build_candidate(voter: Dict[str, Any], score_data: Dict[str, Any], ai_enriched: bool = False) -> Dict[str, Any]:
    """Transform a raw voter row + score into a candidate dict for the API."""
    langs = [l.strip() for l in voter.get("languages", "").split(",") if l.strip()]
    return {
        "id":                 voter.get("id", ""),
        "firstName":          voter.get("first_name", ""),
        "lastName":           voter.get("last_name", ""),
        "name":               f"{voter.get('first_name', '')} {voter.get('last_name', '')}",
        "age":                voter.get("age", 0),
        "address":            voter.get("address", ""),
        "city":               voter.get("city", ""),
        "precinct":           voter.get("precinct", ""),
        "zip":                voter.get("zip", ""),
        "languages":          langs,
        "registeredSince":    voter.get("registered_since", ""),
        "party":              voter.get("party", ""),
        "email":              voter.get("email", ""),
        "phone":              voter.get("phone", ""),
        "previousPollWorker": voter.get("previous_poll_worker", False),
        "availability":       voter.get("availability", ""),
        "aiScore":            score_data["score"],
        "aiReason":           score_data["reason_text"],
        "aiEnriched":         ai_enriched,
    }


def ai_enrich_batch(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Pass 2: Use Ollama to generate refined scores + natural-language reasons
    for a batch of top candidates. Only called for top N candidates.
    """
    if not is_ollama_up():
        log.info("⚠️  Ollama not available — skipping AI enrichment")
        return candidates

    log.info("🧠 AI-enriching %d candidates via Ollama...", len(candidates))
    enriched = 0

    for i in range(0, len(candidates), AI_BATCH_SIZE):
        batch = candidates[i:i + AI_BATCH_SIZE]

        # Build a single prompt with all candidates in this batch
        profiles = []
        for j, c in enumerate(batch):
            profiles.append(
                f"{j+1}. {c['name']}, age {c['age']}, {c['city']} ({c['precinct']}), "
                f"languages: {', '.join(c['languages'])}, "
                f"registered since: {c['registeredSince']}, "
                f"previous poll worker: {'yes' if c['previousPollWorker'] else 'no'}, "
                f"current score: {c['aiScore']}"
            )

        prompt = (
            "You are an election official AI assistant evaluating poll worker candidates.\n"
            "For each candidate below, provide a REFINED score (0-100) and a brief 1-sentence reason "
            "explaining why they would be a good or poor poll worker.\n"
            "Consider: civic engagement, bilingual ability, experience, age diversity, and availability.\n\n"
            "Candidates:\n" + "\n".join(profiles) + "\n\n"
            "Respond ONLY in this exact format, one line per candidate:\n"
            "1. SCORE: <number> | REASON: <one sentence>\n"
            "2. SCORE: <number> | REASON: <one sentence>\n"
            "... and so on. No other text."
        )

        result = ollama_call([{"role": "user", "content": prompt}], max_tokens=500)
        if not result:
            continue

        # Parse the response
        lines = result.strip().split("\n")
        for line in lines:
            match = re.match(r"(\d+)\.\s*SCORE:\s*(\d+)\s*\|\s*REASON:\s*(.+)", line.strip())
            if match:
                idx = int(match.group(1)) - 1
                ai_score = int(match.group(2))
                ai_reason = match.group(3).strip()
                if 0 <= idx < len(batch):
                    # Blend: 40% deterministic + 60% AI
                    blended = round(0.4 * batch[idx]["aiScore"] + 0.6 * min(ai_score, 100))
                    batch[idx]["aiScore"] = blended
                    batch[idx]["aiReason"] = ai_reason
                    batch[idx]["aiEnriched"] = True
                    enriched += 1

        if (i + AI_BATCH_SIZE) < len(candidates):
            log.info("  AI enriched: %d/%d done", min(i + AI_BATCH_SIZE, len(candidates)), len(candidates))

    log.info("✅ AI enrichment complete — %d/%d candidates enriched", enriched, len(candidates))
    return candidates


def score_all_voters() -> None:
    """Full scoring pipeline: eligibility filter → deterministic pre-score → sort → AI enrich top N → cache."""
    global scored_voters, _voter_stats

    if not voter_records:
        log.warning("No voter records loaded — nothing to score")
        return

    log.info("📊 Processing %d voter records...", len(voter_records))
    t0 = time.time()

    # Filter eligible voters first
    eligible_voters = [v for v in voter_records if is_eligible(v)]
    log.info("✅ %d eligible voters identified from %d total records", len(eligible_voters), len(voter_records))
    
    if not eligible_voters:
        log.warning("No eligible voters found")
        scored_voters = []
        return

    # Pass 1: deterministic scoring (only on eligible)
    all_candidates: List[Dict[str, Any]] = []
    for v in eligible_voters:
        sd = deterministic_score(v)
        all_candidates.append(build_candidate(v, sd))

    # Sort by score descending
    all_candidates.sort(key=lambda c: -c["aiScore"])

    # Pass 2: AI enrich top N
    top_n = all_candidates[:AI_ENRICH_TOP_N]
    top_n = ai_enrich_batch(top_n)

    # Re-sort after AI enrichment
    all_candidates[:AI_ENRICH_TOP_N] = top_n
    all_candidates.sort(key=lambda c: -c["aiScore"])

    scored_voters = all_candidates
    elapsed = time.time() - t0
    log.info("✅ Scoring complete in %.1fs — %d candidates scored", elapsed, len(scored_voters))

    # Compute stats
    cities = {}
    precincts = {}
    lang_set = set()
    bilingual_count = 0
    experienced_count = 0
    avg_score = 0

    for c in scored_voters:
        cities[c["city"]] = cities.get(c["city"], 0) + 1
        precincts[c["precinct"]] = precincts.get(c["precinct"], 0) + 1
        for l in c["languages"]:
            lang_set.add(l)
        if len(c["languages"]) > 1:
            bilingual_count += 1
        if c["previousPollWorker"]:
            experienced_count += 1
        avg_score += c["aiScore"]

    avg_score = avg_score / len(scored_voters) if scored_voters else 0

    _voter_stats = {
        "loaded": True,
        "scoring": False,
        "totalRecords": len(voter_records),
        "totalScored": len(scored_voters),  # Only eligible voters are scored
        "eligibleCount": len(eligible_voters),
        "aiEnrichedCount": sum(1 for c in scored_voters if c.get("aiEnriched")),
        "bilingualCount": bilingual_count,
        "experiencedCount": experienced_count,
        "avgScore": round(avg_score, 1),
        "cities": sorted(cities.keys()),
        "cityCounts": cities,
        "precincts": sorted(precincts.keys()),
        "precinctCounts": precincts,
        "languages": sorted(lang_set),
    }

    # Cache to disk
    try:
        serialisable = []
        for c in scored_voters:
            serialisable.append(c)
        VOTER_CACHE_PATH.write_text(json.dumps({
            "stats": _voter_stats,
            "candidates": serialisable,
        }, ensure_ascii=False, default=str))
        log.info("💾 Voter scores cached to disk")
    except Exception as exc:
        log.warning("Cache save failed: %s", exc)


def load_voter_cache() -> bool:
    """Try loading previously scored voters from disk cache."""
    global voter_records, scored_voters, _voter_stats
    if not VOTER_CACHE_PATH.exists():
        return False
    if not VOTER_CSV_PATH.exists():
        return False
    try:
        # Load raw CSV
        raw = VOTER_CSV_PATH.read_text(encoding="utf-8")
        voter_records = parse_voter_csv(raw)
        # Load scored results
        cached = json.loads(VOTER_CACHE_PATH.read_text())
        scored_voters = cached.get("candidates", [])
        _voter_stats = cached.get("stats", {})
        log.info("✅ Loaded %d scored voters from cache", len(scored_voters))
        return True
    except Exception as exc:
        log.warning("Voter cache load failed: %s", exc)
        return False


# ─── Voter API Models ────────────────────────────────────────────────────────

class VoterFilterRequest(BaseModel):
    city: Optional[str] = None
    precinct: Optional[str] = None
    languages: Optional[List[str]] = None
    minAge: Optional[int] = None
    maxAge: Optional[int] = None
    minScore: Optional[int] = None
    experiencedOnly: Optional[bool] = None
    bilingualOnly: Optional[bool] = None
    page: int = 1
    pageSize: int = 50
    sortBy: str = "aiScore"
    sortDir: str = "desc"


# ─── Voter Routes ────────────────────────────────────────────────────────────

@app.post("/upload-voters")
async def upload_voters(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Upload a voter registration CSV. Parses, validates, stores, and kicks off scoring.
    """
    global voter_records, scored_voters, _voter_scoring

    if _voter_scoring:
        raise HTTPException(status_code=409, detail="Scoring already in progress")

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    raw = (await file.read()).decode("utf-8")

    try:
        voter_records = parse_voter_csv(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if len(voter_records) == 0:
        raise HTTPException(status_code=400, detail="CSV contains no data rows")

    # Save raw CSV to disk for cache reload
    VOTER_CSV_PATH.write_text(raw, encoding="utf-8")
    log.info("📥 Uploaded %d voter records from %s", len(voter_records), file.filename)

    # Kick off scoring in background
    _voter_scoring = True

    def _run_scoring():
        global _voter_scoring
        try:
            score_all_voters()
        finally:
            _voter_scoring = False

    background_tasks.add_task(_run_scoring)

    return {
        "status": "upload_complete",
        "totalRecords": len(voter_records),
        "message": f"Uploaded {len(voter_records)} records. Scoring started in background.",
        "scoring": True,
    }


@app.post("/score-voters")
def score_voters_endpoint(req: VoterFilterRequest):
    """
    Return scored + filtered + paginated candidates.
    Filters are applied server-side for performance.
    """
    if not scored_voters and not _voter_scoring:
        # Try loading from cache
        if not load_voter_cache():
            raise HTTPException(status_code=404, detail="No voter data uploaded yet. Upload a CSV first.")

    if _voter_scoring and not scored_voters:
        return {
            "candidates": [],
            "totalScored": 0,
            "totalFiltered": 0,
            "page": 1,
            "pageSize": req.pageSize,
            "totalPages": 0,
            "scoring": True,
        }

    # Apply filters
    filtered = scored_voters
    if req.city and req.city != "All":
        filtered = [c for c in filtered if c["city"] == req.city]
    if req.precinct and req.precinct != "All":
        filtered = [c for c in filtered if c["precinct"] == req.precinct]
    if req.languages:
        filtered = [c for c in filtered if any(l in c["languages"] for l in req.languages)]
    if req.minAge is not None:
        filtered = [c for c in filtered if c["age"] >= req.minAge]
    if req.maxAge is not None:
        filtered = [c for c in filtered if c["age"] <= req.maxAge]
    if req.minScore is not None:
        filtered = [c for c in filtered if c["aiScore"] >= req.minScore]
    if req.experiencedOnly:
        filtered = [c for c in filtered if c["previousPollWorker"]]
    if req.bilingualOnly:
        filtered = [c for c in filtered if len(c["languages"]) > 1]

    # Sort
    reverse = req.sortDir == "desc"
    if req.sortBy in ("aiScore", "age"):
        filtered.sort(key=lambda c: c.get(req.sortBy, 0), reverse=reverse)
    elif req.sortBy == "name":
        filtered.sort(key=lambda c: c.get("name", "").lower(), reverse=reverse)
    else:
        filtered.sort(key=lambda c: c.get("aiScore", 0), reverse=True)

    # Paginate
    total_filtered = len(filtered)
    total_pages = max(1, math.ceil(total_filtered / req.pageSize))
    page = max(1, min(req.page, total_pages))
    start = (page - 1) * req.pageSize
    end = start + req.pageSize
    page_candidates = filtered[start:end]

    return {
        "candidates": page_candidates,
        "totalScored": len(scored_voters),
        "totalFiltered": total_filtered,
        "page": page,
        "pageSize": req.pageSize,
        "totalPages": total_pages,
        "scoring": _voter_scoring,
    }


@app.get("/voter-stats")
def voter_stats_endpoint():
    """Return summary statistics for the uploaded voter dataset."""
    if not _voter_stats and not scored_voters:
        if not load_voter_cache():
            return {
                "loaded": False,
                "totalRecords": 0,
                "scoring": _voter_scoring,
            }

    return {
        "loaded": True,
        "scoring": _voter_scoring,
        **_voter_stats,
    }


@app.post("/rescore-voters")
async def rescore_voters(background_tasks: BackgroundTasks):
    """Force a full re-score of the current voter dataset."""
    global _voter_scoring
    if not voter_records:
        raise HTTPException(status_code=404, detail="No voter data loaded. Upload a CSV first.")
    if _voter_scoring:
        raise HTTPException(status_code=409, detail="Scoring already in progress")

    _voter_scoring = True

    def _run():
        global _voter_scoring
        try:
            score_all_voters()
        finally:
            _voter_scoring = False

    background_tasks.add_task(_run)
    return {"status": "rescoring", "totalRecords": len(voter_records)}


# ─── Load voter cache on startup ─────────────────────────────────────────────

@app.on_event("startup")
async def startup_voter_cache():
    """Try loading voter scores from disk cache at startup."""
    if load_voter_cache():
        log.info("📊 Voter dataset loaded from cache: %d records", len(voter_records))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
