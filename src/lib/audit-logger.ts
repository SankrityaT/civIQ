import { AuditEntry, Language, UserType } from "@/types";

// In-memory audit log — production: persist to SQLite or a local DB
const entries: AuditEntry[] = [];

export function logInteraction(params: {
  userType: UserType;
  question: string;
  response: string;
  sourceDoc: string;
  language: Language;
  flagged?: boolean;
  cached?: boolean;
}): AuditEntry {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userType: params.userType,
    question: params.question,
    response: params.response,
    sourceDoc: params.sourceDoc,
    language: params.language,
    flagged: params.flagged ?? false,
    cached: params.cached ?? false,
  };
  entries.push(entry);
  return entry;
}

export function getAuditEntries(filters?: {
  startDate?: string;
  endDate?: string;
  userType?: UserType;
  flagged?: boolean;
}): AuditEntry[] {
  // TODO: apply filters
  return [...entries].reverse();
}

export function getAuditStats() {
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (e) => new Date(e.timestamp).toDateString() === today
  );
  return {
    totalToday: todayEntries.length,
    topTopics: [] as string[], // TODO: extract from questions
    avgResponseTime: 0,        // TODO: track response times
  };
}
