---
description: Start the Python RAG sidecar (required before running the Next.js app)
---

## Start Python RAG Sidecar (v2)

The sidecar must be running for the chat to use real retrieval.
- **First run**: parses PDFs, calls Groq for contextual chunking (~2 min for 74 chunks), embeds with sentence-transformers, saves cache to `rag-sidecar/.cache/`
- **Subsequent restarts**: loads from disk cache — ready in ~12s, zero Groq calls

1. Make sure the virtual environment exists. If not, create it:
```
python3.11 -m venv /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/.venv
/Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/.venv/bin/pip install -r /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/requirements.txt
```

2. Drop any PDFs you want indexed into `rag-sidecar/docs/` (already contains `poll_worker_training_manual.pdf`)

3. Start the sidecar:
// turbo
```
export $(grep -v '^#' /Users/sankritya/All\ Web\ Dev\ Projects/civiq/.env.local | xargs) 2>/dev/null; /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/.venv/bin/python /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/main.py
```

4. Verify it is ready:
// turbo
```
curl -s http://127.0.0.1:8000/health
```

5. Start Next.js in a separate terminal:
```
pnpm dev --cwd /Users/sankritya/All\ Web\ Dev\ Projects/civiq
```

## Adding a new document
1. Copy the PDF into `rag-sidecar/docs/`
2. POST to the ingest endpoint — the server stays live while re-indexing in the background:
```
curl -s -X POST http://127.0.0.1:8000/ingest
```
3. Check indexed docs: `curl -s http://127.0.0.1:8000/docs`

## Endpoints
- `GET  /health`   — status, chunk count, indexed doc names
- `POST /retrieve` — `{"query": "...", "top_k": 5}` → ranked chunks
- `POST /ingest`   — re-scan docs/ and ingest new/changed PDFs (background, non-blocking)
- `GET  /docs`     — list all indexed documents
- `GET  /chunks`   — debug: all chunks with truncated contextual content

## Notes
- Sidecar runs on `http://127.0.0.1:8000`
- Next.js calls it via `RAG_SIDECAR_URL` env var (default: `http://127.0.0.1:8000`)
- If sidecar is down, Next.js falls back to the TypeScript knowledge-base retriever automatically
- Cache is keyed by PDF SHA-256 hash — editing a PDF automatically triggers re-ingestion
- Cache files live in `rag-sidecar/.cache/` (gitignored) — delete to force full re-ingest
