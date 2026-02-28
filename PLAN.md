# CivIQ RAG Pipeline Overhaul

## Goal
Fix retrieval quality so Sam answers accurately from a 170-page Maricopa County election manual. Switch to fully local stack for election data privacy.

## Problems Solved
1. Section detection too coarse (11 sections, "Section 10" has 92 chunks)
2. 150-word chunks fragment multi-step procedures
3. BGE-small (384-dim) embeddings not SOTA enough
4. LLM hallucinates or can't find answers buried deep in PDF
5. max_tokens=512 truncates complex answers
6. Groq cloud violates election data privacy requirements

## Implementation Order

### Step 1: Subsection Detection Fix (`rag-sidecar/main.py`)
- Enhance `detect_heading()` to catch subsections (6.1, 6.2), Step N patterns, title-case headings
- Track both section and subsection in chunk metadata
- Target: 30-50+ distinct section titles instead of 11

### Step 2: Embedding Upgrade (`rag-sidecar/main.py`)
- Replace `BAAI/bge-small-en-v1.5` (384-dim) with:
  - `perplexity-ai/pplx-embed-context-v1-0.6B` for document chunks (contextual, 1024-dim)
  - `perplexity-ai/pplx-embed-v1-0.6B` for queries (1024-dim)
- Switch from `sentence-transformers` to `transformers.AutoModel` (trust_remote_code=True)
- Contextual model takes list-of-lists (chunks grouped by document)
- Update cosine similarity to handle unnormalized int8 embeddings
- Version-tag cache files so old BGE cache is ignored
- Free context model after ingestion to save ~1.2GB RAM

### Step 3: Larger Chunks + Page-Level Retrieval (`rag-sidecar/main.py`)
- Increase CHUNK_SIZE from 150 to 280 words, OVERLAP from 40 to 60
- Add parallel page-level BM25+cosine index
- When chunk scores are low (<0.6), rescue with page-level matches
- Reduces chunk count from ~332 to ~180-200 with richer context per chunk

### Step 4: LLM Reranking with 8B Llama (`rag-sidecar/main.py`)
- After hybrid search returns top-20 chunks, use Ollama 8B to rerank
- Single-prompt batch reranking (all passages in one call, ~3-5s)
- Cache reranking results per query
- Keep top 8 after reranking
- Update OLLAMA_MODEL to `llama3.1:8b-instruct-q4_K_M`

### Step 5: Switch Chat to Local Ollama (`src/app/api/chat/route.ts`, `src/lib/ollama.ts`, `src/lib/constants.ts`)
- Replace Groq streaming with existing `ollamaStream()` function
- Update OLLAMA_MODEL to `llama3.1:8b-instruct-q4_K_M`
- Increase max_tokens from 512 to 1024
- Keep Groq as fallback if Ollama is down
- Bump response cache version to invalidate old cached answers

### Step 6: System Prompt Simplification (`src/lib/system-prompt-rag.ts`)
- Cut prompt from ~500 tokens to ~150 tokens
- 8B models follow shorter, direct instructions better
- Keep critical rules: direct answers, no hallucination, cite sources
- Remove verbose navigation section for poll-worker chat

## Files Modified
- `rag-sidecar/main.py` — Steps 1-4 (core RAG pipeline)
- `rag-sidecar/requirements.txt` — Add transformers+torch, remove sentence-transformers
- `src/app/api/chat/route.ts` — Step 5 (Ollama chat)
- `src/lib/ollama.ts` — Step 5 (model update)
- `src/lib/constants.ts` — Step 5 (model constant)
- `src/lib/system-prompt-rag.ts` — Step 6 (prompt)
- `src/lib/response-cache.ts` — Step 5 (cache version bump)

## Memory Budget
- pplx-embed-context-v1-0.6B: ~1.2GB (freed after ingestion)
- pplx-embed-v1-0.6B: ~1.2GB (kept for query embedding)
- llama3.1:8b via Ollama: ~4.9GB
- Total peak: ~7.3GB (fits Apple Silicon unified memory)
