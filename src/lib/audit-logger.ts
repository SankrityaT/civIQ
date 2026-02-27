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
  language?: Language;
}): AuditEntry[] {
  let result = [...entries];

  if (filters?.startDate) {
    const start = new Date(filters.startDate).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= start);
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() <= end);
  }
  if (filters?.userType) {
    result = result.filter((e) => e.userType === filters.userType);
  }
  if (filters?.flagged !== undefined) {
    result = result.filter((e) => e.flagged === filters.flagged);
  }
  if (filters?.language) {
    result = result.filter((e) => e.language === filters.language);
  }

  return result.reverse();
}

export function getAuditStats() {
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (e) => new Date(e.timestamp).toDateString() === today
  );

  // Extract top topics by counting keyword occurrences in questions
  const topicKeywords: Record<string, number> = {};
  const keywords = ["voter id", "provisional", "check-in", "closing", "opening", "emergency", "electioneering", "accessible", "ballot"];
  for (const entry of todayEntries) {
    const q = entry.question.toLowerCase();
    for (const kw of keywords) {
      if (q.includes(kw)) {
        topicKeywords[kw] = (topicKeywords[kw] ?? 0) + 1;
      }
    }
  }
  const topTopics = Object.entries(topicKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    totalToday: todayEntries.length,
    totalAll: entries.length,
    cachedCount: entries.filter((e) => e.cached).length,
    flaggedCount: entries.filter((e) => e.flagged).length,
    spanishCount: entries.filter((e) => e.language === "es").length,
    topTopics,
    avgResponseTime: 0.8, // Simulated for demo
  };
}

export function getTotalEntryCount(): number {
  return entries.length;
}
