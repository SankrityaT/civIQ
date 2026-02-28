# CivIQ — AI-Powered Election Assistant

**Ask Sam** — A local-first AI assistant that helps election officials recruit poll workers and gives poll workers instant, sourced answers from official training materials.

## Overview

CivIQ is a two-sided platform:

- **For Poll Workers** — Ask questions in English or Spanish, get instant answers with exact source citations (document name, section, page number)
- **For Election Officials** — Upload training manuals, visualize knowledge connections, recruit qualified poll workers via AI scoring

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Port 3000)                                           │
│  ├── /chat — Sam chat interface with markdown, TTS, source viewer     │
│  ├── /dashboard — Document management, knowledge graph, recruiting    │
│  └── /api — Chat, documents, knowledge graph, voter scoring           │
│                                                                         │
│  RAG Sidecar (Python/FastAPI, Port 8000)                               │
│  ├── PDF ingestion with disk-cached chunks                              │
│  ├── Hybrid retrieval: BM25S (50%) + pplx-embed dense (50%)            │
│  ├── Query-type boosting for election-specific questions              │
│  └── Voter scoring: deterministic → Ollama AI enrichment               │
│                                                                         │
│  LLM Backends                                                           │
│  ├── Primary: Ollama (llama3.2:3b-instruct-q4_K_M) — local, private     │
│  └── Fallback: Groq (llama-3.3-70b) — optional cloud backup            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Start Ollama (background)
ollama serve &

# 2. Start RAG Sidecar (background)
export $(grep -v '^#' .env.local | xargs) 2>/dev/null
rag-sidecar/.venv/bin/python rag-sidecar/main.py &

# 3. Start Next.js (foreground)
npm run dev
```

Or one command:
```bash
ollama serve & sleep 2 && export $(grep -v '^#' .env.local | xargs) 2>/dev/null && rag-sidecar/.venv/bin/python rag-sidecar/main.py & sleep 8 && npm run dev
```

## Environment

Create `.env.local`:

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
GROQ_API_KEY=gsk_xxx  # optional fallback
RAG_SIDECAR_URL=http://127.0.0.1:8000
```

## Key Features

### For Poll Workers
- **Sourced Answers** — Every response cites exact document, section, and page
- **Bilingual** — Full EN/ES support (UI, prompts, AI responses)
- **Markdown Formatting** — Lists, bold, headings for readability
- **Text-to-Speech** — Accessibility support
- **Knowledge Graph** — Visual exploration of training materials

### For Election Officials
- **Document Upload** — PDF/DOCX/TXT ingestion with auto-chunking
- **Knowledge Graph** — Force-directed visualization of document structure
- **Voter Scoring** — AI-powered poll worker recruitment with tiered eligibility
- **Audit Trail** — All interactions logged with source tracking

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| State | React hooks, in-memory stores |
| Icons | Phosphor Icons, Lucide |
| Sidecar | Python 3.11, FastAPI, Uvicorn |
| Embeddings | perplexity-ai/pplx-embed-v1-0.6b |
| Retrieval | BM25S + cosine similarity hybrid |
| LLM (Primary) | Ollama llama3.2:3b-instruct-q4_K_M |
| LLM (Fallback) | Groq llama-3.3-70b-versatile |
| PDF Parsing | PyMuPDF |

## Project Structure

```
civiq/
├── src/
│   ├── app/
│   │   ├── chat/page.tsx           # Sam chat interface
│   │   ├── dashboard/              # Election official tools
│   │   └── api/                    # Next.js API routes
│   ├── components/
│   │   ├── chat/                   # ChatWindow, KnowledgePanel, SourceViewer
│   │   └── dashboard/              # Document management, voter scoring
│   └── lib/                        # Clients, prompts, caching
├── rag-sidecar/
│   ├── main.py                     # FastAPI server with RAG pipeline
│   ├── requirements.txt
│   └── docs/                       # Uploaded PDFs
└── .env.local                      # Environment variables
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | Streaming chat with RAG context |
| `GET /api/documents` | List ingested documents |
| `GET /api/knowledge-graph` | Force-directed graph data |
| `POST /api/upload-to-sidecar` | PDF ingestion |
| `POST /api/voters/upload` | CSV voter data upload |
| `GET /api/voters/scored` | AI-scored poll worker candidates |

## Safety & Guardrails

- **Local-First** — Ollama runs on-device; no cloud dependency
- **RAG-Only** — AI only answers from uploaded documents
- **Source Citations** — Every answer includes document, section, page
- **Political Neutrality** — No candidate recommendations or partisan content
- **Prompt Injection Protection** — Hardened system prompt, input sanitization

## Performance

| Metric | Value |
|--------|-------|
| Ingestion | ~20 chunks/sec; disk-cached for instant restart |
| Retrieval | ~50ms (hybrid BM25 + dense) |
| Generation | ~40-60 tok/s (Ollama on M2 Pro) |
| Cache | One-time per PDF; survives restarts |

## License

MIT License — For civic and educational use.
