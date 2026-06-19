import type { AppealStatus, UploadResult } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SITE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

/**
 * Fetch the current session's Better Auth JWT (same-origin; the session cookie
 * is sent with credentials) to authorize cross-origin calls to the FastAPI
 * backend. Returns null when signed out.
 */
async function getClientToken(): Promise<string | null> {
  try {
    const res = await fetch(`${SITE_BASE}/api/auth/token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- client-side mutations ---

export async function uploadClaim(
  practiceId: string,
  file: File,
): Promise<UploadResult> {
  const token = await getClientToken();
  const form = new FormData();
  form.append("practice_id", practiceId);
  form.append("file", file);
  const res = await fetch(`${API_BASE}/claims/upload`, {
    method: "POST",
    headers: authHeaders(token),
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
  const token = await getClientToken();
  const res = await fetch(`${API_BASE}/appeals/${appealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`update appeal failed: ${res.status}`);
}

/** Public landing-page lead capture — no auth required. */
export async function submitLead(
  email: string,
  practiceName?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, practice_name: practiceName || null }),
  });
  if (!res.ok) throw new Error(`lead submit failed: ${res.status}`);
}

export async function downloadAppeal(
  appealId: string,
  format: "pdf" | "doc",
): Promise<void> {
  const token = await getClientToken();
  const res = await fetch(
    `${API_BASE}/appeals/${appealId}/export?format=${format}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appeal-${appealId}.${format === "doc" ? "docx" : "pdf"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
