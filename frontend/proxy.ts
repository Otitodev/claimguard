import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate for the dashboard route group. Checks for the Better
 * Auth session cookie and redirects to /sign-in if missing. Full session
 * validation still happens server-side in the (app) layout — this just keeps
 * unauthenticated users out of the dashboard shell.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/claims/:path*",
    "/needs-action/:path*",
    "/upload/:path*",
  ],
};
