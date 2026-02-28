// ─── Chat ────────────────────────────────────────────────────────────────────

export type Language = "en" | "es";

export interface SourceMeta {
  documentId: string;
  documentName: string;
  sectionTitle: string;
  sectionIndex: number;
  pageNumber: number;
  chunkContent: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;       // e.g. "Poll Worker Training Manual 2026, Section: Voter Check-In"
  cached?: boolean;
  timestamp: string;
  sourceMeta?: SourceMeta[];
}

export interface ChatRequest {
  message: string;
  language: Language;
  conversationHistory?: { role: string; content: string }[];
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentStatus = "active" | "inactive";

export interface TrainingSection {
  id: string;
  title: string;
  content: string;
}

export interface TrainingDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  wordCount: number;
  sections: number;
  uploadedAt: string;
  lastUpdated: string;
}

export interface TrainingManual {
  id: string;
  title: string;
  sections: TrainingSection[];
}

// ─── Recruitment ─────────────────────────────────────────────────────────────

export interface RecruitFilters {
  ageRange?: [number, number];
  location?: string;
  languages?: string[];
  maxDistance?: number;
}

export interface Candidate {
  id: string;
  name: string;
  age: number;
  location: string;
  precinct: string;
  languages: string[];
  registeredSince: string;
  aiScore: number;     // 0–100 match score
  aiReason: string;    // Why AI flagged this candidate
}

export interface RecruitResponse {
  candidates: Candidate[];
  totalScanned: number;
  totalMatched: number;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type UserType = "poll_worker" | "official";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userType: UserType;
  question: string;
  response: string;
  sourceDoc: string;
  language: Language;
  flagged: boolean;
  cached: boolean;
}

export interface AuditStats {
  totalToday: number;
  topTopics: string[];
  avgResponseTime: number;
}

export interface AuditResponse {
  entries: AuditEntry[];
  stats: AuditStats;
}

// ─── Test AI ─────────────────────────────────────────────────────────────────

export interface TestRequest {
  question: string;
  language: Language;
}

export interface TestResponse {
  response: string;
  source: string;
  confidence: number;
  cached: boolean;
}

// ─── Voter Registration CSV row ───────────────────────────────────────────────

export interface VoterRecord {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  address: string;
  city: string;
  precinct: string;
  zip: string;
  languages: string;
  registered_since: string;
  party: string;
  email: string;
  phone: string;
  previous_poll_worker: boolean;
  availability: string;
}
