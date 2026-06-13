import type {
  AnalyticsSummary,
  AppealStatus,
  ClaimDetail,
  ClaimSummary,
  NeedsActionItem,
  Practice,
  UploadResult,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  practices: () => getJSON<Practice[]>("/practices"),
  summary: (practiceId: string) =>
    getJSON<AnalyticsSummary>(`/analytics/summary?practice_id=${practiceId}`),
  claims: (practiceId: string, status?: string) =>
    getJSON<ClaimSummary[]>(
      `/claims?practice_id=${practiceId}${status ? `&status=${status}` : ""}`,
    ),
  claim: (id: string) => getJSON<ClaimDetail>(`/claims/${id}`),
  needsAction: (practiceId: string) =>
    getJSON<NeedsActionItem[]>(
      `/denials/needs-action?practice_id=${practiceId}`,
    ),
};

export async function defaultPractice(): Promise<Practice | null> {
  try {
    const practices = await api.practices();
    return practices[0] ?? null;
  } catch {
    return null;
  }
}

export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

// --- client-side mutations ---

export async function uploadClaim(
  practiceId: string,
  file: File,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("practice_id", practiceId);
  form.append("file", file);
  const res = await fetch(`${API_BASE}/claims/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  return res.json() as Promise<UploadResult>;
}

export async function updateAppeal(
  appealId: string,
  payload: {
    letter_text?: string;
    status?: AppealStatus;
    recovered_amount?: string;
  },
): Promise<void> {
  const res = await fetch(`${API_BASE}/appeals/${appealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`update appeal failed: ${res.status}`);
}
