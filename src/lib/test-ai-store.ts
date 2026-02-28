// Created by Kinjal
// Global in-memory store for Test AI state — persists across navigation within the same session.
// The AI call runs here (not in the component), so navigating away won't cancel it.

type Listener = () => void;

export interface TestAIState {
  question: string;
  response: string | null;
  source: string | null;
  loading: boolean;
  wasCached: boolean;
  status: "idle" | "approved" | "flagged";
  editing: boolean;
  editedResponse: string;
  responseTime: number | null;
  language: "en" | "es";
  userType: "poll_worker" | "official";
  error: string | null;
}

export interface TestAIMetrics {
  queryCount: number;
  queryCountToday: number;
  cachedHits: number;
  spanishQueries: number;
  flaggedCount: number;
}

const defaultState: TestAIState = {
  question: "",
  response: null,
  source: null,
  loading: false,
  wasCached: false,
  status: "idle",
  editing: false,
  editedResponse: "",
  responseTime: null,
  language: "en",
  userType: "poll_worker",
  error: null,
};

const defaultMetrics: TestAIMetrics = {
  queryCount: 0,
  queryCountToday: 0,
  cachedHits: 0,
  spanishQueries: 0,
  flaggedCount: 0,
};

// ─── Singleton store ─────────────────────────────────────────────────────────

let _state: TestAIState = { ...defaultState };
let _metrics: TestAIMetrics = { ...defaultMetrics };
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getState(): TestAIState {
  return _state;
}

export function getMetrics(): TestAIMetrics {
  return _metrics;
}

export function setState(partial: Partial<TestAIState>) {
  _state = { ..._state, ...partial };
  notify();
}

// ─── Actions (run outside React — survive navigation) ────────────────────────

export async function askSam() {
  const { question, language, userType, loading } = _state;
  if (!question.trim() || loading) return;

  setState({
    loading: true,
    response: null,
    source: null,
    status: "idle",
    editing: false,
    wasCached: false,
    responseTime: null,
    error: null,
  });

  const t0 = performance.now();
  try {
    const res = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language, userType, action: "ask" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setState({ error: data.error ?? "Request failed", loading: false });
      return;
    }
    const isCached = data.cached ?? false;
    setState({
      response: data.response ?? "No response.",
      source: data.source ?? null,
      wasCached: isCached,
      responseTime: Math.round(performance.now() - t0),
      loading: false,
    });
    // Update metrics
    _metrics.queryCount += 1;
    _metrics.queryCountToday += 1;
    if (isCached) _metrics.cachedHits += 1;
    if (language === "es") _metrics.spanishQueries += 1;
    notify();
  } catch {
    setState({
      error: "Error contacting Sam. Make sure the Next.js server is running and GROQ_API_KEY is set.",
      loading: false,
    });
  }
}

export async function approveSam() {
  const { question, language, userType, editing, editedResponse, response, source } = _state;
  const finalResponse = editing ? editedResponse : response;
  if (!finalResponse || !question.trim()) return;

  try {
    await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        language,
        userType,
        action: "approve",
        response: finalResponse,
        source,
      }),
    });
    setState({
      response: finalResponse,
      editing: false,
      status: "approved",
    });
    _metrics.cachedHits += 1;
    notify();
  } catch {
    // Silently fail
  }
}

export async function flagSam() {
  const { question, language, userType, response, source } = _state;
  if (!response || !question.trim()) return;

  try {
    await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        language,
        userType,
        action: "flag",
        response,
        source,
      }),
    });
    setState({ status: "flagged" });
    _metrics.flaggedCount += 1;
    notify();
  } catch {
    // Silently fail
  }
}

export function resetTestAI() {
  setState({
    question: "",
    response: null,
    source: null,
    status: "idle",
    editing: false,
    wasCached: false,
    responseTime: null,
    error: null,
  });
}
