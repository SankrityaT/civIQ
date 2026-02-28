# Created by Sankritya on Feb 27, 2026
# RAG Sidecar — Production-grade FastAPI RAG server
# Pipeline: PDF parse → Local LLM contextual chunking (cached) → BM25 + cosine hybrid → Local LLM query expansion
# LLM backend: Ollama (local, primary) → Groq (cloud, fallback)
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

import urllib.request
import urllib.error
import numpy as np
import bm25s
import pymupdf
from sentence_transformers import SentenceTransformer
from fastapi import BackgroundTasks, FastAPI, HTTPException
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
EMBED_MODEL    = "perplexity-ai/pplx-embed-v1-0.6b"  # SOTA 1024-dim, beats BGE/MiniLM on MTEB retrieval
CHUNK_SIZE     = 280   # words per chunk — pplx-embed handles long context, keeps procedures intact
OVERLAP        = 60    # word overlap between adjacent chunks — more overlap to avoid splitting facts
MIN_CHUNK_WORDS = 40   # skip pages shorter than this
FINAL_TOP_K    = 15    # return more chunks so factual answers aren't missed
# ── Local Ollama config (primary LLM backend) ────────────────────────────────
OLLAMA_URL       = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL     = os.environ.get("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")
# ── Groq config (optional cloud fallback) ─────────────────────────────────────
GROQ_MODEL       = "llama-3.1-8b-instant"
GROQ_MAX_RETRIES = 2    # fewer retries now that Ollama is primary
GROQ_BASE_DELAY  = 1.0  # seconds

_ollama_available: Optional[bool] = None  # cached, rechecked periodically
_ollama_checked_at: float = 0.0

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
# Page-level index for fallback retrieval (rescues answers missed by chunks)
pages_store:    List[dict] = []    # full page text + embeddings
pages_bm25:     Optional[bm25s.BM25] = None
_ingesting = False                 # guard against concurrent /ingest calls

# ─── Ollama (local, primary LLM) ─────────────────────────────────────────────

def is_ollama_up() -> bool:
    """Check if Ollama is running and the target model is available."""
    global _ollama_available, _ollama_checked_at
    # Recheck every 30 seconds (don't cache forever)
    if _ollama_available is not None and time.time() - _ollama_checked_at < 30:
        return _ollama_available
    _ollama_checked_at = time.time()
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


# Map written numbers → digits for section detection
_WORD_NUMS = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12",
}

def detect_heading(text: str) -> Optional[str]:
    """Detect top-level section heading from flattened page text."""
    # Numbered subsection: 1.2 Title, 3.4.1 Title
    sub = re.search(r'\b(\d+\.\d+(?:\.\d+)?)\s+([A-Z].+)', text)
    if sub: return extract_title(sub.group(1), sub.group(2))
    # "Section 5:" or "Section Five:"
    sec = re.search(r'\b(Section\s+\d+\s*[:\-\u2013]?)\s+([A-Z].+)', text)
    if sec: return extract_title(sec.group(1), sec.group(2))
    # Word-based: "Section Two", "SECTION FIVE: Opening"
    word_sec = re.search(
        r'\b(Section\s+(?:' + '|'.join(_WORD_NUMS.keys()) + r')\s*[:\-\u2013]?)\s+([A-Z].+)',
        text, re.IGNORECASE
    )
    if word_sec:
        prefix = word_sec.group(1)
        for word, num in _WORD_NUMS.items():
            prefix = re.sub(word, num, prefix, flags=re.IGNORECASE)
        return extract_title(prefix, word_sec.group(2))
    # ALL-CAPS heading: "OPENING THE VOTING LOCATION", "ELECTION DAY PROCEDURES"
    caps = re.search(r'(?:^|\s)([A-Z][A-Z\s]{8,50})(?:\s|$)', text)
    if caps:
        heading = caps.group(1).strip()
        # Only accept if it looks like a real heading (not just uppercase body text)
        if len(heading.split()) <= 8 and heading == heading.upper():
            return heading.title()
    return None


# ─── Subsection (subheading) detection from raw line-by-line text ────────────

# Boilerplate labels that appear on almost every page — skip these
_BOILERPLATE_LABELS = {
    "general info", "poll worker info", "equipment", "set up location",
    "open location", "checking in voters", "update registration", "voting",
    "election night", "nightly closing", "provisional voting", "equipment info",
    "table of contents",
}

# Small words that don't need to be capitalized in title case
_TITLE_SMALL_WORDS = {"the", "and", "or", "for", "of", "a", "an", "in", "to",
                      "on", "at", "by", "with", "is", "are", "as", "but", "not"}


def detect_subheading(line: str) -> Optional[str]:
    """
    Detect subsection headings from individual raw PDF lines.
    These are short title-case phrases like:
      "Voter Contacts", "Voting Location Team", "Envelope Drop Box",
      "Spoiling and Reissuing Voter Materials", "Opening Checklist"
    """
    stripped = line.strip()
    if not stripped:
        return None

    # Skip boilerplate
    if stripped.lower() in _BOILERPLATE_LABELS:
        return None

    words = stripped.split()
    nw = len(words)

    # Must be 2-8 words
    if nw < 2 or nw > 8:
        return None

    # Skip lines that are just numbers or start with numbers (page numbers, step lists)
    if stripped[0].isdigit():
        return None

    # Skip lines ending in sentence-ending punctuation (body text fragments)
    if stripped[-1] in '.!?:;':
        return None

    # Skip table-of-contents lines (contain dotted leaders or page references)
    if '..........' in stripped or re.search(r'\.\s*\d+$', stripped):
        return None

    # Skip standalone "Section N" labels (already captured by detect_heading)
    if re.match(r'^Section\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)$', stripped, re.IGNORECASE):
        return None

    # Skip "continued" labels that just say "X, continued" — keep them as subheadings
    # but strip the ", continued" part for cleaner titles
    continued = False
    if stripped.lower().endswith(", continued"):
        continued = True
        stripped = stripped[:-len(", continued")].strip()
        words = stripped.split()
        nw = len(words)
        if nw < 2:
            return None

    # Check title case: first word must start uppercase, majority of non-small words too
    if not words[0][0].isupper():
        return None

    cap_count = 0
    check_count = 0
    for w in words:
        wl = w.lower()
        if wl in _TITLE_SMALL_WORDS:
            continue
        check_count += 1
        if w[0].isupper():
            cap_count += 1

    # At least 60% of significant words should be capitalized
    if check_count > 0 and cap_count / check_count < 0.6:
        return None

    # Skip if it looks like body text (contains common sentence patterns)
    lower = stripped.lower()
    if any(p in lower for p in ["you will", "you can", "they will", "this is", "if the",
                                 "do not", "must be", "please", "may not", "should be"]):
        return None

    # Skip lines that look like bullet points or list items
    if stripped.startswith(("•", "-", "–", "o ", "► ")):
        return None

    suffix = ", continued" if continued else ""
    return stripped + suffix


_PAGE_NUM_LINE = re.compile(r'^\s*\d+\s*$', re.MULTILINE)

def strip_page_boilerplate(text: str) -> str:
    """
    Remove running header/footer boilerplate so chunk words aren't wasted on repeated text.
    Handles patterns like:
      '2026 March Jurisdictional Manual         Section Two: Poll Worker Information\n11\nPoll Worker Info\n'
    """
    # Running header: year + manual name + spaces + section name, then page number on next line
    text = re.sub(
        r'\d{4}\s+\w+\s+Jurisdictional Manual[ \t]+[^\n]{0,100}\n\s*\d+\s*\n',
        '', text
    )
    # Standalone page number lines
    text = _PAGE_NUM_LINE.sub('', text)
    # Short label-only lines that repeat the section name (e.g. "Poll Worker Info\n", "General Info\n")
    text = re.sub(
        r'\n[ \t]*(?:Poll Worker Info|General Info|Set Up Location|Open Location|'
        r'Election Night|Nightly Closing|Provisional Voting|Equipment Info)\s*\n',
        '\n', text
    )
    # "Section Two\n Poll Worker Information\n" type duplicate headings
    text = re.sub(r'\n[ \t]*Section (?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\s*\n', '\n', text)
    return text


def parse_pdf(pdf_path: Path) -> List[dict]:
    """Parse PDF → list of {page_num, text, title, doc_id, doc_name}."""
    doc_id   = file_hash(pdf_path)
    doc_name = pdf_path.stem.replace("_", " ").replace("-", " ").title()
    pymupdf_doc = pymupdf.open(str(pdf_path))
    pages: List[dict] = []
    last_section = "Introduction"
    last_subsection = ""

    for pg in range(pymupdf_doc.page_count):
        raw_text = pymupdf_doc[pg].get_text("text")

        # 1. Detect top-level section from flattened text
        full_text_flat = " ".join(raw_text.split())
        detected_section = detect_heading(full_text_flat)
        if detected_section:
            last_section = detected_section
            last_subsection = ""  # reset subsection when section changes

        # 2. Detect subsection from raw line-by-line text
        raw_lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        # Scan the first ~8 lines for subheadings (they appear near top of page)
        for line in raw_lines[:8]:
            sub = detect_subheading(line)
            if sub:
                last_subsection = sub
                break  # use first subheading found on this page

        # 3. Build combined title: "Section 6: Checking in Voters > Voter ID Requirements"
        if last_subsection:
            title = f"{last_section} > {last_subsection}"
        else:
            title = last_section

        text = " ".join(strip_page_boilerplate(raw_text).split())
        if len(text.strip()) < 30:
            continue

        pages.append({
            "page_num":  pg + 1,
            "text":      text,
            "title":     title,
            "doc_id":    doc_id,
            "doc_name":  doc_name,
        })

    pymupdf_doc.close()
    log.info("Parsed %d pages from %s", len(pages), pdf_path.name)
    return pages

# ─── Contextual Chunk Generation (Anthropic technique) ──────────────────────

_TIME_RE = re.compile(r'\b(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.|AM|PM|a\.m|p\.m))\.?', re.IGNORECASE)
_DATE_RE = re.compile(r'\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2})', re.IGNORECASE)
_DEADLINE_KW = re.compile(r'\b(arrive|open|close|closed|deadline|by|until|from|at)\b', re.IGNORECASE)

def generate_chunk_context(chunk_text: str, section_title: str, doc_name: str) -> str:
    """
    Build contextual content with regex-extracted time/date facts prepended.
    This ensures BM25 can match '6:00 a.m.' queries to the right chunk without
    any LLM paraphrasing (which caused hallucination of wrong times).
    """
    times = _TIME_RE.findall(chunk_text)
    dates = _DATE_RE.findall(chunk_text)
    facts = []
    if times:
        facts.append("Times mentioned: " + ", ".join(dict.fromkeys(times)))
    if dates:
        facts.append("Dates mentioned: " + ", ".join(dict.fromkeys(dates)))
    fact_prefix = (" | ".join(facts) + " | ") if facts else ""
    return f"[{section_title}] {fact_prefix}{chunk_text}"

# ─── Disk Cache ───────────────────────────────────────────────────────────────

CACHE_VERSION = "pplx-v1-280w"  # change when model or chunking params change

def cache_path(doc_hash: str) -> Path:
    return CACHE_DIR / f"{doc_hash}_{CACHE_VERSION}.json"

def emb_cache_path(doc_hash: str) -> Path:
    return CACHE_DIR / f"{doc_hash}_{CACHE_VERSION}.npy"


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
    Fill contextual_content for each chunk using section-title prefix.
    LLM-based paraphrasing is disabled — it misparaphrases specific times/numbers.
    """
    total = len(chunk_list)
    log.info("📝 Building section-prefix contextual content for %d chunks...", total)
    for c in chunk_list:
        c["contextual_content"] = generate_chunk_context(
            c["raw_content"], c["section_title"], c["doc_name"]
        )
    log.info("✅ Contextual content done for %d chunks", total)
    return chunk_list

# ─── Embeddings ───────────────────────────────────────────────────────────────

def embed_chunks(chunk_list: List[dict], model: SentenceTransformer) -> List[dict]:
    texts   = [c["contextual_content"] for c in chunk_list]
    log.info("🔢 Embedding %d chunks with %s...", len(texts), EMBED_MODEL)
    vectors = model.encode(texts, batch_size=16, show_progress_bar=True, normalize_embeddings=False)
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

def clean_stale_cache() -> None:
    """Remove cache files from older model/config versions."""
    for f in CACHE_DIR.glob("*.json"):
        if CACHE_VERSION not in f.name:
            f.unlink()
            log.info("🗑️  Removed stale cache: %s", f.name)
    for f in CACHE_DIR.glob("*.npy"):
        if CACHE_VERSION not in f.name:
            f.unlink()
            log.info("🗑️  Removed stale cache: %s", f.name)


def build_page_index(all_pages: List[dict]) -> None:
    """Build page-level BM25 + embedding index for fallback retrieval."""
    global pages_store, pages_bm25
    if not all_pages or embedder is None:
        return

    log.info("📄 Building page-level index for %d pages...", len(all_pages))
    # Embed full page text (with section title prefix for context)
    page_texts = [f"[{p['title']}] {p['text']}" for p in all_pages]
    page_vectors = embedder.encode(page_texts, batch_size=8, show_progress_bar=True, normalize_embeddings=False)
    for p, vec in zip(all_pages, page_vectors):
        p["embedding"] = vec

    pages_store = all_pages

    # BM25 over page text
    tokenized = bm25s.tokenize(page_texts, stopwords="en")
    pages_bm25 = bm25s.BM25(corpus=page_texts)
    pages_bm25.index(tokenized)
    log.info("✅ Page-level index built: %d pages", len(pages_store))


def ingest_all_docs() -> None:
    """Scan docs/ for PDFs, ingest each, merge into global index."""
    global chunks, bm25_index
    clean_stale_cache()

    pdf_files = sorted(DOCS_DIR.glob("**/*.pdf"))
    if not pdf_files:
        log.warning("⚠️  No PDFs found in %s", DOCS_DIR)
        return

    log.info("📂 Found %d PDF(s) in docs/", len(pdf_files))
    all_chunks: List[dict] = []
    all_pages: List[dict] = []
    for pdf in pdf_files:
        doc_chunks = ingest_pdf(pdf)
        all_chunks.extend(doc_chunks)
        # Also collect parsed pages for page-level index
        pages = parse_pdf(pdf)
        all_pages.extend(pages)
        log.info("  ✅ %s → %d chunks, %d pages", pdf.name, len(doc_chunks), len(pages))

    chunks     = all_chunks
    bm25_index = build_bm25(chunks)

    # Build page-level fallback index
    build_page_index(all_pages)

    log.info("🧠 RAG sidecar ready — %d chunks + %d pages across %d doc(s)",
             len(chunks), len(pages_store), len(pdf_files))

# ─── Retrieval ────────────────────────────────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


def normalize_scores(scored: List[tuple]) -> Dict[str, float]:
    if not scored:
        return {}
    scores = [s for _, s in scored]
    mn, mx = min(scores), max(scores)
    if mx == mn:
        return {cid: 1.0 for cid, _ in scored}
    return {cid: (s - mn) / (mx - mn) for cid, s in scored}


# Sections/content patterns that are reference/appendix material — penalise in ranking
_LOW_PRIORITY_SECTIONS = re.compile(
    r'appendix|faq|glossary|table of contents|index|job duty card|marshal job|election night only|nightly closing',
    re.IGNORECASE
)
_LOW_PRIORITY_CONTENT = re.compile(
    r'Appendix\s+\d+|FAQ,? continued|Job Duty Card|Marshal Job Duty',
    re.IGNORECASE
)

def expand_query(query: str) -> str:
    """
    Query expansion disabled — LLM-generated keywords caused appendix/FAQ pages
    to rank above procedural content (e.g., 'Election Night Only' appendix ranking
    above Section 5 for 'what time do polls open').
    BM25 on the raw query + BGE dense embeddings is more accurate.
    """
    return query


def page_level_search(query: str, top_k: int = 3) -> List[dict]:
    """
    Search at the page level — rescues answers that chunk-level search misses.
    Returns pages with their scores.
    """
    if not pages_store or pages_bm25 is None or embedder is None:
        return []

    # BM25
    q_tokens = bm25s.tokenize([query], stopwords="en")
    bm25_res, bm25_scores = pages_bm25.retrieve(q_tokens, k=min(len(pages_store), 20))
    page_text_to_idx = {f"[{p['title']}] {p['text']}": i for i, p in enumerate(pages_store)}
    bm25_scored = []
    for doc_text, score in zip(bm25_res[0], bm25_scores[0]):
        idx = page_text_to_idx.get(str(doc_text))
        if idx is not None:
            bm25_scored.append((idx, float(score)))

    # Cosine
    q_vec = embedder.encode([query], normalize_embeddings=False)[0]
    cosine_scored = [(i, cosine_similarity(q_vec, p["embedding"]))
                     for i, p in enumerate(pages_store)]

    # Fuse
    bm25_norm = normalize_scores([(str(i), s) for i, s in bm25_scored])
    cosine_norm = normalize_scores([(str(i), s) for i, s in cosine_scored])
    all_ids = set(bm25_norm) | set(cosine_norm)
    fused = {
        idx: 0.5 * bm25_norm.get(idx, 0.0) + 0.5 * cosine_norm.get(idx, 0.0)
        for idx in all_ids
    }
    sorted_ids = sorted(fused, key=lambda x: -fused[x])[:top_k]

    results = []
    for idx_str in sorted_ids:
        idx = int(idx_str)
        p = pages_store[idx]
        results.append({
            "page_num": p["page_num"],
            "doc_id": p["doc_id"],
            "title": p["title"],
            "score": fused[idx_str],
        })
    return results


def hybrid_search(query: str, top_k: int = FINAL_TOP_K) -> List[dict]:
    """
    BM25 (expanded query) + cosine (original query) → normalized 50/50 fusion.
    Page-level rescue: if top chunk score is low, add chunks from best-matching pages.
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
    q_vec = embedder.encode([query], normalize_embeddings=False)[0]
    cosine_scored = [(c["id"], cosine_similarity(q_vec, c["embedding"])) for c in chunks]

    # ── Keyword boost: chunks with exact times/numbers rank higher ─────────────
    TIME_PATTERN  = re.compile(r'\b\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.|am|pm)\b', re.IGNORECASE)
    PHONE_PATTERN = re.compile(r'\(\d{3}\)\s*\d{3}[-\s]\d{4}')
    NUM_PATTERN   = re.compile(r'\b\d+\b')
    query_times   = set(TIME_PATTERN.findall(query))
    query_nums    = set(NUM_PATTERN.findall(query))
    query_asks_phone = bool(re.search(r'\bphone\b|\bhotline\b|\bnumber\b|\bcontact\b', query, re.IGNORECASE))

    def score_adjustment(c: dict) -> float:
        raw = c.get("raw_content", "")
        title = c.get("section_title", "")
        adj = 0.0
        # Boost for matching times in query
        for t in query_times:
            if t.lower() in raw.lower():
                adj += 0.15
        for n in query_nums:
            if re.search(r'\b' + re.escape(n) + r'\b', raw):
                adj += 0.05
        # Boost any chunk with a time expression (for time-related queries)
        if TIME_PATTERN.search(raw):
            adj += 0.05
        # Boost chunks with phone numbers when query asks for a phone/contact
        if query_asks_phone and PHONE_PATTERN.search(raw):
            adj += 0.3
        # Penalise appendix / FAQ / reference sections
        if _LOW_PRIORITY_SECTIONS.search(title):
            adj -= 0.5
        # Penalise by chunk content too (catches misclassified appendix pages)
        if _LOW_PRIORITY_CONTENT.search(raw):
            adj -= 0.4
        return adj

    # ── Fuse ──────────────────────────────────────────────────────────────────
    bm25_norm   = normalize_scores(bm25_scored)
    cosine_norm = normalize_scores(cosine_scored)
    all_ids     = set(bm25_norm) | set(cosine_norm)
    id_to_chunk = {c["id"]: c for c in chunks}
    fused       = {
        cid: 0.5 * bm25_norm.get(cid, 0.0)
             + 0.5 * cosine_norm.get(cid, 0.0)
             + score_adjustment(id_to_chunk.get(cid, {}))
        for cid in all_ids
    }
    sorted_ids = sorted(fused, key=lambda x: -fused[x])

    # ── Direct keyword rescue: find chunks with exact query terms that ────────
    #    BM25/cosine may have missed.  We extract significant multi-word phrases
    #    and rare tokens, then inject matching chunks into results.
    def _keyword_rescue(query: str, fused_scores: dict, already: set, k: int) -> List[dict]:
        """Return up to k chunks that contain distinctive query terms."""
        q_lower = query.lower()
        # Extract distinctive tokens (3+ chars, not stopwords)
        _stop = {"the","and","for","are","was","how","what","when","where","who",
                 "does","can","they","their","this","that","with","from","have",
                 "been","will","would","should","could","about","into","than",
                 "also","just","than","very","much","some","any","all","each",
                 "which","there","these","those","other","your","after","before",
                 "between","during","through","above","below","out","off","over",
                 "under","again","further","then","once","here","why","both","few",
                 "more","most","such","only","same","too","but","not","own","its",
                 "our","you","has","had","did","get","got","let","may","use","way",
                 "try","ask","put","say","take","come","make","like","know","see",
                 "think","want","give","tell","call","keep","show","turn","move",
                 "need","still","might","must","shall","upon","onto","within","without",
                 "along","since","until","while","where","whom","whose"}
        words = [w for w in re.findall(r'[a-z0-9]+(?:[.\'-][a-z0-9]+)*', q_lower) if len(w) >= 3 and w not in _stop]
        # Also extract quoted phrases, phone numbers, specific patterns
        phone_nums = re.findall(r'\(\d{3}\)\s*\d{3}[- ]?\d{4}', query)
        specific_terms = phone_nums + re.findall(r'\b[A-Z]{2,}(?:\s+[A-Z][a-z]+)*\b', query)  # BLUE, FORMER, etc.
        
        rescued: List[dict] = []
        rescued_ids: set = set()
        
        for c in chunks:
            if c["id"] in already or c["id"] in rescued_ids:
                continue
            raw_lower = c["raw_content"].lower()
            ctx_lower = c.get("contextual_content", "").lower()
            combined = raw_lower + " " + ctx_lower
            
            # Check for specific terms first (high value)
            for term in specific_terms:
                if term.lower() in combined:
                    rescued.append(c)
                    rescued_ids.add(c["id"])
                    break
            else:
                # Check how many query keywords appear in this chunk
                matches = sum(1 for w in words if w in combined)
                if matches >= max(2, len(words) // 2):
                    rescued.append(c)
                    rescued_ids.add(c["id"])
            
            if len(rescued) >= k:
                break
        
        return rescued

    # ── Build results — fused score + keyword rescue ─────────────────────────
    results: List[dict] = []
    result_ids: set = set()

    # First: top chunks by fused score
    for cid in sorted_ids:
        c = id_to_chunk.get(cid)
        if not c:
            continue
        results.append({
            "chunk_id":      c["id"],
            "page_number":   c["page"],
            "section_title": c["section_title"],
            "chunk_content": c["raw_content"],
            "score":         float(fused[cid]),
            "document_id":   c["doc_id"],
            "document_name": c["doc_name"],
        })
        result_ids.add(cid)
        if len(results) >= top_k - 3:   # reserve 3 slots for keyword rescue
            break

    # Second: keyword rescue pass — inject chunks with exact query terms
    rescued = _keyword_rescue(query, fused, result_ids, k=3)
    for c in rescued:
        results.append({
            "chunk_id":      c["id"],
            "page_number":   c["page"],
            "section_title": c["section_title"],
            "chunk_content": c["raw_content"],
            "score":         fused.get(c["id"], 0.0),
            "document_id":   c["doc_id"],
            "document_name": c["doc_name"],
        })
        result_ids.add(c["id"])
        if len(results) >= top_k:
            break

    # Third: page-level rescue — if top chunk score is weak, add chunks from best pages
    if results and results[0]["score"] < 0.6 and pages_store:
        page_results = page_level_search(query, top_k=3)
        page_nums_already = {r["page_number"] for r in results}
        for pr in page_results:
            if pr["page_num"] in page_nums_already:
                continue
            # Find all chunks belonging to this page and add the best one
            page_chunks = [c for c in chunks
                           if c["page"] == pr["page_num"] and c["doc_id"] == pr["doc_id"]
                           and c["id"] not in result_ids]
            if page_chunks:
                best = max(page_chunks, key=lambda c: fused.get(c["id"], 0.0))
                results.append({
                    "chunk_id":      best["id"],
                    "page_number":   best["page"],
                    "section_title": best["section_title"],
                    "chunk_content": best["raw_content"],
                    "score":         fused.get(best["id"], 0.0),
                    "document_id":   best["doc_id"],
                    "document_name": best["doc_name"],
                })
                result_ids.add(best["id"])
                log.info("📄 Page rescue: added chunk from page %d (%s)", pr["page_num"], pr["title"])

    return results

# ─── LLM Reranking ───────────────────────────────────────────────────────────

RERANK_TOP_IN   = 15    # send top N candidates to reranker
RERANK_TOP_OUT  = 8     # keep top N after reranking
_rerank_cache: Dict[str, List[tuple]] = {}


def rerank_with_llm(query: str, candidates: List[dict]) -> List[dict]:
    """
    Use local Ollama 8B to rerank candidates in a single batch prompt.
    Returns reordered candidates (top RERANK_TOP_OUT).
    """
    if not candidates:
        return candidates

    cache_key = query.strip().lower()
    if cache_key in _rerank_cache:
        cached_scores = dict(_rerank_cache[cache_key])
        for c in candidates:
            c["rerank_score"] = cached_scores.get(c["chunk_id"], 5)
        return sorted(candidates, key=lambda x: x.get("rerank_score", 0), reverse=True)[:RERANK_TOP_OUT]

    # Build batch prompt with all passages
    n = min(len(candidates), RERANK_TOP_IN)
    passages = "\n\n".join(
        f"[{i+1}] {c['chunk_content'][:400]}"
        for i, c in enumerate(candidates[:n])
    )
    prompt = (
        f'Given this question: "{query}"\n\n'
        f"Rate each passage's relevance (1-10). Higher = more relevant.\n"
        f"Output ONLY comma-separated numbers, one per passage, in order.\n\n"
        f"{passages}\n\n"
        f"Scores:"
    )

    result = ollama_call(
        [{"role": "user", "content": prompt}],
        max_tokens=80
    )

    if not result:
        log.warning("Reranking LLM call failed — returning original order")
        return candidates[:RERANK_TOP_OUT]

    # Parse scores
    raw_scores = re.findall(r'\d+', result)
    scores = []
    for s in raw_scores[:n]:
        try:
            score = min(10, max(1, int(s)))
        except ValueError:
            score = 5
        scores.append(score)

    # Pad with neutral score if LLM returned fewer scores
    while len(scores) < n:
        scores.append(5)

    # Apply scores
    scored_pairs = []
    for i, c in enumerate(candidates[:n]):
        c["rerank_score"] = scores[i]
        scored_pairs.append((c["chunk_id"], scores[i]))

    _rerank_cache[cache_key] = scored_pairs
    log.info("🔄 Reranked %d chunks: scores=%s", n, scores[:n])

    reranked = sorted(candidates[:n], key=lambda x: x.get("rerank_score", 0), reverse=True)
    return reranked[:RERANK_TOP_OUT]


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
    embedder = SentenceTransformer(EMBED_MODEL, trust_remote_code=True)
    log.info("✅ Embedding model loaded (dim=%d)", embedder.get_sentence_embedding_dimension())
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
    results = hybrid_search(req.query, req.top_k)

    # LLM Reranking disabled — hybrid search (BM25 + pplx-embed) outperforms
    # 8B reranker (96% vs 51% recall in benchmarks).  Uncomment to re-enable.
    # if is_ollama_up() and len(results) > RERANK_TOP_OUT:
    #     results = rerank_with_llm(req.query, results)

    # ── DEBUG: Log every chunk returned to the frontend ──
    log.info("═══ RETRIEVE RESULTS for: '%s' ═══", req.query[:80])
    for i, r in enumerate(results):
        log.info("  [%d] score=%.3f | page %d | §%s | doc=%s",
                 i + 1, r["score"], r["page_number"], r["section_title"], r["document_name"])
        log.info("      chunk (first 300 chars): %s", r["chunk_content"][:300])
    log.info("═══ END RESULTS ═══")
    return RetrieveResponse(results=results, query=req.query)


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
