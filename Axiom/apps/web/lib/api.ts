// Server-side code may call the API directly; the browser goes through the /api rewrite in next.config.ts.
export const API = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export function apiBase() { return typeof window === "undefined" ? API : "/api"; }

export type Span = { start: number; end: number; severity: string; reason: string };
export type Detector = { detector: string; risk: number; severity: string; reason: string; evidence: Record<string, unknown>[]; spans: Span[] };
export type Reliability = { overall: number; status: string; dimensions: Record<string, number> };
export type Trace = {
  id: string; provider: string; model: string; status: string; created_at: string; prompt?: string; prompt_preview?: string; response?: string; latency_ms?: number | null;
  sources?: { id: string; title?: string; content: string; metadata?: { document_id?: string; page?: number | null; relevance?: number; matched_terms?: string[] } }[];
  metadata?: { retrieval?: { mode: string; document_count: number; passage_count: number; hits: unknown[] }; semantic_check?: { status: "done" | "unavailable"; message?: string } } & Record<string, unknown>; detectors?: Detector[]; policy?: { action: string; reason: string } | null;
  claims?: { id: string; text: string; classification: string; relations: { source_id: string; relation: string; score: number; reason: string }[] }[];
  reviews?: { id: string; decision: string; reason: string; created_at?: string }[];
  repairs?: { id: string; status: string; strategy: string; attempts: { attempt: number; response?: string; reliability_after: number }[] }[];
  reliability: Reliability | null;
};

const TOKEN_KEY = "axiom_token";
export function token() { try { return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null; } catch { return null; } }
export function setToken(value: string) { localStorage.setItem(TOKEN_KEY, value); }
export function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch {} }

export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = token();
  let response: Response;
  const started = Date.now();
  try {
    // File uploads send FormData and let the browser set the multipart boundary.
    const json = !(typeof FormData !== "undefined" && options.body instanceof FormData);
    response = await fetch(apiBase() + path, { ...options, headers: { ...(json ? { "content-type": "application/json" } : {}), ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(options.headers as Record<string, string> | undefined) } });
  } catch {
    throw new ApiError("Axiom sunucusuna ulaşılamıyor. `npm run dev` ile başlatıp tekrar deneyin.", 0, "NETWORK");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    // The Next.js proxy answers 500 with an HTML/empty body when the API process is down.
    if (!body?.error && response.status >= 500) {
      if (Date.now() - started > 25_000) throw new ApiError("İşlem çok uzun sürdü; yapay zeka servisi şu an yavaş olabilir. Biraz sonra tekrar deneyin, Demo modelini seçin ya da anlam kontrolünü kapatın.", response.status, "TIMEOUT");
      throw new ApiError("Axiom sunucusuna ulaşılamadı. `npm run dev` komutunun çalıştığından emin olun.", response.status, "UPSTREAM");
    }
    if (response.status === 401 && typeof window !== "undefined" && auth) {
      clearToken();
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    throw new ApiError(body?.error?.message || `İstek başarısız oldu (${response.status})`, response.status, body?.error?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return api<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
}

export function scoreTone(score: number | undefined | null) { return score == null ? "muted" : score < 50 ? "risk" : score < 70 ? "warn" : "ok"; }
export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce"; if (s < 3600) return `${Math.floor(s / 60)} dk önce`; if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export type DocumentInfo = { id: string; title: string; filename: string | null; content_type: string; char_count: number; page_count: number | null; chunk_count: number; created_at: string };
export type Passage = { chunk_id: string; document_id: string; title: string; position: number; page: number | null; text: string; relevance: number; matched_terms: string[] };
