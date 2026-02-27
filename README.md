# Civiq — AI-Powered Election Workforce Assistant

> **"Ask Sam"** — A local, on-device AI assistant that helps election officials recruit poll workers and gives poll workers instant, vetted answers.

**Hackathon:** ASU AI + Elections Hackathon — Final Round (Feb 28, 2026)
**Team:** Sanki, Kinjal, Mohan

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
- [Task Breakdown](#task-breakdown)
- [API Routes](#api-routes)
- [Data Models](#data-models)
- [Design System](#design-system)
- [Demo Flow](#demo-flow)
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

**Civiq** is a two-sided AI assistant:

### For Election Officials (Civiq Dashboard)
- Upload and manage official training documents
- Scan voter registration data to flag eligible poll worker candidates
- Test AI responses before deploying to poll workers
- Monitor all interactions via audit log

### For Poll Workers (Sam Chat)
- Ask questions, get instant answers from vetted documents only
- Every response cites its source document
- Available in English and Spanish
- Same question = same answer, every time

### Mascot: Sam the Eagle
- Friendly pixel-art eagle with a poll worker badge
- Appears as the AI avatar in the chat interface
- Makes the tool approachable for all ages

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  LOCAL NETWORK                        │
│                                                       │
│  ┌─────────────────────┐   ┌───────────────────────┐ │
│  │   CIVIQ DASHBOARD    │   │      SAM CHAT          │ │
│  │   (Election Officials)│   │   (Poll Workers)       │ │
│  │                       │   │                         │ │
│  │  • Upload Documents   │   │  • Ask questions        │ │
│  │  • Scan Voter Reg     │   │  • Get vetted answers   │ │
│  │  • Test AI Responses  │   │  • View source docs     │ │
│  │  • View Audit Log     │   │  • Toggle EN/ES         │ │
│  └──────────┬────────────┘   └──────────┬──────────── │ │
│             │                            │              │
│             ▼                            ▼              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              NEXT.JS API LAYER                    │   │
│  │                                                   │   │
│  │  /api/chat      → AI chat responses               │   │
│  │  /api/documents → Document CRUD                   │   │
│  │  /api/recruit   → Voter reg scanning              │   │
│  │  /api/audit     → Audit log queries               │   │
│  │  /api/test      → Test AI responses               │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                    │
│                     ▼                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │           AI / DATA LAYER                         │   │
│  │                                                   │   │
│  │  ┌─────────────┐  ┌──────────────┐               │   │
│  │  │  Groq API   │  │  Document    │               │   │
│  │  │  (LLM)      │  │  Store       │               │   │
│  │  │  llama-3.3  │  │  (JSON/local)│               │   │
│  │  └─────────────┘  └──────────────┘               │   │
│  │  ┌─────────────┐  ┌──────────────┐               │   │
│  │  │  Response   │  │  Voter Reg   │               │   │
│  │  │  Cache      │  │  Database    │               │   │
│  │  │  (Map/JSON) │  │  (CSV/JSON)  │               │   │
│  │  └─────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  NOTE: For hackathon demo, Groq API is used as a        │
│  stand-in for what would be a local LLM (e.g.,          │
│  llama.cpp or Ollama) in production.                     │
└─────────────────────────────────────────────────────────┘
```

### Production vs. Demo Architecture

| Component | Demo (Saturday) | Production |
|-----------|----------------|------------|
| LLM | Groq API (cloud) | Local llama.cpp / Ollama |
| Document Store | JSON files | SQLite / local vector DB |
| Voter Reg Data | Sample CSV (50 entries) | County voter registration DB |
| Response Cache | In-memory Map | Redis / SQLite |
| Hosting | Localhost / Vercel | Local server in election office |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Groq SDK (llama-3.3-70b-versatile) |
| State | React hooks (useState, useContext) |
| Data | JSON files (demo) / CSV parsing |
| Icons | Lucide React |
| Deployment | Localhost (demo) |

---

## Project Structure

```
civiq/
├── public/
│   ├── sam-avatar.png              # Sam the Eagle mascot (128x128)
│   ├── sam-avatar-256.png          # Sam high-res (256x256)
│   ├── civiq-logo.svg              # Civiq wordmark
│   └── sample-data/
│       ├── training-manual.json    # Sample election training manual
│       └── voter-registration.csv  # Sample voter reg data (50 entries)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page (Mohan)
│   │   │
│   │   ├── chat/
│   │   │   └── page.tsx            # Sam Chat interface (Sanki)
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Dashboard shell with sidebar
│   │   │   ├── page.tsx            # Dashboard overview
│   │   │   ├── documents/
│   │   │   │   └── page.tsx        # Document management
│   │   │   ├── test/
│   │   │   │   └── page.tsx        # Test AI responses
│   │   │   ├── recruit/
│   │   │   │   └── page.tsx        # Voter reg scanner
│   │   │   └── audit/
│   │   │       └── page.tsx        # Audit log
│   │   │
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts        # Chat endpoint (streaming)
│   │       ├── documents/
│   │       │   └── route.ts        # Document CRUD
│   │       ├── recruit/
│   │       │   └── route.ts        # Voter reg analysis
│   │       ├── audit/
│   │       │   └── route.ts        # Audit log queries
│   │       └── test/
│   │           └── route.ts        # Test AI responses
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # Main chat container
│   │   │   ├── MessageBubble.tsx   # Individual message
│   │   │   ├── SourceCitation.tsx  # Source doc reference
│   │   │   └── LanguageToggle.tsx  # EN/ES switch
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx         # Dashboard navigation
│   │   │   ├── DocumentList.tsx    # Uploaded docs list
│   │   │   ├── DocumentUpload.tsx  # Upload interface
│   │   │   ├── TestChat.tsx        # Test AI interface
│   │   │   ├── RecruitTable.tsx    # Voter reg table with filters
│   │   │   ├── AuditLog.tsx        # Audit log table
│   │   │   └── StatsCard.tsx       # Analytics cards
│   │   └── landing/
│   │       ├── Hero.tsx            # Hero section
│   │       ├── Problem.tsx         # Problem statement
│   │       ├── HowItWorks.tsx      # 3-step explainer
│   │       └── Guardrails.tsx      # Trust & safety section
│   │
│   ├── lib/
│   │   ├── groq.ts                 # Groq client setup
│   │   ├── system-prompt.ts        # Sam's system prompt + training data
│   │   ├── response-cache.ts       # Response caching logic
│   │   ├── voter-scanner.ts        # Voter reg analysis logic
│   │   ├── audit-logger.ts         # Audit logging utility
│   │   └── constants.ts            # Colors, config, etc.
│   │
│   └── types/
│       └── index.ts                # TypeScript interfaces
│
├── .env.local                      # Environment variables
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Features

### 1. Sam Chat (Poll Worker Interface) — `Sanki`

#### Chat UI
- Clean chat interface with Sam eagle avatar on AI messages
- User messages on right, Sam responses on left
- Typing indicator while AI is generating
- Scrollable message history

#### AI Responses
- Streaming responses via Groq API
- System prompt restricts answers to uploaded training docs only
- Every response includes source citation (document name + section)
- If question is outside scope: "I can only help with election procedures and poll worker training. Please contact your election supervisor for other questions."

#### Language Toggle
- Toggle button: 🇺🇸 EN / 🇪🇸 ES
- When set to ES, system prompt instructs AI to respond in Spanish
- UI labels also switch

#### Response Caching
- Cache key = normalized lowercase question
- If cached response exists, return instantly (no API call)
- Show "✓ Verified Response" badge on cached answers

#### Mobile Responsive
- Chat works in mobile viewport (demo via inspect element)
- Full-screen chat on mobile, no sidebar

### 2. Civiq Dashboard (Election Official Interface) — `Kinjal`

#### Document Management (`/dashboard/documents`)
- List of uploaded training documents with metadata
- Upload button (simulated for demo — preloaded sample docs)
- Toggle documents active/inactive
- Show document stats: word count, sections, last updated
- Sample docs preloaded:
  - "Poll Worker Training Manual 2026"
  - "Election Day Procedures Guide"
  - "Voter ID Requirements by State"

#### Test AI (`/dashboard/test`)
- Split-screen: question input on left, AI response on right
- Officials type a question and see what Sam would answer
- Approve ✅ / Flag ⚠️ / Edit ✏️ buttons on each response
- Approved responses get cached for consistency
- Shows source document reference

#### Poll Worker Recruitment (`/dashboard/recruit`)
- Table view of voter registration data
- Columns: Name, Age, Location/Precinct, Languages, Registered Since, Availability, Status
- Filter controls:
  - Age range slider
  - Location/precinct dropdown
  - Language filter (English, Spanish, Bilingual)
  - Distance from polling location
- AI-suggested candidates highlighted (based on criteria match)
- Select candidates → Export shortlist as CSV
- Stats bar: "247 eligible candidates found from 10,000 records"

#### Audit Log (`/dashboard/audit`)
- Table: Timestamp, User Type (poll worker/official), Question, Response, Source Doc, Language
- Filter by date range, user type, flagged responses
- Export audit log as CSV
- Summary stats: total queries today, most asked topics, avg response time

#### Dashboard Overview (`/dashboard`)
- Stats cards: Active Documents, Poll Workers Recruited, Questions Answered Today, Response Accuracy
- Recent activity feed
- Quick actions: Upload Document, Test AI, View Audit Log

### 3. Landing Page — `Mohan`

#### Hero Section
- Sam mascot (large) + "Civiq" wordmark
- Tagline: "AI-Powered Election Workforce Assistant"
- Subtitle: "Recruit smarter. Train better. Support always."
- Two CTA buttons: "Election Official Dashboard" → `/dashboard`, "Poll Worker Chat" → `/chat`

#### Problem Section
- Key stats with icons:
  - "48% of jurisdictions can't recruit enough poll workers"
  - "Over half of election offices are run by 1 person"
  - "36% turnover rate since 2020"

#### How It Works
- 3-step visual flow:
  1. "Officials upload training docs & set criteria" (icon: upload/document)
  2. "AI scans voter data & identifies candidates" (icon: search/scan)
  3. "Poll workers get instant, vetted answers from Sam" (icon: chat/message)

#### Guardrails Section
- Four cards:
  - 🔒 **Local & Private** — Data never leaves the building
  - ✅ **Human in the Loop** — Officials control what AI knows
  - 🌐 **Bilingual** — English & Spanish from day one
  - 📋 **Audit Trail** — Every interaction logged & reviewable

#### Tech Stack Section (optional)
- Clean icons showing: Next.js, Groq/Llama, Local-first architecture

---

## Setup & Installation

```bash
# Clone the repo
git clone <repo-url>
cd civiq

# Install dependencies
npm install

# Install shadcn/ui components
npx shadcn@latest init
npx shadcn@latest add button card input label table badge tabs dialog dropdown-menu select separator sheet avatar scroll-area

# Add environment variables
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

# Run development server
npm run dev

# Open in browser
# Landing page: http://localhost:3000
# Chat: http://localhost:3000/chat
# Dashboard: http://localhost:3000/dashboard
```

---

## Environment Variables

```env
# .env.local
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Optional
NEXT_PUBLIC_APP_NAME=Civiq
NEXT_PUBLIC_MASCOT_NAME=Sam
```

Get a free Groq API key at: https://console.groq.com/

---

## Task Breakdown

### Sanki & Kinjal — AI Chat + Dashboard
**Priority: HIGH — This is the live demo centerpiece**

**Sanki (AI Chat Focus):**
- [x] Set up Next.js project with App Router
- [x] Configure Tailwind + shadcn/ui
- [ ] Create `/chat` page with ChatWindow component
- [ ] Build MessageBubble component (user vs Sam styling)
- [ ] Integrate Sam avatar (pixel eagle) on AI messages
- [ ] Set up Groq API route (`/api/chat`) with streaming
- [x] Write system prompt with embedded training manual content
- [ ] Add source citation to every AI response
- [ ] Build language toggle (EN/ES)
- [ ] Implement response caching (in-memory Map)
- [ ] Add "✓ Verified Response" badge for cached answers
- [ ] Make chat responsive for mobile viewport demo

**Kinjal (Dashboard Focus):**
- [ ] Build dashboard layout with sidebar navigation
- [ ] Create dashboard overview page with stat cards
- [ ] Build Document Management page (list + upload UI)
- [ ] Build Test AI page (split-screen question/response)
- [ ] Add approve/flag/edit buttons on test responses
- [ ] Build Recruitment page with data table
- [ ] Add filter controls (age, location, language)
- [ ] Add candidate selection + export functionality
- [ ] Build Audit Log page with table + filters
- [ ] Style everything in navy/gold Civiq brand

**Shared API Routes:**
- [ ] Create `/api/test` route (shared with dashboard test feature)
- [ ] Create `/api/recruit` route with CSV parsing + filtering logic
- [ ] Create sample voter registration CSV (50 entries)
- [ ] Create sample training manual JSON

### Mohan — Landing Page
**Priority: MEDIUM — Sets the stage**

- [ ] Revamp landing page with better UI/UX design
- [ ] Improve visual hierarchy and information architecture
- [ ] Add better assets and imagery
- [ ] Ensure all information is accurate and compelling
- [ ] Enhance responsive design and mobile experience
- [ ] Refine animations and micro-interactions
- [ ] Optimize copy and messaging for clarity
- [ ] Add proper branding consistency throughout

---

## API Routes

### `POST /api/chat`
Chat with Sam. Returns streaming AI response.

```typescript
// Request
{
  message: string;
  language: "en" | "es";
  conversationHistory?: { role: string; content: string }[];
}

// Response: ReadableStream (text/event-stream)
// Each chunk contains:
{
  content: string;        // AI response text
  source?: string;        // Source document reference
  cached?: boolean;       // Whether this was a cached response
}
```

### `GET /api/documents`
List all uploaded documents.

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

### `POST /api/recruit`
Scan voter registration data with filters.

```typescript
// Request
{
  filters: {
    ageRange?: [number, number];
    location?: string;
    languages?: string[];
    maxDistance?: number;
  };
}

// Response
{
  candidates: {
    id: string;
    name: string;
    age: number;
    location: string;
    precinct: string;
    languages: string[];
    registeredSince: string;
    aiScore: number;        // 0-100 match score
    aiReason: string;       // Why AI flagged this candidate
  }[];
  totalScanned: number;
  totalMatched: number;
}
```

### `GET /api/audit`
Query audit log entries.

```typescript
// Query params: ?startDate=&endDate=&userType=&flagged=

// Response
{
  entries: {
    id: string;
    timestamp: string;
    userType: "poll_worker" | "official";
    question: string;
    response: string;
    sourceDoc: string;
    language: "en" | "es";
    flagged: boolean;
    cached: boolean;
  }[];
  stats: {
    totalToday: number;
    topTopics: string[];
    avgResponseTime: number;
  };
}
```

### `POST /api/test`
Test a question against the AI (for officials).

```typescript
// Request
{
  question: string;
  language: "en" | "es";
}

// Response
{
  response: string;
  source: string;
  confidence: number;
  cached: boolean;
}
```

---

## Data Models

### Training Manual (sample JSON)

```json
{
  "id": "manual-2026",
  "title": "Poll Worker Training Manual 2026",
  "sections": [
    {
      "id": "s1",
      "title": "Opening the Polls",
      "content": "Poll workers must arrive at the polling location by 5:30 AM. Begin setup procedures including: powering on all voting machines, verifying ballot supplies, posting required signage, and testing the accessible voting unit (AVU). The polling location must be ready for voters by 6:00 AM."
    },
    {
      "id": "s2",
      "title": "Voter Check-In Procedures",
      "content": "When a voter arrives: 1) Greet the voter. 2) Ask for their name and address. 3) Look up the voter in the electronic poll book. 4) Verify identification per state requirements. 5) Have the voter sign the poll book. 6) Issue the correct ballot style for their precinct. If a voter's name is not found, offer a provisional ballot and explain the process."
    },
    {
      "id": "s3",
      "title": "Voter ID Requirements",
      "content": "Acceptable forms of ID include: valid Arizona driver's license, Arizona nonoperating identification license, tribal enrollment card, or any two of the following: utility bill, bank statement, government-issued check, paycheck, or any other government document showing name and address."
    },
    {
      "id": "s4",
      "title": "Provisional Ballots",
      "content": "A provisional ballot must be offered when: the voter's name does not appear in the poll book, the voter does not have acceptable ID, or there is a question about the voter's eligibility. The voter completes a provisional ballot affidavit. Seal the provisional ballot in the green envelope. Record the provisional ballot number in the log."
    },
    {
      "id": "s5",
      "title": "Accessible Voting",
      "content": "Every polling location must have at least one accessible voting unit (AVU). Poll workers should be prepared to assist voters with disabilities. Offer the AVU to any voter who requests it. The AVU includes audio ballot capability, sip-and-puff device support, and large print display options. Never assume a voter does or does not need assistance."
    },
    {
      "id": "s6",
      "title": "Closing the Polls",
      "content": "At 7:00 PM, announce that the polls are closing. Any voter in line at 7:00 PM must be allowed to vote. After the last voter has voted: 1) Shut down all voting machines per the posted procedure. 2) Reconcile the number of voters checked in with ballots cast. 3) Seal all ballots in the designated containers. 4) Complete all required paperwork. 5) Transport materials to the central counting facility."
    },
    {
      "id": "s7",
      "title": "Emergency Procedures",
      "content": "In case of power outage: use emergency ballots (paper ballots in the emergency supply kit). In case of equipment malfunction: call the Election Day hotline immediately at (555) 123-4567. In case of a security threat: call 911 first, then the Election Day hotline. Document all incidents on the Incident Report Form."
    },
    {
      "id": "s8",
      "title": "Electioneering Rules",
      "content": "No campaign materials, signs, or apparel are permitted within 75 feet of the polling location entrance. If a voter is wearing campaign apparel, they must still be allowed to vote — do not turn them away. If someone is electioneering within the restricted zone, politely ask them to move beyond the 75-foot boundary. If they refuse, contact the Election Day hotline."
    }
  ]
}
```

### Voter Registration (sample CSV columns)

```csv
id,first_name,last_name,age,address,city,precinct,zip,languages,registered_since,party,email,phone,previous_poll_worker,availability
VR001,Maria,Garcia,34,123 Oak St,Phoenix,PCT-12,85001,"English,Spanish",2018-03-15,Independent,maria.g@email.com,555-0101,false,available
VR002,James,Wilson,67,456 Elm Ave,Tempe,PCT-08,85281,"English",2004-11-02,Republican,j.wilson@email.com,555-0102,true,available
...
```

---

## Design System

### Colors

```typescript
const colors = {
  // Primary — Navy (trust, authority)
  navy: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98',
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#102a43',
  },
  // Accent — Gold/Amber (warmth, approachability)
  gold: {
    50: '#fffbea',
    100: '#fff3c4',
    200: '#fce588',
    300: '#fadb5f',
    400: '#f7c948',
    500: '#f0b429',
    600: '#de911d',
    700: '#cb6e17',
    800: '#b44d12',
    900: '#8d2b0b',
  },
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};
```

### Typography
- **Headings:** Inter (bold)
- **Body:** Inter (regular)
- **Monospace/Data:** JetBrains Mono (for audit logs, data tables)

### Component Patterns
- **Cards:** Rounded-lg, subtle shadow, navy-50 background
- **Buttons (primary):** Navy-800 bg, white text, gold hover accent
- **Buttons (secondary):** White bg, navy-800 border
- **Sam's chat bubbles:** Navy-50 bg, navy-800 text, Sam avatar on left
- **User's chat bubbles:** Gold-100 bg, navy-900 text, aligned right
- **Source citations:** Small badge below AI response, info-blue with document icon

---

## Demo Flow (Saturday Presentation — 1 minute)

### Slide 1: Open Landing Page (10 sec)
"This is Civiq — an AI-powered election workforce assistant. It has two sides."

### Slide 2: Dashboard — Documents (10 sec)
"Election officials upload their official training manuals. This is everything the AI knows — nothing else."

### Slide 3: Dashboard — Test AI (10 sec)
"Before deploying, officials can test what the AI would say. They approve, flag, or edit responses."

### Slide 4: Dashboard — Recruitment (10 sec)
"The AI scans voter registration data and flags eligible poll worker candidates. Officials filter by location, language, age — and export a shortlist."

### Slide 5: Sam Chat — Live Demo (15 sec)
"This is what a poll worker sees. They ask Sam a question..."
*Type: "What do I do if a voter's name isn't in the poll book?"*
"...and get an instant answer, with the source document cited. Same question, same answer, every time."

### Slide 6: Language Toggle (5 sec)
*Toggle to Spanish*
"Works in Spanish too."

### Slide 7: Mobile View (5 sec)
*Open inspect element, show mobile viewport*
"This is what it looks like on a tablet at a polling station."

### Closing (5 sec)
"Civiq — recruit smarter, train better, support always. Built local, built safe, built for the one-person election office."

---

## Guardrails & Safety

### Political Neutrality
- AI never recommends candidates or expresses political opinions
- System prompt explicitly prohibits partisan content
- All responses sourced from neutral, procedural documents only

### Data Privacy
- Production: fully local, on-device — no cloud, no internet
- Demo: Groq API used as stand-in (acknowledged in pitch)
- Voter registration data never leaves the system
- No personal data stored beyond what officials upload

### Consistency & Accuracy
- Response caching ensures identical answers to identical questions
- RAG-only approach — AI retrieves from docs, doesn't hallucinate
- Source citation on every response for verifiability
- Officials test and approve responses before deployment

### Human in the Loop
- Officials control the entire knowledge base
- Officials can review, flag, and edit any AI response
- Full audit trail of all interactions
- AI explicitly defers to human officials for edge cases

### Bias Prevention
- No open internet training data — only official procedural docs
- Bilingual by default — equal quality in English and Spanish
- Deterministic responses via caching eliminate generation variance
- Audit log enables bias detection and correction

### Prompt Injection Protection
- Closed document set — no external data retrieval
- System prompt hardened against override attempts
- Input sanitization on all user queries
- Cached responses bypass generation entirely for known questions

---

## Sample System Prompt

```
You are Sam, the Civiq AI assistant for poll workers. You are a friendly, helpful eagle mascot.

CRITICAL RULES:
1. You ONLY answer questions using the official training documents provided below.
2. You NEVER express political opinions or recommend candidates.
3. You NEVER answer questions outside of election procedures and poll worker training.
4. You ALWAYS cite the source document and section for every answer.
5. If a question is outside your scope, say: "I can only help with election procedures and poll worker training. Please contact your election supervisor for other questions."
6. Keep answers clear, concise, and friendly.
7. If asked in Spanish, respond entirely in Spanish.

TRAINING DOCUMENTS:
[Injected training manual content here]

RESPONSE FORMAT:
- Answer the question clearly
- End with: "📄 Source: [Document Name], [Section Title]"
```

---

## License

Built for the ASU AI + Elections Hackathon 2026. For educational and civic purposes.