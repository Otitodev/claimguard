import "server-only";
import { headers } from "next/headers";

import { auth } from "./auth";

/**
 * Mint/fetch the Better Auth ES256 JWT for the current request's session, to
 * forward as a Bearer token to the FastAPI backend (which verifies it against
 * /api/auth/jwks and derives the practice). Server components only.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const res = await auth.api.getToken({ headers: await headers() });
    return res?.token ?? null;
  } catch {
    return null;
  }
}
