---
description: Recruit Tab Architecture - Voter Scoring with Ollama AI
---

# Recruit Tab Architecture

Created by Kinjal

## Overview

The Recruit Tab allows election officials to upload voter registration CSV files, score candidates for poll worker recruitment using a two-pass AI system (deterministic + Ollama), and export shortlists. All scoring runs on the Python RAG sidecar; the Next.js frontend is a thin proxy.

---

## System Architecture

```
Browser (React)                    Next.js API Routes              RAG Sidecar (Python)         Ollama
/dashboard/recruit                 /api/recruit/*                  Port 8000                    Port 11434
                                                                                               llama3.2:3b
recruit/page.tsx -----> POST /api/recruit/upload -----> POST /upload-voters
  (CSV upload)            (proxy multipart)               (parse, validate, store, score)
                                                                  |
                                                                  v
                                                          deterministic_score() ---> all 10K rows
                                                                  |
                                                                  v
                                                          ai_enrich_batch() -------> top 100 via Ollama
                                                                  |
                                                                  v
                                                          cache to disk (.cache/voter-scores.json)

RecruitTable.tsx ----> POST /api/recruit ----------> POST /score-voters
  (filters, page)        (proxy JSON)                 (filter, sort, paginate)

page.tsx ------------> GET /api/recruit -----------> GET /voter-stats
  (summary stats)        (proxy)                      (return cached stats)
```

---

## Scoring Strategy

### Pass 1: Deterministic Pre-Score (all rows, instant)

| Factor                     | Points | Condition                          |
|----------------------------|--------|------------------------------------|
| Base score                 | 40     | All candidates                     |
| Previous poll worker       | +25    | previous_poll_worker == True       |
| Bilingual                  | +15    | More than one language             |
| Registered 10+ years       | +10    | registered_since year delta >= 10  |
| Registered 5-9 years       | +7     | registered_since year delta >= 5   |
| Available                  | +5     | availability == available          |
| Prime age (25-65)          | +5     | Age between 25 and 65              |
| Young voter (18-24)        | +3     | Age between 18 and 24              |
| Max possible               | 100    |                                    |

### Pass 2: Ollama AI Enrichment (top 100 candidates)

- Candidates are batched in groups of 10
- Each batch is sent to Ollama with a structured prompt
- Ollama returns: refined score (0-100) + 1-sentence reason per candidate
- Final score = 40% deterministic + 60% AI (blended)
- If Ollama is unavailable, deterministic scores are used as-is

---

## Data Flow

### Upload Flow
1. User selects CSV file in browser
2. useVoterUpload -> POST /api/recruit/upload -> sidecar /upload-voters
3. Sidecar: parse CSV -> validate columns -> store raw CSV to disk -> start background scoring
4. Response: { status: upload_complete, totalRecords: N, scoring: true }
5. Frontend polls every 3s until scoring: false

### Query Flow
1. User adjusts filters (city, precinct, language, age, score, experience)
2. useRecruitCandidates(filters) -> POST /api/recruit -> sidecar /score-voters
3. Sidecar: apply filters -> sort -> paginate -> return page
4. Response: { candidates: [...], totalFiltered, totalScored, page, totalPages }

### Export Flow
1. User selects rows (checkbox) -> clicks Export N
2. Client-side exportToCSV() generates and downloads CSV
3. Export All exports current pages candidates (all columns)

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| rag-sidecar/main.py | Modified | Added voter scoring system: upload, parse, score, AI enrich, cache, filter, paginate |
| src/app/api/recruit/route.ts | Rewritten | Proxy to sidecar /score-voters (POST) and /voter-stats (GET) |
| src/app/api/recruit/upload/route.ts | Created | Proxy CSV multipart upload to sidecar /upload-voters |
| src/types/index.ts | Modified | Expanded Candidate (15+ fields), new RecruitFilters, VoterStats, UploadResponse |
| src/lib/hooks.ts | Modified | Rewrote useRecruitCandidates, added useVoterUpload, useVoterStats |
| src/app/dashboard/recruit/page.tsx | Rewritten | Three states: empty/upload, scoring, data view. Stats bar, re-upload, export |
| src/components/dashboard/RecruitTable.tsx | Rewritten | Props-based, server-side pagination, 8 filters, 9 columns, select+export |
| src/app/dashboard/page.tsx | Modified | Updated recruit count fetch to use new GET endpoint |
| src/lib/voter-scanner.ts | Deprecated | Scoring moved to sidecar; file kept as reference |

---

## CSV Format

### Required Columns
```
id, first_name, last_name, age, city, precinct, languages, registered_since, previous_poll_worker, availability
```

### Optional Columns
```
address, zip, party, email, phone
```

---

## API Reference

### POST /api/recruit/upload
Upload a voter CSV file.

Request: multipart/form-data with field "file" (CSV)

Response:
```json
{
  "status": "upload_complete",
  "totalRecords": 10000,
  "message": "Uploaded 10000 records. Scoring started in background.",
  "scoring": true
}
```

### POST /api/recruit
Fetch scored, filtered, paginated candidates.

Request Body:
```json
{
  "city": "Phoenix",
  "minAge": 25,
  "maxAge": 65,
  "minScore": 70,
  "experiencedOnly": true,
  "bilingualOnly": false,
  "page": 1,
  "pageSize": 50,
  "sortBy": "aiScore",
  "sortDir": "desc"
}
```

Response:
```json
{
  "candidates": [],
  "totalScored": 10000,
  "totalFiltered": 342,
  "page": 1,
  "pageSize": 50,
  "totalPages": 7,
  "scoring": false
}
```

### GET /api/recruit
Get voter dataset summary statistics.

Response:
```json
{
  "loaded": true,
  "scoring": false,
  "totalRecords": 10000,
  "totalScored": 10000,
  "aiEnrichedCount": 100,
  "bilingualCount": 2847,
  "experiencedCount": 1523,
  "avgScore": 62.4,
  "cities": ["Chandler", "Gilbert", "Mesa", "Phoenix", "Scottsdale", "Tempe"],
  "languages": ["Arabic", "Chinese", "English", "Spanish", "Vietnamese"]
}
```

---

## Frontend UX States

1. **No Data** - Big upload CTA with file format hint and how-it-works cards
2. **Uploading** - Button shows spinner, file input disabled
3. **Scoring** - Full-screen progress with two-pass explanation, auto-polls every 3s
4. **Data Ready** - Stats summary bar + filterable paginated table
5. **Re-upload** - Header button to replace dataset, triggers full re-score

---

## Caching

- Raw CSV stored at: .cache/voters.csv
- Scored results stored at: .cache/voter-scores.json
- On sidecar restart, cache is auto-loaded (no re-upload needed)
- /rescore-voters endpoint forces a full re-score of the cached CSV

---

## Running

1. Start Ollama: ollama serve (port 11434)
2. Start RAG sidecar: cd rag-sidecar && source .venv/bin/activate && python main.py (port 8000)
3. Start Next.js: npm run dev (port 3000)
4. Navigate to /dashboard/recruit and upload your CSV
