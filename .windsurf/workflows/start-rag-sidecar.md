---
description: Start the Python RAG sidecar (required before running the Next.js app)
---

## Start Python RAG Sidecar

The sidecar must be running for the chat to use real retrieval. It loads the PDF, generates LLM context per chunk via Groq, embeds with sentence-transformers, and builds a BM25 index on startup (~60s first run).

1. Make sure the virtual environment exists. If not, create it:
```
cd /Users/sankritya/All\ Web\ Dev\ Projects/civiq
python3.11 -m venv rag-sidecar/.venv
rag-sidecar/.venv/bin/pip install -r rag-sidecar/requirements.txt
```

2. Start the sidecar with the Groq API key from .env.local:
// turbo
```
export $(grep -v '^#' /Users/sankritya/All\ Web\ Dev\ Projects/civiq/.env.local | xargs) 2>/dev/null; /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/.venv/bin/python /Users/sankritya/All\ Web\ Dev\ Projects/civiq/rag-sidecar/main.py
```

3. Verify it is ready (should return `{"status":"ok",...}`):
// turbo
```
curl -s http://127.0.0.1:8000/health
```

4. Start Next.js in a separate terminal:
```
pnpm dev
```

## Notes
- Sidecar runs on `http://127.0.0.1:8000`
- Next.js calls it via `RAG_SIDECAR_URL` env var (default: `http://127.0.0.1:8000`)
- If sidecar is down, Next.js falls back to the TypeScript knowledge-base retriever automatically
- Startup takes ~60s on first run (Groq context generation for 74 chunks)
- Subsequent restarts are faster (models already cached locally)
