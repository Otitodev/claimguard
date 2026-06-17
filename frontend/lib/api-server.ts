import "server-only";

import type {
  AnalyticsSummary,
  ClaimDetail,
  ClaimSummary,
  NeedsActionItem,
  Practice,
} from "./types";
import { getAuthToken } from "./auth-server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Read endpoints. The backend derives the practice from the Bearer token, so
 * the legacy `practiceId` arguments are kept for call-site compatibility but no
 * longer scope the request (the token is authoritative).
 */
export const api = {
  summary: (_practiceId?: string) =>
    getJSON<AnalyticsSummary>(`/analytics/summary`),
  claims: (_practiceId?: string, status?: string) =>
    getJSON<ClaimSummary[]>(`/claims${status ? `?status=${status}` : ""}`),
  claim: (id: string) => getJSON<ClaimDetail>(`/claims/${id}`),
  needsAction: (_practiceId?: string) =>
    getJSON<NeedsActionItem[]>(`/denials/needs-action`),
};

/** The authenticated user's practice (created on first call by the backend). */
export async function defaultPractice(): Promise<Practice | null> {
  try {
    return await getJSON<Practice>("/me/practice");
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
