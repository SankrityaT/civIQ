# CivIQ — AI-Powered Election Workforce Assistant

> **"Ask Sam"** — A local, on-device AI assistant that helps election officials recruit poll workers and gives poll workers instant, vetted answers.

**Hackathon:** ASU AI + Elections Hackathon — Final Round (Feb 28, 2026)
**Team:** Sankritya, Kinjal, Mohan

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Guardrails & Safety](#guardrails--safety)

---

## Problem Statement

- **772,000+** poll workers served in the 2024 election, yet **48% of jurisdictions** couldn't recruit enough
- **Less than 17%** of poll workers are under age 40
- **36% of local election offices** changed leadership since 2020 — highest turnover in two decades
- **Over half** of local election offices are staffed by a single person
- **34% of jurisdictions** have zero full-time election administrators

Election officials are overwhelmed — manually sifting through voter registration data to recruit poll workers, running one-time trainings, and losing workers who feel unprepared. This doesn't scale.

---

## Solution Overview

**CivIQ** is a two-sided AI assistant:

### For Election Officials (CivIQ Dashboard)
- Upload and manage official training documents (PDF, DOCX, TXT)
- Real-time knowledge graph visualization of all ingested content
- AI-powered query expansion and contextual chunking for better retrieval
- Test AI responses before deploying to poll workers
- Monitor all interactions via audit log

### For Poll Workers (Sam Chat)
- Ask questions, get instant answers from vetted documents only
- Every response includes source citation with page number
- Full bilingual support (English / Español) — UI, quick prompts, and AI responses
- Markdown-formatted responses with proper lists, bold text, and headings
- Smart quick-prompt chips based on actual document sections
- Text-to-speech support for accessibility

### Mascot: Sam the Eagle
- Friendly pixel-art eagle with a poll worker badge
- Appears as the AI avatar in the chat interface
- Makes the tool approachable for all ages

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCAL NETWORK                               │
│                                                                     │
│  ┌──────────────────────┐   ┌───────────────────────┐              │
│  │   CIVIQ DASHBOARD    │   │      SAM CHAT         │              │
│  │  (Next.js Frontend)  │   │  (Next.js Frontend)   │              │
│  │                      │   │                       │              │
│  │ • Upload Documents   │   │ • Ask questions       │              │
│  │ • Knowledge Graph    │   │ • Markdown responses  │              │
│  │ • Test AI Responses  │   │ • Source citations    │              │
│  │ • View Audit Log     │   │ • EN/ES toggle        │              │
│  └──────────┬───────────┘   └───────────┬───────────┘              │
│              │                           │                         │
│              ▼                           ▼                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              NEXT.JS API LAYER (Node.js)                    │   │
│  │                                                             │   │
│  │  /api/chat          → Streaming AI responses              │   │
│  │  /api/documents     → Document CRUD (synced from sidecar)   │   │
│  │  /api/suggestions   → Dynamic quick prompts from chunks     │   │
│  │  /api/knowledge-graph → Force-directed graph from sidecar │   │
│  │  /api/upload-to-sidecar → PDF ingestion pipeline            │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         │                                          │
│              ┌──────────┴──────────┐                               │
│              │   RAG SIDECAR       │                               │
│              │   (Python/FastAPI)  │                               │
│              │   Port 8000         │                               │
│              │                     │                               │
│              │ ┌───────────────┐   │  Pipeline:                    │
│              │ │  PDF Parser   │   │  1. PDF → Chunks (100 tokens) │
│              │ │  (PyMuPDF)    │   │  2. Local LLM context per chunk│
│              │ └───────┬───────┘   │  3. BM25 + cosine similarity   │
│              │         ▼             │  4. Query expansion via LLM    │
│              │ ┌───────────────┐   │  5. RAG retrieval (top-5)     │
│              │ │  Chunk Cache  │   │                               │
│              │ │  (disk/json)  │   │                               │
│              │ └───────┬───────┘   │                               │
│              │         ▼             │                               │
│              │ ┌───────────────┐   │                               │
│              │ │  Embeddings   │   │                               │
│              │ │(all-MiniLM-L6)│   │                               │
│              │ └───────┬───────┘   │                               │
│              │         ▼             │                               │
│              │ ┌───────────────┐   │                               │
│              │ │  BM25 Index   │   │                               │
│              │ │  (bm25s)      │   │                               │
│              │ └───────────────┘   │                               │
│              └──────────┬──────────┘                               │
│                         │                                          │
│              ┌──────────┴──────────┐                               │
│              │    LLM BACKENDS     │                               │
│              │                     │                               │
│              │  ┌───────────────┐  │  Primary: Ollama (local)       │
│              │  │    Ollama     │  │  • Model: llama3.2:3b-instruct │
│              │  │  (local)      │  │  • Port 11434                   │
│              │  │  Port 11434   │  │  • ~40-60 tok/s on M2 Pro       │
│              │  └───────┬───────┘  │  • No API key needed            │
│              │          │         │                               │
│              │  ┌───────┴───────┐  │  Fallback: Groq (cloud)         │
│              │  │     Groq      │  │  • Model: llama-3.3-70b        │
│              │  │   (cloud)     │  │  • Optional GROQ_API_KEY        │
│              │  └───────────────┘  │                               │
│              └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Enhancements

| Feature | Implementation |
|---------|---------------|
| **Local-First LLM** | Ollama primary (2GB model, ~50 tok/s), Groq cloud fallback |
| **Production RAG** | BM25S + cosine similarity hybrid retrieval with query expansion |
| **Contextual Chunking** | Local LLM generates 1-sentence context per chunk at ingestion |
| **Real Knowledge Graph** | Force-directed D3.js graph from actual chunk embeddings |
| **Bilingual UI** | Spanish translations for all quick prompts, categories, and AI responses |
| **Markdown Rendering** | react-markdown with GFM for formatted lists, bold, code blocks |
| **Live Document Sync** | Documents page auto-syncs from sidecar chunks (no fake data) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **State** | React hooks (useState, useCallback) |
| **Icons** | Lucide React, Phosphor Icons |
| **Markdown** | react-markdown, remark-gfm |
| **Graph Viz** | D3.js (force-directed simulation) |
| **Sidecar** | Python 3.11, FastAPI, Uvicorn |
| **RAG** | sentence-transformers (all-MiniLM-L6-v2), bm25s, PyMuPDF |
| **LLM (Primary)** | Ollama (llama3.2:3b-instruct-q4_K_M) |
| **LLM (Fallback)** | Groq SDK (llama-3.3-70b-versatile) |
| **PDF Parsing** | PyMuPDF (fitz) |
| **Embeddings** | sentence-transformers |
| **Vector Search** | Cosine similarity over 384-dim embeddings |
| **Keyword Search** | BM25S sparse retrieval |
| **Data** | JSON file cache for chunks/embeddings |

---

## Project Structure

```
civiq/
├── public/
│   ├── sam.gif                   # Sam eagle animated avatar
│   ├── logo.jpeg                 # CivIQ logo
│   └── sample-data/
│       ├── training-manual.json
│       └── voter-registration.csv
│
├── rag-sidecar/                  # Python RAG backend
│   ├── main.py                   # FastAPI server with RAG pipeline
│   ├── requirements.txt          # Python dependencies
│   ├── .venv/                    # Virtual environment
│   └── docs/                     # Uploaded PDF storage
│       ├── poll_worker_training_manual.pdf
│       └── finaltestmanual.pdf
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with fonts
│   │   ├── page.tsx              # Landing page
│   │   │
│   │   ├── chat/
│   │   │   └── page.tsx          # Sam Chat interface
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        # Dashboard shell
│   │   │   ├── page.tsx          # Overview with stats
│   │   │   ├── documents/
│   │   │   │   └── page.tsx      # Document management (synced from sidecar)
│   │   │   ├── ai-center/
│   │   │   │   └── page.tsx      # Knowledge graph visualization
│   │   │   └── audit/
│   │   │       └── page.tsx      # Audit log
│   │   │
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts       # Streaming chat (Ollama → Groq fallback)
│   │       ├── documents/
│   │       │   └── route.ts       # CRUD with sidecar sync
│   │       ├── suggestions/
│   │       │   └── route.ts       # Dynamic prompts from sidecar chunks
│   │       ├── knowledge-graph/
│   │       │   └── route.ts       # Force-directed graph data
│   │       └── upload-to-sidecar/
│   │           └── route.ts       # PDF ingestion endpoint
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx     # Main chat with markdown + TTS
│   │   │   ├── KnowledgePanel.tsx # Real-time force graph
│   │   │   └── SourceViewer.tsx   # PDF viewer with highlights
│   │   ├── dashboard/
│   │   │   ├── DocumentList.tsx   # Synced doc list
│   │   │   ├── DocumentUpload.tsx # Upload + ingest flow
│   │   │   └── KnowledgeGraph.tsx # Full-page graph view
│   │   └── landing/
│   │       └── (Landing page sections)
│   │
│   ├── lib/
│   │   ├── ollama.ts              # Ollama client (primary LLM)
│   │   ├── groq.ts                # Groq client (fallback)
│   │   ├── system-prompt-rag.ts   # RAG system prompt builder
│   │   ├── response-cache.ts      # LRU response cache
│   │   ├── knowledge-base.ts      # Next.js KB (complements sidecar)
│   │   ├── document-store.ts    # In-memory doc store (synced)
│   │   └── audit-logger.ts        # Interaction logging
│   │
│   └── types/
│       └── index.ts               # TypeScript interfaces
│
├── .env.local                     # Environment variables
├── .windsurf/workflows/           # IDE workflows
│   └── start-rag-sidecar.md       # Sidecar startup guide
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Features

### 1. Sam Chat (Poll Worker Interface)

#### Chat UI
- Clean chat interface with animated Sam eagle avatar
- User messages on right (gradient navy), Sam on left (transparent)
- Markdown rendering: bold, lists, headings, code blocks, blockquotes
- Typing indicator with breathing animation
- Font size controls (12px–20px)
- Text-to-speech for AI responses

#### AI Responses (RAG Pipeline)
- **Primary**: Ollama local LLM (llama3.2:3b, ~50 tok/s)
- **Fallback**: Groq cloud API (llama-3.3-70b)
- Streaming responses via Server-Sent Events
- System prompt enforces document-only answers with source citations
- Query expansion: natural language → keywords via LLM
- Contextual chunking: each chunk has 1-sentence LLM-generated context
- Hybrid retrieval: BM25 (50%) + cosine similarity (50%)
- Every response ends with: `📄 Source: [Doc Name], [Section]`

#### Bilingual Support
- Toggle button: EN / ES
- **UI**: All labels, placeholders, and tooltips switch language
- **Quick Prompts**: Dynamically generated from document sections, fully translated
- **AI Responses**: System prompt forces Spanish output when language=es
- Category translations: "Check-In" → "Registro", "Ballots" → "Boletas", etc.

#### Quick Prompt Chips
- 6 contextual question chips based on actual document sections
- Bilingual display (Spanish text when ES selected)
- Generated from sidecar chunks via `/api/suggestions`
- Categories: Check-In, Voter ID, Ballots, Emergency, Accessibility, Rules, etc.

#### Knowledge Graph Panel
- Real-time force-directed graph (D3.js)
- Nodes: Documents (orange), Sections (purple), Concepts (green)
- Edges: Document→Section, Section→Concept, Section→Section (adjacent pages)
- Interactive: drag, zoom, click to view source
- Capped at 30 sections/doc + 40 concepts for performance

### 2. CivIQ Dashboard (Election Official Interface)

#### Document Management (`/dashboard/documents`)
- **Real document sync**: Lists actual PDFs from sidecar chunks (not fake data)
- Shows: word count, sections, pages, status (active/inactive)
- Upload triggers: PDF → chunks → embeddings → BM25 index
- Ingestion status visible in knowledge graph

#### AI Center (`/dashboard/ai-center`)
- Full-page knowledge graph visualization
- Real-time updates as documents are ingested
- Expandable source viewer for PDF deep-dives
- Shows live chunk count: "729 chunks across 2 documents"

#### Audit Log (`/dashboard/audit`)
- Timestamp, user type, question, response preview
- Source document + page number
- Language indicator (EN/ES)
- Cached response badge

### 3. Landing Page
- Hero with Sam mascot and CivIQ branding
- Problem statement with key statistics
- How It Works: 3-step flow
- Guardrails section: Local & Private, Human in the Loop, Bilingual, Audit Trail

---

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- Python 3.11+
- macOS/Linux (Ollama runs locally)

### 1. Clone & Install

```bash
git clone <repo-url>
cd civiq

# Install Node dependencies
npm install

# Install shadcn/ui components
npx shadcn@latest init
npx shadcn@latest add button card input label table badge tabs dialog dropdown-menu select separator sheet avatar scroll-area
```

### 2. Install & Start Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.com/download

# Pull the model (2GB, ~40-60 tok/s on M2 Pro)
ollama pull llama3.2:3b-instruct-q4_K_M

# Start Ollama server (runs on port 11434)
ollama serve
```

### 3. Start RAG Sidecar

```bash
# Create Python virtual environment
cd rag-sidecar
python3.11 -m venv .venv
source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (port 8000)
python main.py

# Or use the workflow:
# export $(grep -v '^#' .env.local | xargs) && rag-sidecar/.venv/bin/python rag-sidecar/main.py
```

### 4. Start Next.js Dev Server

```bash
# In a new terminal (project root)
npm run dev:all

# Or individually:
npm run ollama    # ollama serve
npm run sidecar   # rag-sidecar
npm run dev       # next dev (port 3000)
```

### 5. Open in Browser

- Landing page: http://localhost:3000
- Chat: http://localhost:3000/chat
- Dashboard: http://localhost:3000/dashboard
- AI Center: http://localhost:3000/dashboard/ai-center

---

## Environment Variables

Create `.env.local` in the project root:

```env
# LLM Backends
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx  # Optional — fallback only

# RAG Sidecar
RAG_SIDECAR_URL=http://127.0.0.1:8000

# Next.js
NEXT_PUBLIC_APP_NAME=CivIQ
NEXT_PUBLIC_MASCOT_NAME=Sam
```

**Get a Groq API key** (optional): https://console.groq.com/

---

## API Routes

### `POST /api/chat`
Chat with Sam. Returns streaming AI response using Ollama primary, Groq fallback.

```typescript
// Request
{
  message: string;
  language: "en" | "es";
  conversationHistory?: { role: string; content: string }[];
}

// Response: ReadableStream (text/event-stream)
// Chunks: { delta: string } | { source: string, done: true }
```

### `GET /api/documents`
List all documents (synced from sidecar chunks).

```typescript
// Response
{
  documents: {
    id: string;
    name: string;
    status: "active" | "inactive";
    wordCount: number;
    sections: number;
    uploadedAt: string;
    lastUpdated: string;
  }[];
}
```

### `GET /api/suggestions`
Dynamic quick prompt suggestions from sidecar sections.

```typescript
// Response
{
  suggestions: {
    q: string;          // English question
    qEs: string;         // Spanish translation
    category: string;    // English category
    categoryEs: string;  // Spanish category
    icon: string;        // Phosphor icon name
  }[];
}
```

### `GET /api/knowledge-graph`
Force-directed graph data from sidecar chunks.

```typescript
// Response
{
  nodes: { id: string; label: string; type: "document" | "section" | "concept"; docId: string; page?: number; size: number }[];
  edges: { source: string; target: string; weight: number }[];
  meta: { totalChunks: number; totalNodes: number; totalEdges: number; live: boolean };
}
```

### `POST /api/upload-to-sidecar`
Upload and ingest a PDF document.

```typescript
// Request: multipart/form-data
//   - file: PDF/DOCX/TXT

// Response
{
  success: true;
  message: "finaltestmanual.pdf ingested — 655 chunks";
}
```

---

## Guardrails & Safety

### Political Neutrality
- AI never recommends candidates or expresses political opinions
- System prompt explicitly prohibits partisan content
- All responses sourced from neutral, procedural documents only

### Data Privacy (Production)
- **Fully local**: Ollama runs on-device, no cloud LLM calls
- **Optional fallback**: Groq only if Ollama unavailable
- Voter registration data never leaves the system
- No personal data stored beyond what officials upload

### RAG-Only Architecture
- Response caching ensures identical answers to identical questions
- Hybrid retrieval (BM25 + embeddings) eliminates hallucinations
- Source citation on every response with page number
- Contextual chunking improves retrieval accuracy

### Human in the Loop
- Officials control the entire knowledge base via document upload
- Full audit trail of all interactions with source tracking
- AI explicitly defers to human officials for edge cases

### Bias Prevention
- No open internet training data — only official procedural docs
- Bilingual by default — equal quality in English and Spanish
- Deterministic responses via caching eliminate generation variance
- Markdown formatting ensures consistent, readable output

### Prompt Injection Protection
- Closed document set — no external data retrieval
- System prompt hardened against override attempts
- Input sanitization on all user queries
- Cached responses bypass generation entirely for known questions

---

## Sample System Prompt

```
You are Sam, a super friendly and helpful AI assistant for poll workers.

CRITICAL RULES:
1. You ONLY answer questions using the official training documents and retrieved knowledge below.
2. You NEVER express political opinions or recommend candidates.
3. You NEVER answer questions outside of election procedures and poll worker training.
4. You ALWAYS cite the source document and section for every answer.
5. If a question is outside your scope, say exactly: "I can only help with election procedures and poll worker training. Please contact your election supervisor for other questions."
6. RESPOND ENTIRELY IN SPANISH. NO ENGLISH ALLOWED. (when language=es)

RAG CONTEXT:
[5 most relevant chunks with contextual sentences]

LANGUAGE STYLE:
- Explain like you're talking to someone who has never done this before.
- Use short, simple sentences. No jargon.
- Break steps into numbered lists.
- Always end with a friendly closing like "You've got this! 👍"

RESPONSE FORMAT:
- Answer clearly with markdown formatting
- End with: "📄 Source: [Document Name], [Section Title]"
```

---

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| **Ingestion Speed** | ~20 chunks/sec (with local LLM context generation) |
| **Retrieval Latency** | ~50ms (BM25 + embedding search) |
| **LLM Generation** | ~40-60 tok/s (Ollama on M2 Pro) |
| **Total Chunks** | 729 (2 PDFs: poll worker manual + finaltestmanual) |
| **Model Size** | 2GB (q4_K_M quantized) |
| **Memory Usage** | ~4GB total (Ollama + sidecar + Next.js) |

---

## License

Built for the ASU AI + Elections Hackathon 2026. For educational and civic purposes.
